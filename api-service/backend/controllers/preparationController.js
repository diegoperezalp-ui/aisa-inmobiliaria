import PreparationProperty from '../models/PreparationProperty.js';
import Property from '../models/Property.js';
import { getDBStatus } from '../config/db.js';
import { queuePropertyForCatalogSync } from '../services/whatsappCatalogSyncService.js';

const repairStatuses = new Set(['pendiente', 'programada', 'en_proceso', 'completada']);
const readinessStatuses = new Set(['por_inspeccionar', 'en_preparacion', 'lista_para_publicar']);
const repairCategories = new Set(['electricidad', 'agua', 'plomeria', 'estructura', 'acabados', 'limpieza', 'documentacion', 'otro']);
const repairPriorities = new Set(['baja', 'media', 'alta', 'urgente']);
const propertyTypes = new Set(['casa', 'departamento', 'terreno', 'comercial', 'loft']);

const requireMongo = (res) => {
  if (getDBStatus().isMongoConnected) return true;
  res.status(503).json({ success: false, message: 'La base de datos no está disponible. Intenta de nuevo en unos minutos.' });
  return false;
};

const text = (value, max = 3000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const numericOrNull = (value) => value === '' || value === null || value === undefined ? null : Number(value);
const preparationLimits = { age: [0, 250, true], bedrooms: [0, 100, true], bathrooms: [0, 100, false], constructionAreaM2: [0, 100000, false], landAreaM2: [0, 100000, false], parkingSpaces: [0, 100, true], floors: [0, 100, true], price: [0, 1e12, false] };
const invalidNumericField = (body) => Object.entries(preparationLimits).find(([field, [min, max, integer]]) => {
  if (!Object.hasOwn(body, field) || body[field] === '' || body[field] === null || body[field] === undefined) return false;
  const value = body[field];
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim()))) return true;
  const parsed = Number(value);
  return !Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed));
})?.[0];
const validImageUrls = (images) => Array.isArray(images)
  && images.every((url) => typeof url === 'string' && /^https:\/\//i.test(url.trim()));
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const validCoordinates = (coordinates) => Number.isFinite(coordinates?.latitude)
  && coordinates.latitude >= -90 && coordinates.latitude <= 90
  && Number.isFinite(coordinates?.longitude)
  && coordinates.longitude >= -180 && coordinates.longitude <= 180;

const editableFields = [
  'title', 'type', 'location', 'neighborhood', 'city', 'state', 'postalCode', 'age',
  'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'parkingSpaces', 'floors',
  'price', 'description', 'notes', 'features', 'images', 'coordinates', 'readinessStatus'
];

const toUpdate = (body) => {
  const updates = {};
  for (const field of editableFields) {
    if (!Object.hasOwn(body, field)) continue;
    if (['title', 'location', 'neighborhood', 'city', 'state', 'postalCode', 'description', 'notes'].includes(field)) {
      updates[field] = text(body[field], field === 'description' || field === 'notes' ? 3000 : 240);
    } else if (['age', 'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'parkingSpaces', 'floors', 'price'].includes(field)) {
      updates[field] = numericOrNull(body[field]);
    } else if (field === 'type') {
      updates.type = propertyTypes.has(body.type) ? body.type : undefined;
    } else if (field === 'readinessStatus') {
      updates.readinessStatus = readinessStatuses.has(body.readinessStatus) ? body.readinessStatus : undefined;
    } else if (field === 'features') {
      updates.features = Array.isArray(body.features) ? body.features.map((item) => text(item, 160)).filter(Boolean).slice(0, 40) : [];
    } else if (field === 'images') {
      updates.images = body.images;
    } else if (field === 'coordinates' && body.coordinates && typeof body.coordinates === 'object') {
      updates.coordinates = {
        latitude: numericOrNull(body.coordinates.latitude),
        longitude: numericOrNull(body.coordinates.longitude)
      };
    }
  }
  for (const [field, value] of Object.entries(updates)) {
    if (value === undefined) delete updates[field];
  }
  return updates;
};

const isUnfinished = (property) => property.repairs.some((repair) => repair.status !== 'completada');

export const getPreparations = async (req, res) => {
  if (!requireMongo(res)) return;
  try {
    const data = await PreparationProperty.find().sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('[Preparación] Error consultando inmuebles:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo consultar el tablero de preparación.' });
  }
};

export const createPreparation = async (req, res) => {
  if (!requireMongo(res)) return;
  const invalidField = invalidNumericField(req.body);
  if (invalidField) return res.status(400).json({ success: false, message: `El campo ${invalidField} debe ser numérico y estar dentro de un rango válido.` });
  if (req.body.postalCode && !/^\d{5}$/.test(req.body.postalCode)) return res.status(400).json({ success: false, message: 'El código postal debe tener exactamente 5 dígitos.' });
  if (req.body.coordinates && !validCoordinates({ latitude: Number(req.body.coordinates.latitude), longitude: Number(req.body.coordinates.longitude) })) return res.status(400).json({ success: false, message: 'Las coordenadas no son válidas.' });
  const payload = toUpdate(req.body);
  if (!payload.title || !payload.location || !payload.city) {
    return res.status(400).json({ success: false, message: 'Título, dirección y municipio son obligatorios.' });
  }
  if (payload.images && !validImageUrls(payload.images)) {
    return res.status(400).json({ success: false, message: 'Las imágenes deben ser enlaces HTTPS.' });
  }
  try {
    const property = await PreparationProperty.create({
      ...payload,
      createdBy: req.user._id || req.user.id,
      readinessStatus: payload.readinessStatus || 'por_inspeccionar'
    });
    return res.status(201).json({ success: true, data: property });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    console.error('[Preparación] Error creando inmueble:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo crear el inmueble en preparación.' });
  }
};

