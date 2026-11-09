import mongoose from 'mongoose';

const repairSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: {
    type: String,
    enum: ['electricidad', 'agua', 'plomeria', 'estructura', 'acabados', 'limpieza', 'documentacion', 'otro'],
    default: 'otro'
  },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  priority: { type: String, enum: ['baja', 'media', 'alta', 'urgente'], default: 'media' },
  status: { type: String, enum: ['pendiente', 'programada', 'en_proceso', 'completada'], default: 'pendiente' },
  scheduledDate: { type: String, default: '', trim: true },
  scheduledTime: { type: String, default: '', trim: true },
  assignedTo: { type: String, default: '', trim: true, maxlength: 120 },
  completionNotes: { type: String, default: '', trim: true, maxlength: 1000 },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

const preparationPropertySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  type: { type: String, enum: ['casa', 'departamento', 'terreno', 'comercial', 'loft'], default: 'casa' },
  location: { type: String, required: true, trim: true, maxlength: 240 },
  neighborhood: { type: String, default: '', trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 120 },
  state: { type: String, default: 'Nuevo León', trim: true, maxlength: 100 },
  postalCode: { type: String, default: '', trim: true, maxlength: 12 },
  age: { type: Number, default: null, min: 0 },
  bedrooms: { type: Number, default: null, min: 0 },
  bathrooms: { type: Number, default: null, min: 0 },
  constructionAreaM2: { type: Number, default: null, min: 0 },
  landAreaM2: { type: Number, default: null, min: 0 },
  parkingSpaces: { type: Number, default: null, min: 0 },
  floors: { type: Number, default: null, min: 0 },
  price: { type: Number, default: null, min: 0 },
  description: { type: String, default: '', trim: true, maxlength: 3000 },
  notes: { type: String, default: '', trim: true, maxlength: 3000 },
  features: [{ type: String, trim: true, maxlength: 160 }],
  images: [{ type: String, trim: true, maxlength: 1000 }],
  coordinates: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  readinessStatus: {
    type: String,
    enum: ['por_inspeccionar', 'en_preparacion', 'lista_para_publicar', 'publicada'],
    default: 'por_inspeccionar',
    index: true
  },
  repairs: { type: [repairSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  promotedPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  promotedAt: { type: Date, default: null }
}, { timestamps: true });

preparationPropertySchema.index({ title: 'text', location: 'text', neighborhood: 'text', city: 'text' });

export default mongoose.models.PreparationProperty
  || mongoose.model('PreparationProperty', preparationPropertySchema);
