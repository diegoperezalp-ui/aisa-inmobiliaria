import mongoose from 'mongoose';
import Property from '../models/Property.js';
import WhatsAppCatalogSyncJob from '../models/WhatsAppCatalogSyncJob.js';

const DEFAULT_GRAPH_VERSION = 'v27.0';
const MAX_ATTEMPTS = 8;
const WORKER_INTERVAL_MS = 5000;
const RETRY_BASE_MS = 30000;
const RETRY_MAX_MS = 60 * 60 * 1000;
const SITE_URL = 'https://aisa-inmobiliaria.vercel.app';
const BUSINESS_EMAIL = 'aisainmobiliaria9@gmail.com';
const BUSINESS_ABOUT = 'Venta y renta de inmuebles en Monterrey y área metropolitana.';
const BUSINESS_DESCRIPTION = 'Encuentra casas y departamentos en Monterrey y su área metropolitana. Explora propiedades disponibles y recibe asesoría de Aisa Inmobiliaria.';

let workerTimer = null;
let workerRunning = false;
let changeStream = null;
let changeStreamState = 'not_started';
let changeStreamRetry = null;

const graphVersion = () => {
  const value = String(process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION).trim();
  return /^v\d+\.\d+$/.test(value) ? value : DEFAULT_GRAPH_VERSION;
};

export const isCatalogSyncConfigured = () => Boolean(
  process.env.META_CATALOG_ID && process.env.META_CATALOG_ACCESS_TOKEN
);

export const isWhatsAppProfileSyncConfigured = () => Boolean(
  process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
);

const stableRetailerId = property => String(property?.propertyId || property?._id || property?.id || '').trim();

const plainProperty = property => typeof property?.toObject === 'function' ? property.toObject() : property;

