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

    const numPrice = Number(price);
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
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      areaM2: Number(areaM2) || 0,
      parking: Number(parking) || 0,
      images: Array.isArray(images) && images.length ? images : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'],
      coordinates: {
        latitude: Number(latitude) || 25.6866,
        longitude: Number(longitude) || -100.3161
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

    if (Object.hasOwn(updates, 'price')) {
      updates.price = Number(updates.price);
      if (!Number.isFinite(updates.price) || updates.price < 0) {
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
