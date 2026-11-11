import Property from '../models/Property.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { toPublicProperty } from '../utils/publicProperty.js';
import { queuePropertyForCatalogSync, queuePropertyRemovalForCatalogSync } from '../services/whatsappCatalogSyncService.js';

const formatCurrencyMXN = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(amount);
};

const numericLimits = {
  price: [1, 1e12], bedrooms: [0, 100], bathrooms: [0, 100], halfBathrooms: [0, 100],
  areaM2: [0, 100000], constructionAreaM2: [0, 100000], landAreaM2: [0, 100000],
  parking: [0, 100], parkingSpaces: [0, 100], floors: [0, 100], age: [0, 250],
  maintenanceFee: [0, 1e9], appraisalFee: [0, 1e9]
};
const integerFields = new Set(['bedrooms', 'halfBathrooms', 'parking', 'parkingSpaces', 'floors', 'age']);
const parseBoundedNumber = (value, field) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const number = Number(value);
  const [min, max] = numericLimits[field];
  return Number.isFinite(number) && number >= min && number <= max
    && (!integerFields.has(field) || Number.isInteger(number)) ? number : null;
};

const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Obtener propiedades con filtros y ordenamiento
export const getProperties = async (req, res) => {
  try {
    const { operation, type, city, minPrice, maxPrice, search, sort, featured } = req.query;
    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const query = { status: 'disponible' };
      const textFilters = [];

      if (operation && operation !== 'all') {
        query.operation = operation;
      }
      if (type && type !== 'all') {
        query.type = type;
      }
      if (featured === 'true') {
        query.featured = true;
      }
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }
      if (city && city !== 'all') {
        const regexCity = new RegExp(escapeRegExp(city.replace(/-/g, ' ')), 'i');
        textFilters.push({ $or: [{ city: regexCity }, { location: regexCity }, { neighborhood: regexCity }] });
      }
      if (search?.trim()) {
        const regexSearch = new RegExp(escapeRegExp(search.trim()), 'i');
        textFilters.push({ $or: [
          { title: regexSearch },
          { location: regexSearch },
          { description: regexSearch },
          { city: regexSearch }
        ] });
      }
      if (textFilters.length) query.$and = textFilters;

      let sortOptions = { createdAt: -1 };
      if (sort === 'price-low') sortOptions = { price: 1 };
      if (sort === 'price-high') sortOptions = { price: -1 };

      const properties = (await Property.find(query).sort(sortOptions)).map(toPublicProperty);

      return res.json({
        success: true,
        count: properties.length,
        data: properties
      });
    } else {
      // Local store fallback
      const properties = localStore.getProperties({
        operation,
        type,
        city,
        minPrice,
        maxPrice,
        search,
        sort
      }).filter(property => property.status === 'disponible').map(toPublicProperty);

      return res.json({
        success: true,
        count: properties.length,
        data: properties
      });
    }
  } catch (error) {
    console.error('Error en getProperties:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar propiedades.' });
  }
};

export const getAdminProperties = async (req, res) => {
  try {
    const { isMongoConnected } = getDBStatus();
    const properties = isMongoConnected
      ? await Property.find().sort({ createdAt: -1 }).lean()
      : localStore.getProperties();

    return res.json({ success: true, count: properties.length, data: properties });
  } catch (error) {
    console.error('Error al consultar inventario administrativo:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudo consultar el inventario completo.'
    });
  }
};

// Obtener una propiedad por ID o por Slug
export const getPropertyByIdOrSlug = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      let property = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        property = await Property.findById(id);
      }
      if (!property) {
        property = await Property.findOne({ $or: [{ slug: id }, { propertyId: id }] });
      }

      if (!property || property.status !== 'disponible') {
        return res.status(404).json({ success: false, message: 'Propiedad no encontrada.' });
      }

      return res.json({ success: true, data: toPublicProperty(property) });
    } else {
      const property = localStore.getPropertyByIdOrSlug(id);
      if (!property || property.status !== 'disponible') {
        return res.status(404).json({ success: false, message: 'Propiedad no encontrada.' });
      }
      return res.json({ success: true, data: toPublicProperty(property) });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener ficha de propiedad.' });
  }
};

