import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true,
    trim: true
  },
  propertyTitle: {
    type: String,
    required: true,
    trim: true
  },
  propertyPrice: {
    type: String,
    default: ''
  },
  propertyLocation: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  clientName: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  clientPhone: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    trim: true
  },
  clientEmail: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: String,
    required: [true, 'La fecha es obligatoria']
  },
  time: {
    type: String,
    required: [true, 'El horario preferido es obligatorio']
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pendiente', 'confirmada', 'realizada', 'cancelada'],
    default: 'pendiente'
  }
}, {
  timestamps: true
});

const Visit = mongoose.models.Visit || mongoose.model('Visit', visitSchema);

export default Visit;
