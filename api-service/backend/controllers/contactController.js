import Contact from '../models/Contact.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

// Enviar mensaje de contacto o consulta
export const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, propertyId } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona nombre, correo electrónico y mensaje.'
      });
    }

    const contactData = {
      name,
      email,
      phone: phone || '',
      subject: subject || 'Consulta general',
      message,
      propertyId: propertyId || null,
      status: 'no_leido'
    };

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const item = new Contact(contactData);
      await item.save();

      return res.status(201).json({
        success: true,
        message: '¡Mensaje recibido y registrado en MongoDB! Un asesor se comunicará contigo pronto.',
        data: item
      });
    } else {
      const item = localStore.createContact(contactData);
      return res.status(201).json({
        success: true,
        message: '¡Mensaje recibido! Un asesor se comunicará contigo pronto.',
        data: item
      });
    }
  } catch (error) {
    console.error('Error al enviar contacto:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar mensaje de contacto.' });
  }
};

// Obtener mensajes de contacto (Admin)
export const getContacts = async (req, res) => {
  try {
    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const contacts = await Contact.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: contacts.length, data: contacts });
    } else {
      const contacts = localStore.getContacts();
      return res.json({ success: true, count: contacts.length, data: contacts });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar mensajes.' });
  }
};
