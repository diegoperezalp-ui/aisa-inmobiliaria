import mongoose from 'mongoose';
import { isValidMexicanPhone } from '../utils/phoneValidation.js';

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    trim: true
  },
  phone: {
    type: String,
    default: '',
    validate: { validator: value => !value || isValidMexicanPhone(value), message: 'Ingresa un teléfono mexicano válido de 10 dígitos.' }
  },
  subject: {
    type: String,
    default: 'Consulta General'
  },
  message: {
    type: String,
    required: [true, 'El mensaje es obligatorio'],
    trim: true
  },
  propertyId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['no_leido', 'en_proceso', 'respondido'],
    default: 'no_leido'
  }
}, {
  timestamps: true
});

const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

export default Contact;
