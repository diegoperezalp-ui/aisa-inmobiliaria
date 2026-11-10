import Property from '../models/Property.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { initialProperties } from '../seed/seedData.js';

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
  try {
    const { isMongoConnected } = getDBStatus();
    if (isMongoConnected) {
      const dbProps = await Property.find({ status: 'disponible' }).lean();
      if (dbProps && dbProps.length) return dbProps;
    }
  } catch (e) {
    console.warn('[AI] Error consultando MongoDB, usando almacén local:', e.message);
  }

  try {
    const local = localStore.getProperties().filter(p => p.status === 'disponible');
    if (local && local.length) return local;
  } catch (e) {
    console.warn('[AI] Error consultando localStore, usando propiedades iniciales:', e.message);
  }

  return initialProperties;
};

const propertySummary = (property) => {
  const publicLocation = [property.neighborhood, property.city].filter(Boolean).join(', ') || property.location;
  const details = [
    property.title,
    publicLocation,
    `${property.bedrooms || 0} recámaras`,
    `${property.areaM2 || property.constructionAreaM2 || 0} m²`,
    formatPrice(property)
  ].filter(Boolean);
  return details.join(' · ');
};

const detectFilters = (message) => {
  const normalized = message.toLowerCase();
  const wantsRent = /renta|rentar|alquil/.test(normalized);
  const wantsSale = /venta|comprar|compra/.test(normalized);
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
      return property.price <= filters.budget;
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

/* ==========================================================================
   MOTOR DE RAZONAMIENTO Y GENERACIÓN DE SCRIPTS PARA EL ADMINISTRADOR
   ========================================================================== */
export const createAdminDraftReply = async (messageOrPayload) => {
  const raw = typeof messageOrPayload === 'string' ? messageOrPayload : (messageOrPayload?.message || '');
  const normalized = String(raw || '').trim().toLowerCase();
  const properties = await getProperties();

  // 1. Análisis de Intención
  let intent = 'compra';
  if (/renta|rentar|alquilar|amueblad|arrend/.test(normalized)) {
    intent = 'renta';
  } else if (/vender|vender mi casa|consignar|traspas|promover|comision|cuanto cobran por vender/.test(normalized)) {
    intent = 'vender';
  } else if (/avaluo|avalúo|peritaje|dictamen|cuanto cuesta el avaluo/.test(normalized)) {
    intent = 'avaluo';
  } else if (/sello rojo|rehabilitad|cableado|luz y agua|reparacion|reparar/.test(normalized)) {
    intent = 'sello_rojo';
  }

  // 2. Detección de Zona
  const zones = ['pesqueria', 'pesquería', 'garcia', 'garcía', 'escobedo', 'juarez', 'juárez', 'monterrey', 'guadalupe', 'apodaca', 'san nicolas', 'santa catarina'];
  const matchedZone = zones.find(z => normalized.includes(z));

  // 3. Selección de Propiedad Coincidente del Catálogo Real
  let matchedProp = null;
  if (intent === 'compra' || intent === 'sello_rojo') {
    if (normalized.includes('lincoln') || matchedZone === 'garcia' || matchedZone === 'garcía') {
      matchedProp = properties.find(p => p.slug?.includes('lincoln') || p.location?.includes('Lincoln') || p.city?.includes('García')) || properties[1];
    } else if (normalized.includes('santa maria') || normalized.includes('santa maría') || matchedZone === 'pesqueria' || matchedZone === 'pesquería') {
      matchedProp = properties.find(p => p.slug?.includes('santa-maria') || p.location?.includes('Santa María') || p.city?.includes('Pesquería')) || properties[0];
    } else if (normalized.includes('palmiras') || matchedZone === 'escobedo') {
      matchedProp = properties.find(p => p.slug?.includes('palmiras') || p.city?.includes('Escobedo')) || properties[2];
    } else if (normalized.includes('san francisco') || normalized.includes('praderas')) {
      matchedProp = properties.find(p => p.slug?.includes('praderas') || p.title?.includes('Praderas')) || properties[0];
    } else {
      matchedProp = properties.find(p => p.operation === 'venta' && p.status === 'disponible') || properties[0];
    }
  } else if (intent === 'renta') {
    matchedProp = properties.find(p => p.operation === 'renta') || {
      title: 'Casa Residencial en Renta',
      location: 'Monterrey y Zona Metropolitana, N.L.',
      priceFormatted: '$9,500 MXN / mes',
      bedrooms: 3,
      bathrooms: 2,
      constructionAreaM2: 120,
      operation: 'renta'
    };
  }

  // Valores predeterminados seguros para la ficha
  const propTitle = matchedProp?.title || 'Casa en Venta en Zona Metropolitana';
  const propLocation = matchedProp?.location || 'Valle de Lincoln 4a Etapa, García, N.L.';
  const propPrice = matchedProp?.priceFormatted || (matchedProp?.price ? `$${Number(matchedProp.price).toLocaleString('es-MX')} MXN` : '$720,000 MXN');
  const propBeds = matchedProp?.bedrooms || 2;
  const propBaths = matchedProp?.bathrooms || 1;
  const propFloors = matchedProp?.floors || 1;
  const propArea = matchedProp?.constructionAreaM2 || matchedProp?.areaM2 || 65;
  const propAppraisalFee = matchedProp?.appraisalFee ? `$${Number(matchedProp.appraisalFee).toLocaleString('es-MX')} MXN` : '$7,000 MXN';

  // 4. Razonamiento Profundo de la IA
  let reasoningHtml = '';
  let scripts = [];
  let coveredFields = [];

  if (intent === 'compra' || intent === 'sello_rojo') {
    reasoningHtml = `
      <div class="ai-reasoning-step">
        <span class="reasoning-badge intent">🎯 INTENCIÓN DETECTADA: Adquisición de Vivienda (${matchedZone ? matchedZone.toUpperCase() : 'ZONA METROPOLITANA'})</span>
        <p>El cliente pregunta por opciones de compra, precio o requisitos de crédito. Su duda crítica es saber <strong>cuánto cuesta en total</strong>, con <strong>cuánto se aparta</strong> y si la vivienda está <strong>lista para habitarse (agua, luz y Sello Rojo)</strong>.</p>
      </div>
      <div class="ai-reasoning-step">
        <span class="reasoning-badge match">🏠 PROPIEDAD RECOMENDADA: ${propTitle}</span>
        <p>Se vinculó la propiedad <strong>${propTitle}</strong> en <strong>${propLocation}</strong> con precio de <strong>${propPrice}</strong>, distribución de ${propBeds} recámaras y separación garantizada de <strong>${propAppraisalFee}</strong>.</p>
      </div>
      <div class="ai-reasoning-step">
        <span class="reasoning-badge closing">⚡ ESTRATEGIA COMERCIAL AIDA:</span>
        <p>1. Transmitir certeza absoluta sobre el estado físico (Sello Rojo). 2. Explicar que los ${propAppraisalFee} cubren su avalúo oficial. 3. Cerrar con una pregunta de doble alternativa ("¿viernes o sábado?") para concretar la visita en persona.</p>
      </div>
    `;

    coveredFields = [
      'Precio total en MXN',
      'Ubicación exacta y municipio',
      'Recámaras, baños y plantas',
      'Monto de apartado con avalúo (' + propAppraisalFee + ')',
      'Créditos Infonavit y bancarios',
      'Garantía Sello Rojo (luz y agua)',
      'Llamada a la acción para visita física'
    ];

    scripts = [
      {
        id: 'opt_completa',
        title: 'Opción 1: Completa & Ficha Técnica Oficial (Recomendada)',
        badge: 'Más Completa',
        content: `¡Hola! Con mucho gusto te brindo la información completa y detallada de la propiedad en *${propLocation}*:

🏡 *FICHA TÉCNICA Y ESPECIFICACIONES:*
• *Propiedad:* ${propTitle}
• *Precio de venta:* ${propPrice}
• *Distribución:* ${propBeds} recámaras amplias, sala, comedor, cocina independiente, ${propBaths} baño(s) y patio de servicio.
• *Construcción:* Aprox. ${propArea} m² en ${propFloors} planta(s).
• *Estado físico:* 🔴 *Rehabilitada con Sello Rojo Infonavit* (centro de carga y cableado de luz nuevos, tuberías de agua y drenaje revisadas, pintura e impermeabilización al 100%).

💰 *CONDICIONES DE PAGO Y APARTADO:*
• *Separación:* Se aparta con únicamente *${propAppraisalFee}*, monto que cubre el avalúo técnico oficial.
• *Créditos aceptados:* Infonavit Tradicional, Unamos Créditos, Cofinavit, Crédito Bancario o Pago de Contado.
• *Asesoría:* En Aisa Inmobiliaria realizamos toda la gestión notarial y de escrituras sin costo extra de gestoría.

¿Te gustaría ir a conocerla por dentro? Tenemos citas disponibles este *viernes por la tarde o sábado a las 11:00 AM*. ¿Cuál horario te queda más cómodo?`
      },
      {
        id: 'opt_rapida',
        title: 'Opción 2: Comercial Rápida para Cierre de Cita',
        badge: 'Cierre Rápido',
        content: `¡Hola! Claro que sí, tenemos lista para entrega la *${propTitle}* en *${propLocation}* con precio de *${propPrice}*.

Cuenta con ${propBeds} recámaras, ${propBaths} baño(s), sala, comedor, cocina y patio. La casa se entrega con *Sello Rojo garantizado* (luz, agua y pintura al 100%).

Se aparta con *${propAppraisalFee}* (que cubre tu avalúo oficial) y aceptamos tu crédito Infonavit o bancario. ¿Te gustaría que la visitemos este fin de semana para que la conozcas y apartarla?`
      },
      {
        id: 'opt_dudas',
        title: 'Opción 3: Guía Paso a Paso (Crédito, Apartado y Entrega)',
        badge: 'Informativa',
        content: `¡Hola! Con gusto te explico los 4 sencillos pasos para adquirir la casa con nosotros en Aisa Inmobiliaria:

1️⃣ *Precalificación:* Te ayudamos a consultar tu monto exacto de crédito Infonavit sin compromiso.
2️⃣ *Visita y Apartado:* Conocemos la casa físicamente; si te gusta, se aparta con *${propAppraisalFee}* para ingresar el avalúo oficial a tu nombre.
3️⃣ *Certificación Sello Rojo:* Verificamos que la casa cuente con centro de carga, cableado, agua y drenaje en óptimas condiciones.
4️⃣ *Firma y Entrega:* Te acompañamos ante Notaría Pública para la firma de escrituras y entrega formal de tus llaves.

¿Tienes a la mano tu Número de Seguridad Social (NSS) y fecha de nacimiento para revisar tu crédito de inmediato?`
      },
      {
        id: 'opt_seguimiento',
        title: 'Opción 4: Mensaje de Seguimiento por WhatsApp',
        badge: 'Seguimiento',
        content: `¡Hola! ¿Qué tal? Te escribo de Aisa Inmobiliaria para dar seguimiento a tu interés en la casa de *${propLocation}* (${propPrice}).

¿Tuviste oportunidad de revisar la información o te gustaría que agendemos una llamada rápida de 2 minutos para resolver tus dudas de crédito? ¡Quedo a tus órdenes!`
      }
    ];

  } else if (intent === 'renta') {
    reasoningHtml = `
      <div class="ai-reasoning-step">
        <span class="reasoning-badge intent">🔑 INTENCIÓN DETECTADA: Arrendamiento Residencial</span>
        <p>El cliente busca rentar casa o departamento. Es indispensable aclarar de inmediato las <strong>modalidades (amueblada vs sin amueblar)</strong>, requisitos de depósito, comprobante de ingresos y aval o póliza jurídica.</p>
      </div>
      <div class="ai-reasoning-step">
        <span class="reasoning-badge match">📋 FILTRO OPERATIVO: Renta Amueblada vs Sin Amueblar</span>
        <p>Se presentan ambas opciones para evitar pérdida de prospectos y se solicita fecha estimada de mudanza para verificar disponibilidad de llaves.</p>
      </div>
    `;

    coveredFields = [
      'Renta amueblada (equipamiento incluido)',
      'Renta sin amueblar (condiciones)',
      'Monto de depósito en garantía',
      'Requisitos de arrendamiento (INE, ingresos)',
      'Contrato mínimo (12 meses)',
      'Pregunta de filtro de mudanza'
    ];

    scripts = [
      {
        id: 'opt_renta_completa',
        title: 'Opción 1: Renta Amueblada vs Sin Amueblar (Completa)',
        badge: 'Recomendada',
        content: `¡Hola! Con mucho gusto te comparto nuestras opciones y condiciones de *renta residencial* en Aisa Inmobiliaria:

🛋️ *1. OPCIÓN AMUEBLADA:*
• *Equipamiento:* Incluye sala, comedor, cocina integral con estufa y refrigerador, camas en recámaras y minisplit instalado.
• *Rango de renta:* Desde $8,500 hasta $14,000 MXN mensuales (según zona y acabados).
• *Ideal para:* Parejas, profesionistas o ejecutivos que buscan mudarse de inmediato sin trasladar muebles.

🏠 *2. OPCIÓN SIN AMUEBLAR:*
• *Condición:* Casa lista para habitar con tarja, boiler, protectores en ventanas y servicios de agua y luz al corriente.
• *Rango de renta:* Desde $5,000 hasta $8,500 MXN mensuales.

📋 *REQUISITOS GENERALES DE ARRENDAMIENTO:*
1. 1 mes de depósito en garantía + 1er mes de renta al firmar contrato.
2. Identificación oficial vigente (INE) y comprobante de ingresos (últimos 3 meses de nómina o estados de cuenta).
3. Aval con propiedad libre de gravamen en N.L. o contratación de Póliza Jurídica.
4. Contrato mínimo por 12 meses.

¿Para cuántas personas sería la casa y para qué fecha aproximada tienes planeada tu mudanza?`
      },
      {
        id: 'opt_renta_rapida',
        title: 'Opción 2: Renta Ágil para Cita',
        badge: 'Ágil',
        content: `¡Hola! Claro que sí, manejamos casas en renta tanto *amuebladas* (con sala, estufa, refrigerador y minisplit) como *sin amueblar* en excelentes sectores residenciales.

Los requisitos básicos son 1 mes de depósito, 1 mes de renta y comprobantes de ingresos con contrato a 1 año.

¿En qué zona de la ciudad estás buscando y cuál es tu presupuesto mensual aproximado para enviarte las fotos disponibles?`
      }
    ];

  } else if (intent === 'vender') {
    reasoningHtml = `
      <div class="ai-reasoning-step">
        <span class="reasoning-badge intent">💼 INTENCIÓN DETECTADA: Captación / Consignación de Propiedad</span>
        <p>Un propietario desea vender su casa. El objetivo es <strong>ganar la exclusiva de consignación</strong> explicando que Aisa ofrece avalúo gratuito, revisión legal de escrituras, opción de rehabilitación con Sello Rojo si tiene fallas de luz/agua, y trámite notarial completo.</p>
      </div>
      <div class="ai-reasoning-step">
        <span class="reasoning-badge closing">💎 VALOR DIFERENCIAL AISA: Cero anticipos, cobro solo a éxito</span>
        <p>Se resalta que la comisión (4-5%) se cobra únicamente al firmar en notaría. Se solicita ubicación y estatus de adeudos para perfilar el inmueble.</p>
      </div>
    `;

    coveredFields = [
      'Opinión de valor y avalúo sin costo inicial',
      'Revisión legal de escrituras e Infonavit',
      'Rehabilitación opcional Sello Rojo',
      'Promoción masiva en portales',
      'Comisión por éxito en Notaría',
      'Solicitud de datos del inmueble'
    ];

    scripts = [
      {
        id: 'opt_vender_completa',
        title: 'Opción 1: Asesoría Integral para Vender su Propiedad',
        badge: 'Recomendada',
        content: `¡Hola! Qué gusto saludarte. En Aisa Inmobiliaria somos especialistas en la venta y regularización de viviendas en todo Nuevo León. Con todo gusto te ayudamos a vender tu casa al mejor valor comercial y de forma 100% segura:

🤝 *¿CÓMO TRABAJAMOS LA VENTA DE TU CASA?*
1️⃣ *Opinión de Valor Gratuita:* Realizamos un estudio de mercado sin costo para fijar el precio real y competitivo de venta.
2️⃣ *Diagnóstico Legal:* Verificamos escrituras, gravámenes o adeudos de Infonavit y predial para que todo esté en regla ante notario.
3️⃣ *Rehabilitación Sello Rojo (Opcional):* Si la casa tiene detalles de cableado, agua o pintura, nosotros podemos coordinar la restauración para que califique a créditos Infonavit y se venda mucho más rápido.
4️⃣ *Promoción y Publicidad:* Publicamos en nuestro portal oficial, redes sociales, portales inmobiliarios y cartera de compradores con crédito ya autorizado.
5️⃣ *Firma y Cobro Seguro:* Te acompañamos hasta la Notaría Pública, donde recibes tu pago garantizado en cheque certificado o transferencia.

💼 *Honorarios:* Cobramos la comisión estándar de mercado (4% al 5%), la cual se paga *únicamente al momento de concretar la venta en Notaría* (no cobramos ningún anticipo).

¿En qué colonia y municipio se ubica tu propiedad y cuentas actualmente con algún crédito activo sobre ella?`
      },
      {
        id: 'opt_vender_rapida',
        title: 'Opción 2: Contacto Directo para Visita de Valuación',
        badge: 'Directa',
        content: `¡Hola! Con todo gusto te asesoramos para vender tu propiedad. Nos encargamos de todo: promoción, clientes con crédito listo, trámites notariales y cancelación de hipotecas si aún la debes a Infonavit o banco.

No cobramos anticipos, solo comisión al momento de firmar en notaría.

¿Te gustaría que agendemos una llamada o una visita rápida a tu casa para darte una opinión de valor real de cuánto podrías obtener por ella?`
      }
    ];

  } else if (intent === 'avaluo') {
    reasoningHtml = `
      <div class="ai-reasoning-step">
        <span class="reasoning-badge intent">📋 INTENCIÓN DETECTADA: Solicitud de Avalúo Inmobiliario</span>
        <p>El cliente requiere un peritaje o avalúo oficial. Es necesario enlistar los <strong>documentos indispensables</strong> (escrituras, predial, INE, recibo CFE/Agua) y los tiempos de dictamen (3 a 5 días hábiles).</p>
      </div>
    `;

    coveredFields = [
      'Documentación requerida (Escritura, Predial, INE)',
      'Tiempos de visita técnica e inspección',
      'Tiempo de entrega del dictamen (3 a 5 días)',
      'Validez oficial para créditos y notarías'
    ];

    scripts = [
      {
        id: 'opt_avaluo_completa',
        title: 'Opción 1: Procedimiento y Documentos para Avalúo Oficial',
        badge: 'Recomendada',
        content: `¡Hola! Claro que sí, en Aisa Inmobiliaria contamos con servicio de *Avalúo Inmobiliario Oficial con Perito Certificado*, válido para trámites de Infonavit, crédito bancario, escrituración o compraventa:

📄 *DOCUMENTACIÓN EN COPIA NECESARIA:*
1. Copia de la Escritura pública con sello del Registro Público de la Propiedad.
2. Boleta de Impuesto Predial al corriente (año en curso).
3. Identificación oficial con foto (INE o Pasaporte) del solicitante/propietario.
4. Comprobante de domicilio reciente (recibo de luz CFE o agua).
5. Plano arquitectónico o croquis de la propiedad (en caso de contar con él).

⏱️ *PROCESO Y TIEMPOS:*
• La visita de inspección física se programa en un lapso de 24 a 48 horas.
• El dictamen técnico oficial se emite en un periodo de *3 a 5 días hábiles* tras la visita.

¿Para qué trámite necesitas el avalúo y en qué municipio se ubica la propiedad?`
      }
    ];
  }

  // Respuesta principal (por defecto la primera opción)
  const defaultAnswer = scripts[0]?.content || '¡Hola! Con gusto te apoyamos con información de nuestro catálogo inmobiliario. ¿Qué tipo de propiedad estás buscando?';

  return {
    intent,
    reasoningHtml,
    scripts,
    coveredFields,
    matchedProperty: matchedProp ? {
      title: propTitle,
      location: propLocation,
      price: propPrice,
      bedrooms: propBeds,
      bathrooms: propBaths,
      appraisalFee: propAppraisalFee
    } : null,
    answer: defaultAnswer,
    properties: matchedProp ? [matchedProp] : []
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
            content: `Eres el asistente virtual automatizado de Aisa Inmobiliaria en Monterrey. Responde en español mexicano con tono cálido y profesional; usa datos reales del catálogo. Catálogo disponible:\n${catalogResult.answer}`
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
