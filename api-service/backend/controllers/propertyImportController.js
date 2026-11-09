import Property from '../models/Property.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

const allowedTypes = new Set(['casa', 'departamento', 'terreno', 'comercial', 'loft']);
const allowedOperations = new Set(['venta', 'renta']);
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function normalize(row, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Registro ${index + 1}: se esperaba un objeto.`);
  const propertyId = String(row.propertyId || '').trim();
  const title = String(row.title || '').trim();
  const operation = String(row.operation || '').toLowerCase();
  const type = String(row.type || '').toLowerCase();
  const price = Number(row.price);
  const city = String(row.city || '').trim();
  const neighborhood = String(row.neighborhood || '').trim();
  const location = String(row.location || '').trim();
  const images = Array.isArray(row.images) ? row.images.map(String).filter(Boolean) : [];
  const latitude = Number(row.coordinates?.latitude);
  const longitude = Number(row.coordinates?.longitude);
  const errors = [];
  if (!propertyId || propertyId.length > 80) errors.push('propertyId estable requerido (máximo 80 caracteres)');
  if (!title) errors.push('title requerido');
  if (!allowedOperations.has(operation)) errors.push('operation debe ser venta o renta');
  if (!allowedTypes.has(type)) errors.push('type no válido');
  if (!Number.isFinite(price) || price <= 0) errors.push('price debe ser mayor que cero');
  if (!city || !neighborhood || !location) errors.push('city, neighborhood y location requeridos');
  if (!images.length) errors.push('images debe contener al menos una URL o ruta');
  if (images.some(image => !(/^(https?:\/\/|\/)/i.test(image)))) errors.push('images solo admite rutas locales absolutas o URL http(s)');
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.push('coordinates.latitude/longitude inválidas');
  if (errors.length) throw new Error(`Registro ${index + 1}: ${errors.join('; ')}`);
  const priceFormatted = operation === 'renta' ? `${money(price)} / mes` : money(price);
  return {
    propertyId, slug: slugify(title) + '-' + slugify(propertyId), title, operation, type, price, priceFormatted,
    city, neighborhood, location, description: String(row.description || ''),
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    amenities: Array.isArray(row.amenities) ? row.amenities.map(String) : [],
    bedrooms: Number(row.bedrooms) || 0, bathrooms: Number(row.bathrooms) || 0,
    halfBathrooms: Number(row.halfBathrooms) || 0,
    areaM2: Number(row.areaM2 ?? row.constructionAreaM2) || 0,
    constructionAreaM2: Number(row.constructionAreaM2 ?? row.areaM2) || 0,
    landAreaM2: Number(row.landAreaM2) || 0,
    parking: Number(row.parkingSpaces ?? row.parking) || 0,
    parkingSpaces: Number(row.parkingSpaces ?? row.parking) || 0,
    images, coordinates: { latitude, longitude }, featured: row.featured === true || row.featured === 'true',
    status: ['disponible', 'apartada', 'vendida', 'rentada'].includes(row.status) ? row.status : 'disponible'
  };
}

export async function previewOrImportProperties(req, res) {
  const rows = Array.isArray(req.body?.properties) ? req.body.properties : null;
  if (!rows || rows.length < 1 || rows.length > 100) return res.status(400).json({ success: false, message: 'Envía properties con entre 1 y 100 registros.' });
  let records;
  try { records = rows.map(normalize); }
  catch (error) { return res.status(422).json({ success: false, message: error.message }); }
  const ids = records.map(x => x.propertyId);
  if (new Set(ids).size !== ids.length) return res.status(422).json({ success: false, message: 'propertyId debe ser único dentro del lote.' });
  const { isMongoConnected } = getDBStatus();
  const existing = isMongoConnected
    ? await Property.find({ propertyId: { $in: ids } }).select('propertyId title').lean()
    : records.filter(record => localStore.getPropertyByIdOrSlug(record.propertyId)).map(record => ({ propertyId: record.propertyId, title: localStore.getPropertyByIdOrSlug(record.propertyId).title }));
  const existingIds = new Set(existing.map(x => x.propertyId));
  if (req.body.apply !== true) return res.json({ success: true, dryRun: true, create: records.filter(x => !existingIds.has(x.propertyId)).length, update: records.filter(x => existingIds.has(x.propertyId)).length, records });
  const results = [];
  for (const record of records) {
    let saved;
    if (isMongoConnected) saved = await Property.findOneAndUpdate({ propertyId: record.propertyId }, { $set: record }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    else {
      const prior = localStore.getPropertyByIdOrSlug(record.propertyId);
      saved = prior ? localStore.updateProperty(prior._id, record) : localStore.createProperty(record);
    }
    results.push({ propertyId: record.propertyId, id: saved._id, title: saved.title });
  }
  return res.json({ success: true, dryRun: false, createdOrUpdated: results.length, records: results });
}