export const updatePreparation = async (req, res) => {
  if (!requireMongo(res)) return;
  const invalidField = invalidNumericField(req.body);
  if (invalidField) return res.status(400).json({ success: false, message: `El campo ${invalidField} debe ser numérico y estar dentro de un rango válido.` });
  if (Object.hasOwn(req.body, 'postalCode') && req.body.postalCode && !/^\d{5}$/.test(req.body.postalCode)) return res.status(400).json({ success: false, message: 'El código postal debe tener exactamente 5 dígitos.' });
  if (req.body.coordinates && !validCoordinates({ latitude: Number(req.body.coordinates.latitude), longitude: Number(req.body.coordinates.longitude) })) return res.status(400).json({ success: false, message: 'Las coordenadas no son válidas.' });
  const updates = toUpdate(req.body);
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No hay cambios válidos para guardar.' });
  if (updates.images && !validImageUrls(updates.images)) {
    return res.status(400).json({ success: false, message: 'Las imágenes deben ser enlaces HTTPS.' });
  }
  try {
    const property = await PreparationProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Inmueble en preparación no encontrado.' });
    if (property.promotedPropertyId) return res.status(409).json({ success: false, message: 'El inmueble ya se publicó. Actualízalo desde el inventario de Aisa.' });
    if (updates.readinessStatus === 'lista_para_publicar' && isUnfinished(property)) {
      return res.status(400).json({ success: false, message: 'Completa todas las reparaciones antes de marcarlo listo para publicar.' });
    }
    Object.assign(property, updates);
    await property.save();
    return res.json({ success: true, data: property });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ success: false, message: 'Revisa los datos del inmueble.' });
    console.error('[Preparación] Error actualizando inmueble:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo actualizar el inmueble.' });
  }
};

export const addRepair = async (req, res) => {
  if (!requireMongo(res)) return;
  const title = text(req.body.title, 160);
  if (!title) return res.status(400).json({ success: false, message: 'Describe el trabajo que hace falta.' });
  const scheduledDate = text(req.body.scheduledDate, 10);
  const scheduledTime = text(req.body.scheduledTime, 5);
  const status = repairStatuses.has(req.body.status) ? req.body.status : (scheduledDate ? 'programada' : 'pendiente');
  if ((scheduledDate && !validDate(scheduledDate)) || (scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime))) {
    return res.status(400).json({ success: false, message: 'La fecha u hora programada no es válida.' });
  }
  if (status === 'programada' && !scheduledDate) {
    return res.status(400).json({ success: false, message: 'Programa una fecha antes de marcar el trabajo como programado.' });
  }
  try {
    const property = await PreparationProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Inmueble en preparación no encontrado.' });
    if (property.promotedPropertyId) return res.status(409).json({ success: false, message: 'El inmueble ya se publicó.' });
    property.repairs.push({
      title,
      category: repairCategories.has(req.body.category) ? req.body.category : 'otro',
      description: text(req.body.description, 2000),
      priority: repairPriorities.has(req.body.priority) ? req.body.priority : 'media',
      status,
      scheduledDate,
      scheduledTime,
      assignedTo: text(req.body.assignedTo, 120)
    });
    property.readinessStatus = 'en_preparacion';
    await property.save();
    return res.status(201).json({ success: true, data: property });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Identificador de inmueble no válido.' });
    console.error('[Preparación] Error agregando reparación:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo agregar el trabajo.' });
  }
};

