import Consignment from '../models/Consignment.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { deleteConsignmentPhotos, openConsignmentPhoto, storeConsignmentPhotos } from '../services/consignmentPhotoStorage.js';
import { sendConsignmentReviewSms } from '../services/smsService.js';
import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { queuePropertyForCatalogSync } from '../services/whatsappCatalogSyncService.js';
import { toPublicProperty } from '../utils/publicProperty.js';
import { normalizeMexicanPhone } from '../utils/phoneValidation.js';

// Crear solicitud de consignación / venta de propiedad
export const createConsignment = async (req, res) => {
  try {
    const { ownerName, phone, email, propertyType, zone, expectedPrice, operationRequested, notes } = req.body;
    const normalizedPhone = normalizeMexicanPhone(phone);
    const rawExpectedPrice = expectedPrice === undefined || expectedPrice === null ? '' : String(expectedPrice).trim();
    const parsedExpectedPrice = rawExpectedPrice ? Number(rawExpectedPrice) : null;

    if (typeof ownerName !== 'string' || typeof phone !== 'string' || typeof propertyType !== 'string'
      || typeof zone !== 'string' || (expectedPrice !== undefined && expectedPrice !== null && typeof expectedPrice !== 'string' && typeof expectedPrice !== 'number')
      || !ownerName.trim() || !phone.trim() || !propertyType.trim() || !zone.trim()
      || ownerName.length > 100 || phone.length > 24
      || propertyType.length > 80 || zone.length > 200
      || !normalizedPhone
      || (rawExpectedPrice && (!/^[0-9]{1,12}(?:\.[0-9]{1,2})?$/.test(rawExpectedPrice) || !Number.isFinite(parsedExpectedPrice) || parsedExpectedPrice <= 0 || parsedExpectedPrice > 1000000000000))
      || (email !== undefined && email !== null && typeof email !== 'string')
      || (typeof email === 'string' && email.length > 254)
      || (typeof email === 'string' && email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      || (notes !== undefined && notes !== null && typeof notes !== 'string')
      || (typeof notes === 'string' && notes.length > 2000)
      || !['venta', 'renta', undefined, ''].includes(operationRequested)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor completa nombre del propietario, teléfono, tipo de inmueble, zona y precio pretendido.'
      });
    }

    const { isMongoConnected } = getDBStatus();
    const requestedPhotos = req.files || [];
    if (!requestedPhotos.length) {
      return res.status(400).json({ success: false, message: 'Adjunta al menos una foto para que el administrador pueda evaluar y publicar la propiedad.' });
    }
    if (requestedPhotos.length && !isMongoConnected) {
      return res.status(503).json({ success: false, message: 'No se pueden guardar fotos en este momento. Intenta más tarde.' });
    }

    const consignData = {
      ownerName: ownerName.trim(),
      phone: normalizedPhone,
      email: email?.trim().toLowerCase() || '',
      propertyType: propertyType.trim(),
      zone: zone.trim(),
      expectedPrice: rawExpectedPrice ? String(parsedExpectedPrice) : '',
      operationRequested: operationRequested || 'venta',
      notes: notes?.trim() || '',
      photos: [],
      smsStatus: 'no_configurado',
      status: 'nuevo'
    };

    if (isMongoConnected) {
      const photos = await storeConsignmentPhotos(requestedPhotos);
      let item;
      try {
        item = new Consignment({ ...consignData, photos });
        await item.save();
      } catch (error) {
        await deleteConsignmentPhotos(photos).catch(() => {});
        throw error;
      }

      let smsResult = { status: 'no_configurado' };
      if (process.env.NODE_ENV === 'production') {
        try {
          smsResult = await sendConsignmentReviewSms({ name: item.ownerName, phone: item.phone });
        } catch (error) {
          console.error('[SMS] No se pudo enviar confirmación de solicitud de venta:', error.message);
          smsResult = { status: 'error' };
        }
      }
      item.smsStatus = smsResult.status;
      if (smsResult.status === 'enviado') item.smsSentAt = new Date();
      try {
        await item.save();
      } catch (error) {
        console.error('[SMS] No se pudo guardar el estado de confirmación:', error.message);
      }

      return res.status(201).json({
        success: true,
        message: '¡Tu solicitud fue recibida! Un asesor de Aisa Inmobiliaria revisará la información.',
        smsStatus: item.smsStatus
      });
    } else {
      const item = localStore.createConsignment(consignData);
      return res.status(201).json({ success: true, message: '¡Tu solicitud fue recibida! Un asesor de Aisa Inmobiliaria revisará la información.' });
    }
  } catch (error) {
    console.error('Error al registrar consignación:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar la propiedad para venta.' });
  }
};

