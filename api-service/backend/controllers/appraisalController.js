import AppraisalRequest from '../models/AppraisalRequest.js';
import { getDBStatus } from '../config/db.js';

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
    const request = await AppraisalRequest.create({
      applicationType: 'infonavit_appraisal',
      beneficiaryName: req.body.beneficiaryName,
      beneficiaryPhone: req.body.beneficiaryPhone,
      propertyOwnerName: req.body.propertyOwnerName,
      propertyOwnerPhone: req.body.propertyOwnerPhone,
      propertyStreet: req.body.propertyStreet,
      propertyNeighborhood: req.body.propertyNeighborhood,
      municipality: req.body.municipality,
      state: req.body.state,
      postalCode: req.body.postalCode,
      propertyAgeYears: req.body.propertyAgeYears,
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
