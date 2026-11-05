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
    type: String,
    required: [true, 'El precio formateado es obligatorio'],
    trim: true
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
    required: [true, 'Las recámaras son obligatorias'],
    default: 0
  },
  bathrooms: {
    type: Number,
    required: [true, 'Los baños son obligatorios'],
    default: 0
  },
  halfBathrooms: {
    type: Number,
    default: null,
    min: 0
  },
  areaM2: {
    type: Number,
    default: 0
  },
  constructionAreaM2: {
    type: Number,
    default: 0,
    required: [true, 'Los metros cuadrados de construcción son obligatorios'],
    min: 0
  },
  landAreaM2: {
    type: Number,
    default: 0,
    required: [true, 'Los metros cuadrados de terreno son obligatorios'],
    min: 0
  },
  parking: {
    type: Number,
    default: 0
  },
  parkingSpaces: {
    type: Number,
    default: 0,
    required: [true, 'Los cajones de estacionamiento son obligatorios'],
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
    default: null,
    min: 0
  },
  appraisalFee: {
    type: Number,
    default: null,
    min: 0
  },
  condition: {
    type: String,
    default: null,
    trim: true
  },
  acceptedCredits: [{
    type: String,
    enum: ['Bancario', 'Infonavit', 'Cofinavit', 'Recursos propios'],
    trim: true
  }],
  legalStatus: {
    type: String,
    default: null,
    trim: true
  },
  lotDimensions: {
    type: String,
    default: null,
    trim: true
  },
  distribution: {
    groundFloor: [{
      type: String,
      trim: true
    }],
    upperFloor: [{
      type: String,
      trim: true
    }]
  },
  equipment: [{
    type: String,
    trim: true
  }],
  communityAmenities: [{
    type: String,
    trim: true
  }],
  nearbyServices: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  images: {
    type: [String],
    required: [true, 'Debe incluir al menos una imagen'],
    validate: {
      validator: images => Array.isArray(images) && images.length > 0,
      message: 'Debe incluir al menos una imagen'
    }
  },
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
    required: [true, 'El estado de la propiedad es obligatorio'],
    default: 'disponible'
  }
}, {
  timestamps: true
});

// Índice de texto para búsquedas rápidas
propertySchema.index({ title: 'text', description: 'text', location: 'text', city: 'text' });

const Property = mongoose.models.Property || mongoose.model('Property', propertySchema);

export default Property;
