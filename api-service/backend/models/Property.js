import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  propertyId: {
    type: String,
    unique: true,
    sparse: true
  },
  operation: {
    type: String,
    required: [true, 'La operación (venta o renta) es obligatoria'],
    enum: ['venta', 'renta'],
    default: 'venta'
  },
  type: {
    type: String,
    required: [true, 'El tipo de propiedad es obligatorio'],
    enum: ['casa', 'departamento', 'terreno', 'comercial', 'loft'],
    default: 'casa'
  },
  price: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: 0
  },
  priceFormatted: {
    type: String
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  neighborhood: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  features: [{
    type: String
  }],
  amenities: [{
    type: String
  }],
  bedrooms: {
    type: Number,
    default: 0
  },
  bathrooms: {
    type: Number,
    default: 0
  },
  areaM2: {
    type: Number,
    default: 0
  },
  constructionAreaM2: {
    type: Number,
    default: 0,
    min: 0
  },
  landAreaM2: {
    type: Number,
    default: 0,
    min: 0
  },
  parking: {
    type: Number,
    default: 0
  },
  parkingSpaces: {
    type: Number,
    default: 0,
    min: 0
  },
  floors: {
    type: Number,
    default: 0,
    min: 0
  },
  yearBuilt: {
    type: Number,
    min: 1800
  },
  age: {
    type: Number,
    default: 0,
    min: 0
  },
  maintenanceFee: {
    type: Number,
    default: 0,
    min: 0
  },
  acceptedCredits: [{
    type: String,
    enum: ['Bancario', 'Infonavit', 'Cofinavit', 'Recursos propios'],
    trim: true
  }],
  images: [{
    type: String
  }],
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['disponible', 'apartada', 'vendida', 'rentada'],
    default: 'disponible'
  }
}, {
  timestamps: true
});

// Índice de texto para búsquedas rápidas
propertySchema.index({ title: 'text', description: 'text', location: 'text', city: 'text' });

const Property = mongoose.models.Property || mongoose.model('Property', propertySchema);

export default Property;
