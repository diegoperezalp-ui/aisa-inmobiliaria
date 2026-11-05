import Visit from '../models/Visit.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

export const createVisit = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Inicia sesión para guardar la visita en tu perfil.' });
    }

    const {
      propertyId,
      propertyTitle,
      propertyPrice,
      propertyLocation,
      clientPhone,
      date,
      time,
      notes
    } = req.body;

    if (!propertyTitle || !clientPhone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Por favor completa teléfono, fecha, horario y la propiedad de interés.'
      });
    }

    const visitData = {
      propertyId: propertyId || 'general',
      propertyTitle,
      propertyPrice: propertyPrice || '',
      propertyLocation: propertyLocation || '',
      userId: req.user._id || req.user.id,
      clientName: req.user.name,
      clientPhone,
      clientEmail: req.user.email || '',
      date,
      time,
      scheduledDate: '',
      scheduledTime: '',
      notes: notes || '',
      status: 'pendiente'
    };

    const { isMongoConnected } = getDBStatus();
    const visit = isMongoConnected
      ? await new Visit(visitData).save()
      : localStore.createVisit(visitData);

    return res.status(201).json({
      success: true,
      message: 'Tu solicitud de visita fue enviada. Un asesor confirmará la fecha y hora.',
      data: visit
    });
  } catch (error) {
    console.error('Error al agendar visita:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la solicitud de visita.'
    });
  }
};

export const getVisits = async (req, res) => {
  try {
    const { isMongoConnected } = getDBStatus();
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?._id || req.user?.id;

    if (isMongoConnected) {
      const visits = await Visit.find(isAdmin ? {} : { userId }).sort({ createdAt: -1 });
      return res.json({ success: true, count: visits.length, data: visits });
    }

    const visits = isAdmin ? localStore.getVisits() : localStore.getVisits(userId);
    return res.json({ success: true, count: visits.length, data: visits });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar visitas.' });
  }
};

export const updateVisitStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduledDate, scheduledTime } = req.body;

    if (!['pendiente', 'confirmada', 'realizada', 'cancelada'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado no válido.' });
    }

    if (status === 'confirmada' && (!scheduledDate || !scheduledTime)) {
      return res.status(400).json({ success: false, message: 'Indica la fecha y hora acordadas para confirmar la visita.' });
    }

    const updates = { status };
    if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;

    const { isMongoConnected } = getDBStatus();
    const visit = isMongoConnected
      ? await Visit.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      : localStore.updateVisitStatus(id, updates);

    if (!visit) return res.status(404).json({ success: false, message: 'Visita no encontrada.' });
    return res.json({ success: true, message: 'Agenda de visita actualizada.', data: visit });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar la visita.' });
  }
};
