import mongoose from 'mongoose';

const consignmentSchema = new mongoose.Schema({
  ownerName: {
    type: String,
    required: [true, 'El nombre del propietario es obligatorio'],
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: [true, 'El teléfono de contacto es obligatorio'],
    trim: true,
    maxlength: 30
  },
  email: {
    type: String,
    trim: true,
    maxlength: 254,
    default: ''
  },
  propertyType: {
    type: String,
    required: [true, 'El tipo de inmueble es obligatorio'],
    trim: true,
    maxlength: 80
  },
  zone: {
    type: String,
    required: [true, 'La ubicación o zona es obligatoria'],
    trim: true,
    maxlength: 200
  },
  expectedPrice: {
    type: String,
    required: [true, 'El precio pretendido es obligatorio'],
    trim: true,
    maxlength: 40
  },
  operationRequested: {
    type: String,
    enum: ['venta', 'renta'],
    default: 'venta'
  },
  notes: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  photos: [{
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 100 },
    contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    size: { type: Number, required: true, max: 4 * 1024 * 1024 }
  }],
  smsStatus: {
    type: String,
    enum: ['pendiente', 'enviado', 'no_configurado', 'error'],
    default: 'no_configurado'
  },
  smsSentAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['nuevo', 'en_revision', 'contactado', 'publicado', 'rechazado'],
    default: 'nuevo'
  },
  publishedPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null }
}, {
  timestamps: true
});

const Consignment = mongoose.models.Consignment || mongoose.model('Consignment', consignmentSchema);

export default Consignment;
