import Contact from '../models/Contact.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { normalizeMexicanPhone } from '../utils/phoneValidation.js';

// Enviar mensaje de contacto o consulta
export const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, propertyId } = req.body;
    const normalizedPhone = typeof phone === 'string' && phone.trim() ? normalizeMexicanPhone(phone) : '';

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string'
      || !name.trim() || !email.trim() || !message.trim()
      || !/^\S+@\S+\.\S+$/.test(email.trim())
      || name.length > 100 || email.length > 254 || message.length > 4000
      || (phone !== undefined && phone !== null && typeof phone !== 'string')
      || (phone !== undefined && phone !== null && typeof phone !== 'string')
      || (typeof phone === 'string' && phone.trim() && !normalizedPhone)
      || (subject !== undefined && subject !== null && typeof subject !== 'string')
      || (typeof subject === 'string' && subject.length > 150)
      || (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      || (propertyId && (typeof propertyId !== 'string' || propertyId.length > 100))) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona nombre, correo electrónico y mensaje.'
      });
    }

    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
      subject: typeof subject === 'string' && subject.trim() ? subject.trim() : 'Consulta general',
      message: message.trim(),
      propertyId: propertyId || null,
      status: 'no_leido'
    };

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const item = new Contact(contactData);
      await item.save();

      return res.status(201).json({ success: true, message: '¡Gracias! Recibimos tu mensaje. Un asesor se comunicará contigo pronto.' });
    } else {
      const item = localStore.createContact(contactData);
      return res.status(201).json({ success: true, message: '¡Mensaje recibido! Un asesor se comunicará contigo pronto.' });
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
