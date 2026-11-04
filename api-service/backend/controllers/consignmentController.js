import Consignment from '../models/Consignment.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

// Crear solicitud de consignación / venta de propiedad
export const createConsignment = async (req, res) => {
  try {
    const { ownerName, phone, email, propertyType, zone, expectedPrice, operationRequested, notes } = req.body;

    if (!ownerName || !phone || !propertyType || !zone || !expectedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Por favor completa nombre del propietario, teléfono, tipo de inmueble, zona y precio pretendido.'
      });
    }

    const consignData = {
      ownerName,
      phone,
      email: email || '',
      propertyType,
      zone,
      expectedPrice,
      operationRequested: operationRequested || 'venta',
      notes: notes || '',
      status: 'nuevo'
    };

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const item = new Consignment(consignData);
      await item.save();

      return res.status(201).json({
        success: true,
        message: '¡Tu propiedad ha sido registrada en nuestro sistema! Un asesor certificado de Aisa Inmobiliaria revisará tu información para iniciar la promoción.',
        data: item
      });
    } else {
      const item = localStore.createConsignment(consignData);
      return res.status(201).json({
        success: true,
        message: '¡Tu propiedad ha sido registrada en nuestro sistema! Un asesor certificado de Aisa Inmobiliaria revisará tu información para iniciar la promoción.',
        data: item
      });
    }
  } catch (error) {
    console.error('Error al registrar consignación:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar la propiedad para venta.' });
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

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const updated = await Consignment.findByIdAndUpdate(id, { status }, { new: true });
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