export async function queuePropertyForCatalogSync(property) {
  if (mongoose.connection.readyState !== 1 || !property) return false;
  const record = plainProperty(property);
  const retailerId = stableRetailerId(record);
  if (!retailerId) return false;

  const action = record.status === 'disponible' ? 'upsert' : 'unavailable';
  await WhatsAppCatalogSyncJob.findOneAndUpdate(
    { retailerId },
    {
      $set: {
        retailerId,
        propertyMongoId: String(record._id || ''),
        action,
        payload: record,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
        syncedAt: null,
        lastError: ''
      },
      $inc: { generation: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return true;
}

export async function queuePropertyRemovalForCatalogSync(property) {
  if (mongoose.connection.readyState !== 1 || !property) return false;
  const record = plainProperty(property);
  const retailerId = stableRetailerId(record);
  if (!retailerId) return false;

  await WhatsAppCatalogSyncJob.findOneAndUpdate(
    { retailerId },
    {
      $set: {
        retailerId,
        propertyMongoId: String(record._id || ''),
        action: 'delete',
        payload: null,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
        syncedAt: null,
        lastError: ''
      },
      $inc: { generation: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return true;
}

async function queueRemovedMongoProperty(mongoId) {
  const previousJob = await WhatsAppCatalogSyncJob.findOne({ propertyMongoId: String(mongoId) })
    .select('retailerId propertyMongoId metaProductId')
    .lean();
  if (!previousJob?.retailerId) return false;
  return queuePropertyRemovalForCatalogSync({
    _id: previousJob.propertyMongoId,
    propertyId: previousJob.retailerId
  });
}

export async function queueAllAvailableProperties() {
  if (mongoose.connection.readyState !== 1) return 0;
  const properties = await Property.find({ status: 'disponible' }).lean();
  for (const property of properties) await queuePropertyForCatalogSync(property);
  return properties.length;
}

export async function retryFailedCatalogSyncJobs() {
  if (mongoose.connection.readyState !== 1) return 0;
  const result = await WhatsAppCatalogSyncJob.updateMany(
    { status: 'failed' },
    { $set: { status: 'pending', attempts: 0, nextAttemptAt: new Date(), lastError: '' } }
  );
  return Number(result.modifiedCount || 0);
}

const buildCatalogItem = (property, retailerId, availability = 'in stock') => {
  const images = Array.isArray(property.images)
    ? property.images.filter(image => typeof image === 'string'
      && /^https:\/\//i.test(image.trim())
      && !image.includes('photo-1600585154340-be6161a56a0c'))
    : [];
  if (!images.length) {
    const error = new Error('La ficha no tiene una imagen HTTPS pública para Meta.');
    error.permanent = true;
    throw error;
  }

  const details = [String(property.description || '').trim()];
  const location = [property.neighborhood, property.city].filter(Boolean).join(', ');
  if (location) details.push(`Ubicación: ${location}.`);
  if (property.type) details.push(`Tipo: ${property.type}.`);
  if (property.operation) details.push(`Operación: ${property.operation === 'renta' ? 'renta' : 'venta'}.`);
  if (Number(property.bedrooms) > 0) details.push(`Recámaras: ${property.bedrooms}.`);
  if (Number(property.bathrooms) > 0) details.push(`Baños: ${property.bathrooms}.`);
  const area = Number(property.constructionAreaM2 || property.areaM2);
  if (area > 0) details.push(`Construcción: ${area} m².`);
  if (Number(property.landAreaM2) > 0) details.push(`Terreno: ${Number(property.landAreaM2)} m².`);
  if (Array.isArray(property.features) && property.features.length) {
    details.push(`Características: ${property.features.filter(Boolean).join(', ')}.`);
  }

  const conditionText = String(property.condition || '').toLowerCase();
  const condition = /nuevo|nueva|estrenar/.test(conditionText)
    ? 'new'
    : /reacondicion/.test(conditionText) ? 'refurbished' : 'used';
  const slug = String(property.slug || retailerId);
  const url = new URL(`/propiedad.html?id=${encodeURIComponent(slug)}`, SITE_URL).toString();

  return {
    name: String(property.title || 'Propiedad Aisa').slice(0, 200),
    description: details.filter(Boolean).join('\n').slice(0, 5000),
    availability,
    condition,
    price: `${Number(property.price).toFixed(2)} MXN`,
    brand: 'Aisa Inmobiliaria',
    image_url: images[0].trim(),
    additional_image_urls: images.slice(1, 10).map(image => image.trim()),
    url
  };
};

const graphRequest = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.META_CATALOG_ACCESS_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000)
  });
  let result = {};
  try { result = await response.json(); } catch { /* Graph API puede responder sin JSON. */ }
  if (!response.ok || result.error) {
    const message = String(result.error?.message || `Meta respondió ${response.status}.`);
    const error = new Error(message.slice(0, 500));
    error.permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
    throw error;
  }
  return result;
};

const updateJobIfCurrent = (job, update) => WhatsAppCatalogSyncJob.updateOne(
  { _id: job._id, generation: job.generation },
  { $set: update }
);

const retryDelay = attempts => Math.min(RETRY_BASE_MS * (2 ** Math.max(0, attempts - 1)), RETRY_MAX_MS);

async function processClaimedJob(job) {
  if (job.action === 'delete') {
    if (job.metaProductId) {
      await graphRequest(encodeURIComponent(job.metaProductId), { method: 'DELETE' });
    }
    await updateJobIfCurrent(job, { status: 'synced', syncedAt: new Date(), lastError: '' });
    return;
  }

  if (!job.payload) {
    const error = new Error('No hay datos guardados para la propiedad.');
    error.permanent = true;
    throw error;
  }

  const availability = job.action === 'unavailable' ? 'out of stock' : 'in stock';
  const data = buildCatalogItem(job.payload, job.retailerId, availability);
  const result = await graphRequest(`${encodeURIComponent(process.env.META_CATALOG_ID)}/products`, {
    method: 'POST',
    body: { ...data, retailer_id: job.retailerId, allow_upsert: true }
  });
  const metaProductId = String(result.id || result.product_item?.id || job.metaProductId || '');
  await updateJobIfCurrent(job, {
    status: 'synced',
    metaProductId,
    syncedAt: new Date(),
    lastError: '',
  });
}

async function drainQueue() {
  if (workerRunning || !isCatalogSyncConfigured() || mongoose.connection.readyState !== 1) return;
  workerRunning = true;
  try {
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
    await WhatsAppCatalogSyncJob.updateMany(
      { status: 'processing', updatedAt: { $lt: staleBefore } },
      { $set: { status: 'pending', nextAttemptAt: new Date() } }
    );
    for (let index = 0; index < 10; index += 1) {
      const job = await WhatsAppCatalogSyncJob.findOneAndUpdate(
        { status: 'pending', nextAttemptAt: { $lte: new Date() } },
        { $set: { status: 'processing' } },
        { sort: { nextAttemptAt: 1 }, new: true }
      );
      if (!job) break;
      try {
        await processClaimedJob(job);
      } catch (error) {
        const attempts = Number(job.attempts || 0) + 1;
        const permanent = error.permanent === true || attempts >= MAX_ATTEMPTS;
        await updateJobIfCurrent(job, {
          status: permanent ? 'failed' : 'pending',
          attempts,
          nextAttemptAt: new Date(Date.now() + (permanent ? 0 : retryDelay(attempts))),
          lastError: String(error.message || 'Error al sincronizar el catálogo.').slice(0, 500)
        });
        console.error(`[Catálogo WhatsApp] No se pudo sincronizar ${job.retailerId}: ${String(error.message || '').slice(0, 200)}`);
      }
    }
  } finally {
    workerRunning = false;
  }
}

function startPropertyChangeStream() {
  if (changeStream || mongoose.connection.readyState !== 1) return;
  try {
    changeStreamState = 'connecting';
    changeStream = Property.watch([], { fullDocument: 'updateLookup', maxAwaitTimeMS: 10000 });
    changeStream.on('change', event => {
      if (['insert', 'replace', 'update'].includes(event.operationType) && event.fullDocument) {
        void queuePropertyForCatalogSync(event.fullDocument).catch(error => {
          console.error('[Catálogo WhatsApp] No se pudo encolar un cambio directo de MongoDB:', error.message);
        });
      } else if (event.operationType === 'delete' && event.documentKey?._id) {
        void queueRemovedMongoProperty(event.documentKey._id).catch(error => {
          console.error('[Catálogo WhatsApp] No se pudo encolar una baja directa de MongoDB:', error.message);
        });
      }
    });
    changeStream.on('error', error => {
      changeStreamState = 'unavailable';
      console.warn('[Catálogo WhatsApp] Change Stream de MongoDB no disponible; las rutas de la API siguen encolando cambios:', error.message);
      const failedStream = changeStream;
      changeStream = null;
      void failedStream?.close().catch(() => {});
      if (!changeStreamRetry) {
        changeStreamRetry = setTimeout(() => {
          changeStreamRetry = null;
          startPropertyChangeStream();
        }, 60000);
        changeStreamRetry.unref?.();
      }
    });
    changeStreamState = 'active';
  } catch (error) {
    changeStreamState = 'unavailable';
    console.warn('[Catálogo WhatsApp] No se pudo iniciar Change Stream; las rutas de la API siguen encolando cambios:', error.message);
  }
}

export function startWhatsAppCatalogSyncWorker() {
  if (workerTimer) return;
  startPropertyChangeStream();
  workerTimer = setInterval(() => void drainQueue(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  if (isCatalogSyncConfigured()) {
    void queueAllAvailableProperties()
      .then(count => console.log(`[Catálogo WhatsApp] ${count} propiedades disponibles en cola para sincronización.`))
      .catch(error => console.error('[Catálogo WhatsApp] No se pudo preparar la sincronización inicial:', error.message));
  }
  void drainQueue();
}

export async function getCatalogSyncStatus() {
  const [pending, processing, synced, failed, lastJob] = await Promise.all([
    WhatsAppCatalogSyncJob.countDocuments({ status: 'pending' }),
    WhatsAppCatalogSyncJob.countDocuments({ status: 'processing' }),
    WhatsAppCatalogSyncJob.countDocuments({ status: 'synced' }),
    WhatsAppCatalogSyncJob.countDocuments({ status: 'failed' }),
    WhatsAppCatalogSyncJob.findOne({ status: 'synced' }).sort({ syncedAt: -1 }).select('syncedAt').lean()
  ]);
  return {
    configured: isCatalogSyncConfigured(),
    changeStream: changeStreamState,
    pending,
    processing,
    synced,
    failed,
    lastSyncedAt: lastJob?.syncedAt || null
  };
}

export async function updateWhatsAppBusinessProfile() {
  if (!isWhatsAppProfileSyncConfigured()) {
    const error = new Error('Falta configurar WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN en Render.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)}/whatsapp_business_profile`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        about: BUSINESS_ABOUT,
        description: BUSINESS_DESCRIPTION,
        email: process.env.WHATSAPP_PROFILE_EMAIL || BUSINESS_EMAIL,
        websites: [process.env.AISA_PUBLIC_URL || SITE_URL]
      }),
      signal: AbortSignal.timeout(20000)
    }
  );
  let result = {};
  try { result = await response.json(); } catch { /* La respuesta puede venir vacía. */ }
  if (!response.ok || result.error) {
    const error = new Error(String(result.error?.message || `Meta respondió ${response.status}.`).slice(0, 500));
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }
  return { success: true, website: process.env.AISA_PUBLIC_URL || SITE_URL };
}
