import Property from '../models/Property.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

const formatPrice = (property) => {
  if (property.priceFormatted) return property.priceFormatted;
  if (!property.price) return 'precio disponible con asesoría';

  const price = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(property.price);

  return property.operation === 'renta' ? `${price} / mes` : price;
};

const getProperties = async () => {
  const { isMongoConnected } = getDBStatus();
  if (isMongoConnected) {
    return Property.find({ status: 'disponible' }).lean();
  }
  return localStore.getProperties().filter(property => property.status === 'disponible');
};

const propertySummary = (property) => {
  const publicLocation = [property.neighborhood, property.city].filter(Boolean).join(', ') || property.location;
  const details = [
    property.title,
    publicLocation,
    `${property.bedrooms || 0} recámaras`,
    `${property.areaM2 || 0} m²`,
    formatPrice(property)
  ].filter(Boolean);
  return details.join(' · ');
};

const detectFilters = (message) => {
  const normalized = message.toLowerCase();
  const wantsRent = /renta|rentar|alquil/.test(normalized);
  const wantsSale = /venta|comprar/.test(normalized);
  const numbers = normalized.match(/\b\d+(?:[.,]\d+)?\b/g)?.map(Number) || [];
  const budgetMatch = normalized.match(/(?:hasta|máximo|maximo|presupuesto(?: de)?|menos de)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(mil|m|millones?|mdp)?/i);
  const parsedBudget = budgetMatch ? Number(budgetMatch[1].replace(',', '.')) : numbers.find((number) => number >= 500000 || (wantsRent && number >= 3000));
  const budgetUnit = budgetMatch?.[2]?.toLowerCase();
  const budget = budgetMatch
    ? parsedBudget * (/mil|m/.test(budgetUnit || '') && !/millones/.test(budgetUnit || '') ? 1000 : /millones?|mdp/.test(budgetUnit || '') ? 1000000 : 1)
    : parsedBudget;
  const bedrooms = Number(normalized.match(/(\d+)\s*(?:recámaras?|habitaciones?|cuartos?)\b/i)?.[1] || 0) || null;
  const typeMatch = normalized.match(/\b(casas?|departamentos?|terrenos?|lofts?|locales?|comerciales?)\b/i)?.[1]?.toLowerCase();
  const type = typeMatch?.startsWith('casa') ? 'casa'
    : typeMatch?.startsWith('departamento') ? 'departamento'
      : typeMatch?.startsWith('terreno') ? 'terreno'
        : typeMatch?.startsWith('loft') ? 'loft'
          : typeMatch?.startsWith('local') || typeMatch?.startsWith('comercial') ? 'comercial'
            : null;

  return {
    operation: wantsRent ? 'renta' : wantsSale ? 'venta' : null,
    budget,
    bedrooms,
    type,
    text: normalized
  };
};

export const createCatalogAnswer = async (message) => {
  const properties = await getProperties();
  const filters = detectFilters(message);

  const candidates = properties
    .filter((property) => property.status === 'disponible')
    .filter((property) => !filters.operation || property.operation === filters.operation)
    .filter((property) => !filters.type || property.type === filters.type)
    .filter((property) => !filters.bedrooms || Number(property.bedrooms) >= filters.bedrooms)
    .filter((property) => {
      if (!filters.budget) return true;
      return property.operation === 'renta'
        ? property.price <= filters.budget
        : property.price <= filters.budget;
    })
    .filter((property) => {
      const searchable = [
        property.title,
        property.location,
        property.neighborhood,
        property.city,
        property.description,
        property.type
      ].join(' ').toLowerCase();
      return !filters.text.includes('centro') || searchable.includes('centro');
    })
    .slice(0, 3);

  if (!candidates.length) {
    return {
      answer: 'Ahora mismo no encontré una propiedad que coincida exactamente. Cuéntame la operación (venta o renta), zona aproximada y presupuesto, y te ayudo a ajustar la búsqueda.',
      properties: []
    };
  }

  const result = candidates.map(propertySummary).join('\n• ');
  return {
    answer: `Encontré estas opciones disponibles:\n• ${result}\n\n¿Quieres que te muestre opciones con más habitaciones, menor presupuesto o una zona específica?`,
    properties: candidates.map((property) => ({
      id: property._id || property.propertyId,
      slug: property.slug,
      title: property.title,
      operation: property.operation,
      price: formatPrice(property),
      location: [property.neighborhood, property.city].filter(Boolean).join(', ') || property.location
    }))
  };
};

export const createAiReply = async (message, history = []) => {
  const normalized = String(message || '').trim().toLowerCase();
  const catalogResult = await createCatalogAnswer(normalized || 'propiedades disponibles');

  if (!process.env.OPENAI_API_KEY) {
    if (/hola|buenos días|buenas tardes|buenas noches/.test(normalized)) {
      return {
        answer: 'Hola. Soy el asistente de Aisa. Puedo ayudarte a buscar casas, departamentos o terrenos según operación, zona y presupuesto.',
        properties: []
      };
    }
    return catalogResult;
  }

  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres el asistente virtual automatizado de Aisa Inmobiliaria en Monterrey. Responde en español mexicano con tono cálido y profesional; deja claro que eres un asistente automatizado. Usa únicamente datos reales del catálogo disponible. No inventes propiedades, precios, horarios, disponibilidad, direcciones ni condiciones. Si no puedes confirmar algo, dilo y ofrece atención humana por WhatsApp al +52 81 4703 0248 o por correo a aisainmobiliaria9@gmail.com. No pidas datos financieros o identificaciones. Presenta solo opciones pertinentes y ofrece agendar una visita con un asesor. Catálogo disponible:\n${catalogResult.answer}`
          },
          ...history.slice(-8),
          { role: 'user', content: message }
        ],
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 15000)
    });

    if (!response.ok) {
      throw new Error(`OpenAI respondió ${response.status}`);
    }

    const data = await response.json();
    return {
      answer: data.choices?.[0]?.message?.content?.trim() || catalogResult.answer,
      properties: catalogResult.properties
    };
  } catch (error) {
    console.error('[AI] Error de proveedor:', error.message);
    return catalogResult;
  }
};
