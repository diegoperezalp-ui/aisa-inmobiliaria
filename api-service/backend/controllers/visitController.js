import Visit from '../models/Visit.js';
import User from '../models/User.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { normalizeMexicanPhone } from '../utils/phoneValidation.js';

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const validTime = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

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
    const normalizedPhone = normalizeMexicanPhone(clientPhone);

    if (!propertyTitle || !normalizedPhone || !validDate(date) || !validTime(time)
      || typeof propertyTitle !== 'string' || propertyTitle.length > 200 || (notes && (typeof notes !== 'string' || notes.length > 1000))) {
      return res.status(400).json({
        success: false,
        message: 'Ingresa un teléfono mexicano válido y revisa la fecha, hora y propiedad.'
      });
    }

    const visitData = {
      propertyId: propertyId || 'general',
      propertyTitle,
      propertyPrice: propertyPrice || '',
      propertyLocation: propertyLocation || '',
      userId: req.user._id || req.user.id,
      clientName: req.user.name,
      clientPhone: normalizedPhone,
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

export const createAdminVisit = async (req, res) => {
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
    const normalizedPhone = normalizeMexicanPhone(clientPhone);

    if (typeof propertyId !== 'string' || !propertyId.trim() || typeof propertyTitle !== 'string' || !propertyTitle.trim()
      || typeof clientName !== 'string' || !clientName.trim() || clientName.length > 120 || !normalizedPhone
      || !validDate(date) || !validTime(time)
      || (clientEmail !== undefined && clientEmail !== null && typeof clientEmail !== 'string')
      || (typeof clientEmail === 'string' && clientEmail.trim() && !/^\S+@\S+\.\S+$/.test(clientEmail.trim()))
      || (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 1000))) {
      return res.status(400).json({
        success: false,
        message: 'Revisa los datos de la cita. El teléfono debe ser un número mexicano válido de 10 dígitos.'
      });
    }

    const { isMongoConnected } = getDBStatus();
    const email = clientEmail?.trim().toLowerCase() || '';
    const matchedUser = email
      ? isMongoConnected
        ? await User.findOne({ email }).select('_id')
        : localStore.findUserByEmail(email)
      : null;

    const visitData = {
      propertyId,
      propertyTitle,
      propertyPrice: propertyPrice || '',
      propertyLocation: propertyLocation || '',
      userId: matchedUser?._id || null,
      clientName: clientName.trim(),
      clientPhone: normalizedPhone,
      clientEmail: email,
      date,
      time,
      scheduledDate: date,
      scheduledTime: time,
      notes: notes?.trim() || '',
      status: 'confirmada'
    };

    const visit = isMongoConnected
      ? await new Visit(visitData).save()
      : localStore.createVisit(visitData);

    return res.status(201).json({
      success: true,
      message: 'La cita quedó agregada a la agenda.',
      data: visit
    });
  } catch (error) {
    console.error('Error al crear cita desde la agenda administrativa:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudo crear la cita.'
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
