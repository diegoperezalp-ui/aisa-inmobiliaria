import AppraisalRequest from '../models/AppraisalRequest.js';
import { getDBStatus } from '../config/db.js';
import { normalizeMexicanPhone } from '../utils/phoneValidation.js';

const requireDatabase = (res) => {
  if (!getDBStatus().isMongoConnected) {
    res.status(503).json({
      success: false,
      message: 'La base de datos no está disponible. No se guardaron los datos privados.'
    });
    return false;
  }
  return true;
};

export const createAppraisalRequest = async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const beneficiaryPhone = normalizeMexicanPhone(req.body.beneficiaryPhone);
    const propertyOwnerPhone = req.body.propertyOwnerPhone?.trim()
      ? normalizeMexicanPhone(req.body.propertyOwnerPhone) : '';
    const postalCode = req.body.postalCode?.trim() || '';
    const rawAge = req.body.propertyAgeYears;
    const propertyAgeYears = rawAge === '' || rawAge === undefined || rawAge === null ? null : Number(rawAge);
    if (!beneficiaryPhone || (req.body.propertyOwnerPhone?.trim() && !propertyOwnerPhone)) {
      return res.status(400).json({ success: false, message: 'Los teléfonos deben tener 10 dígitos mexicanos válidos.' });
    }
    if (postalCode && !/^[0-9]{5}$/.test(postalCode)) {
      return res.status(400).json({ success: false, message: 'El código postal debe contener exactamente 5 dígitos.' });
    }
    if (propertyAgeYears !== null && (!Number.isInteger(propertyAgeYears) || propertyAgeYears < 0 || propertyAgeYears > 250)) {
      return res.status(400).json({ success: false, message: 'La antigüedad debe ser un número entero entre 0 y 250 años.' });
    }
    const request = await AppraisalRequest.create({
      applicationType: 'infonavit_appraisal',
      beneficiaryName: req.body.beneficiaryName,
      beneficiaryPhone,
      propertyOwnerName: req.body.propertyOwnerName,
      propertyOwnerPhone,
      propertyStreet: req.body.propertyStreet,
      propertyNeighborhood: req.body.propertyNeighborhood,
      municipality: req.body.municipality,
      state: req.body.state,
      postalCode,
      propertyAgeYears,
      creditPurpose: req.body.creditPurpose,
      documentsPresented: req.body.documentsPresented,
      notes: req.body.notes,
      createdBy: req.user._id || req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'La solicitud de avalúo quedó registrada.',
      data: request
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Revisa los datos obligatorios de la solicitud.',
        errors: Object.values(error.errors).map(item => item.message)
      });
    }

    console.error('Error al registrar solicitud de avalúo:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudo registrar la solicitud de avalúo.'
    });
  }
};

export const getAppraisalRequests = async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const requests = await AppraisalRequest.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('Error al consultar solicitudes de avalúo:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar las solicitudes de avalúo.'
    });
  }
};

export const updateAppraisalRequest = async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const { id } = req.params;
    const allowed = ['status', 'notes', 'propertyAgeYears', 'creditPurpose', 'documentsPresented', 'beneficiaryPhone', 'propertyOwnerName', 'propertyOwnerPhone'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.beneficiaryPhone !== undefined) {
      update.beneficiaryPhone = normalizeMexicanPhone(update.beneficiaryPhone);
      if (!update.beneficiaryPhone) return res.status(400).json({ success: false, message: 'El teléfono del solicitante debe tener 10 dígitos mexicanos válidos.' });
    }
    if (update.propertyOwnerPhone !== undefined && String(update.propertyOwnerPhone).trim()) {
      update.propertyOwnerPhone = normalizeMexicanPhone(update.propertyOwnerPhone);
      if (!update.propertyOwnerPhone) return res.status(400).json({ success: false, message: 'El teléfono del propietario debe tener 10 dígitos mexicanos válidos.' });
    }
    if (update.propertyAgeYears !== undefined) {
      update.propertyAgeYears = update.propertyAgeYears === '' || update.propertyAgeYears === null ? null : Number(update.propertyAgeYears);
      if (update.propertyAgeYears !== null && (!Number.isInteger(update.propertyAgeYears) || update.propertyAgeYears < 0 || update.propertyAgeYears > 250)) {
        return res.status(400).json({ success: false, message: 'La antigüedad debe ser un número entero entre 0 y 250 años.' });
      }
    }

    const updated = await AppraisalRequest.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Solicitud de avalúo no encontrada.' });
    }

    return res.json({ success: true, message: 'Solicitud actualizada correctamente.', data: updated });
  } catch (error) {
    console.error('Error al actualizar solicitud de avalúo:', error);
    return res.status(500).json({ success: false, message: 'No se pudo actualizar la solicitud.' });
  }
};
