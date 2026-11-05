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
    return Property.find({ status: { $ne: 'vendida' } }).lean();
  }
  return localStore.getProperties();
};

const propertySummary = (property) => {
  const details = [
    property.title,
    property.location || property.neighborhood || property.city,
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
  const budget = numbers.find((number) => number >= 500000 || (wantsRent && number >= 3000));

  return {
    operation: wantsRent ? 'renta' : wantsSale ? 'venta' : null,
    budget,
    text: normalized
  };
};

export const createCatalogAnswer = async (message) => {
  const properties = await getProperties();
  const filters = detectFilters(message);

  const candidates = properties
    .filter((property) => property.status !== 'vendida')
    .filter((property) => !filters.operation || property.operation === filters.operation)
    .filter((property) => {
      if (!filters.budget) return true;
      return property.operation === 'renta'
        ? property.price <= filters.budget
        : property.price <= filters.budget * 1000000;
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
      location: property.location || property.neighborhood || property.city
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
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres el asesor virtual de Aisa Inmobiliaria en Monterrey. Responde en español, breve y con datos reales. Catálogo disponible:\n${catalogResult.answer}`
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
