import mongoose from 'mongoose';

const consignmentSchema = new mongoose.Schema({
  ownerName: {
    type: String,
    required: [true, 'El nombre del propietario es obligatorio'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'El teléfono de contacto es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  propertyType: {
    type: String,
    required: [true, 'El tipo de inmueble es obligatorio'],
    trim: true
  },
  zone: {
    type: String,
    required: [true, 'La ubicación o zona es obligatoria'],
    trim: true
  },
  expectedPrice: {
    type: String,
    required: [true, 'El precio pretendido es obligatorio'],
    trim: true
  },
  operationRequested: {
    type: String,
    enum: ['venta', 'renta'],
    default: 'venta'
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['nuevo', 'en_revision', 'contactado', 'publicado', 'rechazado'],
    default: 'nuevo'
  }
}, {
  timestamps: true
});

const Consignment = mongoose.models.Consignment || mongoose.model('Consignment', consignmentSchema);

export default Consignment;
