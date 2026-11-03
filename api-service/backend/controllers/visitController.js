import Visit from '../models/Visit.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

// Crear nueva solicitud de visita
export const createVisit = async (req, res) => {
  try {
    const {
      propertyId,
      propertyTitle,
      propertyPrice,
      propertyLocation,
      clientName,
      clientPhone,
      clientEmail,
      date,
      time,
      notes
    } = req.body;

    if (!propertyTitle || !clientName || !clientPhone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Por favor completa nombre, teléfono, fecha, horario y la propiedad de interés.'
      });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    const visitData = {
      propertyId: propertyId || 'general',
      propertyTitle,
      propertyPrice: propertyPrice || '',
      propertyLocation: propertyLocation || '',
      userId,
      clientName,
      clientPhone,
      clientEmail: clientEmail || (req.user ? req.user.email : ''),
      date,
      time,
      notes: notes || '',
      status: 'pendiente'
    };

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const newVisit = new Visit(visitData);
      await newVisit.save();

      return res.status(201).json({
        success: true,
        message: '¡Tu visita ha sido agendada y registrada en el sistema! Un asesor de Aisa Inmobiliaria te confirmará en breve.',
        data: newVisit
      });
    } else {
      const newVisit = localStore.createVisit(visitData);
      return res.status(201).json({
        success: true,
        message: '¡Tu visita ha sido agendada y registrada en el sistema! Un asesor de Aisa Inmobiliaria te confirmará en breve.',
        data: newVisit
      });
    }
  } catch (error) {
    console.error('Error al agendar visita:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la solicitud de visita.'
    });
  }
};

// Obtener visitas del usuario autenticado o todas si es Admin
export const getVisits = async (req, res) => {
  try {
    const { isMongoConnected } = getDBStatus();
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (isMongoConnected) {
      const query = isAdmin ? {} : { userId };
      const visits = await Visit.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: visits.length, data: visits });
    } else {
      const visits = isAdmin ? localStore.getVisits() : localStore.getVisits(userId);
      return res.json({ success: true, count: visits.length, data: visits });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar visitas.' });
  }
};

// Actualizar estado de visita (Admin)
export const updateVisitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pendiente', 'confirmada', 'realizada', 'cancelada'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado no válido.' });
    }

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const visit = await Visit.findByIdAndUpdate(id, { status }, { new: true });
      if (!visit) return res.status(404).json({ success: false, message: 'Visita no encontrada.' });
      return res.json({ success: true, message: 'Estado actualizado en MongoDB.', data: visit });
    } else {
      const visit = localStore.updateVisitStatus(id, status);
      if (!visit) return res.status(404).json({ success: false, message: 'Visita no encontrada.' });
      return res.json({ success: true, message: 'Estado actualizado.', data: visit });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar estado.' });
  }
};