export const updateRepair = async (req, res) => {
  if (!requireMongo(res)) return;
  try {
    const property = await PreparationProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Inmueble en preparación no encontrado.' });
    if (property.promotedPropertyId) return res.status(409).json({ success: false, message: 'El inmueble ya se publicó.' });
    const repair = property.repairs.id(req.params.repairId);
    if (!repair) return res.status(404).json({ success: false, message: 'Trabajo de mantenimiento no encontrado.' });

    const { status, scheduledDate, scheduledTime, completionNotes, assignedTo, description, title, priority, category } = req.body;
    if (status !== undefined) {
      if (!repairStatuses.has(status)) return res.status(400).json({ success: false, message: 'Estado de reparación no válido.' });
      repair.status = status;
      repair.completedAt = status === 'completada' ? (repair.completedAt || new Date()) : null;
    }
    if (scheduledDate !== undefined) repair.scheduledDate = text(scheduledDate, 10);
    if (scheduledTime !== undefined) repair.scheduledTime = text(scheduledTime, 5);
    if (completionNotes !== undefined) repair.completionNotes = text(completionNotes, 1000);
    if (assignedTo !== undefined) repair.assignedTo = text(assignedTo, 120);
    if (description !== undefined) repair.description = text(description, 2000);
    if (title !== undefined && text(title, 160)) repair.title = text(title, 160);
    if (priority !== undefined && repairPriorities.has(priority)) repair.priority = priority;
    if (category !== undefined && repairCategories.has(category)) repair.category = category;

    if ((repair.scheduledDate && !validDate(repair.scheduledDate)) || (repair.scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(repair.scheduledTime))) {
      return res.status(400).json({ success: false, message: 'La fecha u hora programada no es válida.' });
    }
    if (repair.status === 'programada' && !repair.scheduledDate) {
      return res.status(400).json({ success: false, message: 'Programa una fecha antes de marcar el trabajo como programado.' });
    }
    property.readinessStatus = 'en_preparacion';
    await property.save();
    return res.json({ success: true, data: property });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Identificador no válido.' });
    console.error('[Preparación] Error actualizando reparación:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo actualizar el trabajo.' });
  }
};

const toSlug = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const promotePreparation = async (req, res) => {
  if (!requireMongo(res)) return;
  try {
    const preparation = await PreparationProperty.findById(req.params.id);
    if (!preparation) return res.status(404).json({ success: false, message: 'Inmueble en preparación no encontrado.' });
    if (preparation.promotedPropertyId) {
      const existing = await Property.findById(preparation.promotedPropertyId).lean();
      return res.status(409).json({ success: false, message: 'El inmueble ya está en el catálogo de Aisa.', data: existing });
    }
    if (preparation.readinessStatus !== 'lista_para_publicar' || isUnfinished(preparation)) {
      return res.status(400).json({ success: false, message: 'Primero completa los trabajos y marca el inmueble como listo para publicar.' });
    }
    const required = [
      ['title', Boolean(preparation.title?.trim())],
      ['location', Boolean(preparation.location?.trim())],
      ['city', Boolean(preparation.city?.trim())],
      ['neighborhood', Boolean(preparation.neighborhood?.trim())],
      ['price', preparation.price > 0],
      ['bedrooms', Number.isFinite(preparation.bedrooms)],
      ['bathrooms', Number.isFinite(preparation.bathrooms)],
      ['constructionAreaM2', Number.isFinite(preparation.constructionAreaM2)],
      ['landAreaM2', Number.isFinite(preparation.landAreaM2)],
      ['parkingSpaces', Number.isFinite(preparation.parkingSpaces)],
      ['coordinates', validCoordinates(preparation.coordinates)],
      ['images', validImageUrls(preparation.images) && preparation.images.length > 0]
    ];
    const missing = required.filter(([, valid]) => !valid).map(([field]) => field);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Completa estos datos antes de publicar: ${missing.join(', ')}.` });
    }

    const stablePropertyId = `prep-${preparation._id}`;
    let property = await Property.findOne({ propertyId: stablePropertyId });
    if (!property) {
      const baseSlug = toSlug(preparation.title) || 'inmueble';
      const priceFormatted = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(preparation.price);
      property = await Property.create({
        title: preparation.title,
        slug: `${baseSlug}-${String(preparation._id).slice(-6)}`,
        propertyId: stablePropertyId,
        operation: 'venta',
        type: preparation.type,
        price: preparation.price,
        priceFormatted,
        city: preparation.city,
        neighborhood: preparation.neighborhood,
        location: preparation.location,
        description: preparation.description,
        features: preparation.features,
        amenities: [],
        bedrooms: preparation.bedrooms,
        bathrooms: preparation.bathrooms,
        constructionAreaM2: preparation.constructionAreaM2,
        landAreaM2: preparation.landAreaM2,
        areaM2: preparation.constructionAreaM2,
        parking: preparation.parkingSpaces,
        parkingSpaces: preparation.parkingSpaces,
        floors: preparation.floors || 0,
        age: preparation.age || 0,
        images: preparation.images,
        coordinates: preparation.coordinates,
        featured: false,
        status: 'disponible'
      });
    }
    preparation.promotedPropertyId = property._id;
    preparation.promotedAt = new Date();
    preparation.readinessStatus = 'publicada';
    await preparation.save();
    try { await queuePropertyForCatalogSync(property); }
    catch (syncError) { console.error('[Catálogo WhatsApp] No se pudo encolar la propiedad publicada:', syncError.message); }
    return res.status(201).json({ success: true, message: 'El inmueble ya está en el catálogo de Aisa.', data: property });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Identificador de inmueble no válido.' });
    console.error('[Preparación] Error publicando inmueble:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo publicar el inmueble.' });
  }
};