export const streamConsignmentPhoto = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.photoId)) {
      return res.status(404).json({ success: false, message: 'Foto no encontrada.' });
    }
    const item = await Consignment.findById(req.params.id).select('photos').lean();
    const photo = item?.photos?.find(entry => String(entry.fileId) === req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, message: 'Foto no encontrada.' });

    res.set({
      'Content-Type': photo.contentType,
      'Content-Length': String(photo.size),
      'Content-Disposition': `inline; filename="${photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    const stream = openConsignmentPhoto(photo.fileId);
    stream.once('error', () => {
      if (!res.headersSent) res.status(404).json({ success: false, message: 'Foto no encontrada.' });
      else res.destroy();
    });
    stream.pipe(res);
  } catch (error) {
    console.error('[Fotos de venta] No se pudo leer la foto:', error.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'No se pudo cargar la foto.' });
  }
};

// Obtener todas las consignaciones (Admin)
export const getConsignments = async (req, res) => {
  try {
    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const items = await Consignment.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: items.length, data: items });
    } else {
      const items = localStore.getConsignments();
      return res.json({ success: true, count: items.length, data: items });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar solicitudes de venta.' });
  }
};

// Actualizar estado de consignación (Admin)
export const updateConsignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['nuevo', 'en_revision', 'contactado', 'rechazado'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado de solicitud no válido.' });
    }

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const updated = await Consignment.findOneAndUpdate({ _id: id, publishedPropertyId: null }, { status }, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
      return res.json({ success: true, message: 'Estado de solicitud actualizado.', data: updated });
    } else {
      const updated = localStore.updateConsignmentStatus(id, status);
      if (!updated) return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
      return res.json({ success: true, message: 'Estado actualizado.', data: updated });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar consignación.' });
  }
};

export const approveConsignment = async (req, res) => {
  let createdProperty;
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    const { isMongoConnected } = getDBStatus();
    if (!isMongoConnected) return res.status(503).json({ success: false, message: 'La base de datos no está disponible para publicar.' });
    const item = await Consignment.findById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    if (item.publishedPropertyId) return res.status(409).json({ success: false, message: 'Esta solicitud ya se publicó.', propertyId: item.publishedPropertyId });
    if (item.status === 'rechazado') return res.status(409).json({ success: false, message: 'No se puede publicar una solicitud rechazada.' });
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
    const type = ['casa', 'departamento', 'terreno', 'comercial', 'loft'].includes(body.type) ? body.type : '';
    const price = Number(body.price);
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 100) : '';
    const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim().slice(0, 120) : '';
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 300) : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 3000) : '';
    const numeric = key => Number(body[key]);
    const bedrooms = numeric('bedrooms'), bathrooms = numeric('bathrooms');
    const constructionAreaM2 = numeric('constructionAreaM2'), landAreaM2 = numeric('landAreaM2');
    const latitude = numeric('latitude'), longitude = numeric('longitude');
    if (!title || !type || !Number.isFinite(price) || price <= 0 || !city || !neighborhood || !location || !item.photos.length
      || [bedrooms, bathrooms, constructionAreaM2, landAreaM2].some(value => !Number.isFinite(value) || value < 0)
      || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, message: 'Completa título, tipo, precio, ubicación, recámaras, baños, superficies y confirma que haya fotos antes de publicar.' });
    }
    const slugBase = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'propiedad';
    const photos = item.photos.map(photo => photo.fileId);
    const propertyObjectId = new mongoose.Types.ObjectId();
    createdProperty = new Property({
      _id: propertyObjectId, title, slug: `${slugBase}-${propertyObjectId.toString().slice(-8)}`, propertyId: `prop-${propertyObjectId}`,
      operation: 'venta', type, price,
      priceFormatted: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(price),
      city, neighborhood, location, description, bedrooms, bathrooms, constructionAreaM2, landAreaM2,
      areaM2: constructionAreaM2, parking: 0, parkingSpaces: 0, images: photos.map(fileId => `${(process.env.AISA_API_URL || 'https://aisa-inmobiliaria-api.onrender.com').replace(/\/+$/, '')}/api/properties/${propertyObjectId}/photos/${fileId}`),
      consignmentPhotos: photos, coordinates: { latitude, longitude }, featured: false, status: 'disponible'
    });
    await createdProperty.save();
    const claimed = await Consignment.findOneAndUpdate(
      { _id: id, publishedPropertyId: null, status: { $ne: 'rechazado' } },
      { $set: { status: 'publicado', publishedPropertyId: createdProperty._id } },
      { new: true }
    );
    if (!claimed) {
      await Property.findByIdAndDelete(createdProperty._id);
      createdProperty = null;
      return res.status(409).json({ success: false, message: 'La solicitud cambió o ya fue publicada. Actualiza la agenda.' });
    }
    try { await queuePropertyForCatalogSync(createdProperty); }
    catch (error) { console.error('[Catálogo WhatsApp] No se pudo encolar el alta:', error.message); }
    return res.status(201).json({ success: true, message: 'Propiedad aprobada y publicada en el catálogo.', data: toPublicProperty(createdProperty), consignment: claimed });
  } catch (error) {
    if (createdProperty?._id) await Property.findByIdAndDelete(createdProperty._id).catch(() => {});
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    console.error('Error al aprobar solicitud de venta:', error);
    return res.status(500).json({ success: false, message: 'No se pudo publicar la propiedad.' });
  }
};

export const streamPublicPropertyPhoto = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.photoId)) return res.sendStatus(404);
    const property = await Property.findOne({ _id: req.params.id, status: 'disponible', consignmentPhotos: req.params.photoId }).select('consignmentPhotos').lean();
    if (!property) return res.sendStatus(404);
    const photoId = new mongoose.Types.ObjectId(req.params.photoId);
    const file = await mongoose.connection.db.collection('consignmentPhotos.files').findOne({ _id: photoId });
    if (!file || file.metadata?.purpose !== 'consignment') return res.sendStatus(404);
    const stream = openConsignmentPhoto(photoId);
    res.set({ 'Content-Type': ['image/jpeg', 'image/png', 'image/webp'].includes(file.contentType) ? file.contentType : 'application/octet-stream', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    stream.once('error', () => { if (!res.headersSent) res.sendStatus(404); else res.destroy(); });
    stream.pipe(res);
  } catch { if (!res.headersSent) res.sendStatus(404); }
};