// Crear nueva propiedad (Admin)
export const createProperty = async (req, res) => {
  try {
    const {
      title,
      operation,
      type,
      price,
      city,
      neighborhood,
      location,
      description,
      features,
      amenities,
      bedrooms,
      bathrooms,
      areaM2,
      parking,
      images,
      latitude,
      longitude,
      featured
    } = req.body;

    if (!title || !price || !location) {
      return res.status(400).json({
        success: false,
        message: 'Título, precio y ubicación son campos requeridos.'
      });
    }

    const slug = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

    const numericValues = { price, bedrooms: bedrooms ?? 0, bathrooms: bathrooms ?? 0, areaM2: req.body.areaM2 ?? 0, parking: parking ?? 0 };
    const parsed = {};
    for (const [field, value] of Object.entries(numericValues)) {
      parsed[field] = parseBoundedNumber(value, field);
      if (parsed[field] === null) return res.status(400).json({ success: false, message: `El campo ${field} debe ser numérico y estar dentro de un rango válido.` });
    }
    for (const [field, value, min, max] of [['latitude', latitude, -90, 90], ['longitude', longitude, -180, 180]]) {
      const parsedCoordinate = value === undefined || value === '' || value === null ? (field === 'latitude' ? 25.6866 : -100.3161) : Number(value);
      if (!Number.isFinite(parsedCoordinate) || parsedCoordinate < min || parsedCoordinate > max || (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value.trim()))) return res.status(400).json({ success: false, message: 'Las coordenadas deben ser números dentro de un rango válido.' });
      parsed[field] = parsedCoordinate;
    }
    const numPrice = parsed.price;
    const priceFormatted = operation === 'renta'
      ? `${formatCurrencyMXN(numPrice)} / mes`
      : formatCurrencyMXN(numPrice);

    const propPayload = {
      title,
      slug,
      propertyId: `prop-${Date.now()}`,
      operation: operation || 'venta',
      type: type || 'casa',
      price: numPrice,
      priceFormatted,
      city: city || 'monterrey',
      neighborhood: neighborhood || 'monterrey',
      location,
      description: description || '',
      features: Array.isArray(features) ? features : (features ? [features] : []),
      amenities: Array.isArray(amenities) ? amenities : [],
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
      areaM2: parsed.areaM2,
      parking: parsed.parking,
      images: Array.isArray(images) && images.length ? images : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'],
      coordinates: {
        latitude: parsed.latitude,
        longitude: parsed.longitude
      },
      featured: Boolean(featured),
      status: 'disponible'
    };

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const newProperty = new Property(propPayload);
      await newProperty.save();
      try { await queuePropertyForCatalogSync(newProperty); }
      catch (syncError) { console.error('[Catálogo WhatsApp] No se pudo encolar el alta:', syncError.message); }
      return res.status(201).json({ success: true, message: 'Propiedad agregada al catálogo.', data: newProperty });
    } else {
      const newProperty = localStore.createProperty(propPayload);
      return res.status(201).json({ success: true, message: 'Propiedad creada con éxito en el catálogo.', data: newProperty });
    }
  } catch (error) {
    console.error('Error en createProperty:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error al crear la propiedad.' });
  }
};

// Actualizar una propiedad existente (Admin)
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'title', 'operation', 'type', 'price', 'city', 'neighborhood', 'location',
      'description', 'features', 'amenities', 'bedrooms', 'bathrooms',
      'halfBathrooms', 'areaM2', 'constructionAreaM2', 'landAreaM2',
      'parkingSpaces', 'floors', 'age', 'maintenanceFee', 'appraisalFee',
      'condition', 'acceptedCredits', 'legalStatus', 'lotDimensions',
      'distribution', 'equipment', 'communityAmenities', 'nearbyServices',
      'images', 'coordinates', 'featured', 'status'
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
    }

    for (const field of Object.keys(numericLimits)) {
      if (!Object.hasOwn(updates, field)) continue;
      if (updates[field] === '' || updates[field] === null) { updates[field] = null; continue; }
      const number = parseBoundedNumber(updates[field], field);
      if (number === null) return res.status(400).json({ success: false, message: `El campo ${field} debe ser numérico y estar dentro de un rango válido.` });
      updates[field] = number;
    }

    if (Object.hasOwn(updates, 'price')) {
      updates.price = Number(updates.price);
      if (!Number.isFinite(updates.price) || updates.price < 1 || updates.price > numericLimits.price[1]) {
        return res.status(400).json({ success: false, message: 'El precio debe ser un número válido.' });
      }
      const currentOperation = updates.operation;
      updates.priceFormatted = updates.price === 0
        ? '$0 MXN'
        : currentOperation === 'renta'
          ? `${formatCurrencyMXN(updates.price)} / mes`
          : formatCurrencyMXN(updates.price);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No hay cambios para guardar.' });
    }

    const { isMongoConnected } = getDBStatus();
    const property = isMongoConnected
      ? await Property.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      : localStore.updateProperty(id, updates);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Propiedad no encontrada.' });
    }

    if (isMongoConnected) {
      try { await queuePropertyForCatalogSync(property); }
      catch (syncError) { console.error('[Catálogo WhatsApp] No se pudo encolar la actualización:', syncError.message); }
    }

    return res.json({
      success: true,
      message: 'La ficha de la propiedad se actualizó correctamente.',
      data: property
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error al actualizar propiedad:', error);
    return res.status(500).json({ success: false, message: 'No se pudo actualizar la propiedad.' });
  }
};

// Eliminar propiedad (Admin)
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      let result = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        result = await Property.findByIdAndDelete(id);
      }
      if (!result) {
        result = await Property.findOneAndDelete({ $or: [{ slug: id }, { propertyId: id }] });
      }

      if (!result) {
        return res.status(404).json({ success: false, message: 'Propiedad no encontrada para eliminar.' });
      }

      try { await queuePropertyRemovalForCatalogSync(result); }
      catch (syncError) { console.error('[Catálogo WhatsApp] No se pudo encolar la eliminación:', syncError.message); }

      return res.json({ success: true, message: 'Propiedad eliminada correctamente.' });
    } else {
      const ok = localStore.deleteProperty(id);
      if (!ok) return res.status(404).json({ success: false, message: 'Propiedad no encontrada.' });
      return res.json({ success: true, message: 'Propiedad eliminada correctamente.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar propiedad.' });
  }
};
