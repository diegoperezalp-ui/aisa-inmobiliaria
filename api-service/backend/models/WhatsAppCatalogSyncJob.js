import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  retailerId: { type: String, required: true, unique: true, index: true },
  propertyMongoId: { type: String, default: '' },
  action: { type: String, enum: ['upsert', 'unavailable', 'delete'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: null },
  status: {
    type: String,
    enum: ['pending', 'processing', 'synced', 'failed'],
    default: 'pending',
    index: true
  },
  generation: { type: Number, default: 1 },
  attempts: { type: Number, default: 0 },
  metaProductId: { type: String, default: '' },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  syncedAt: { type: Date, default: null },
  lastError: { type: String, default: '' }
}, { timestamps: true });

schema.index({ status: 1, nextAttemptAt: 1 });

export default mongoose.models.WhatsAppCatalogSyncJob
  || mongoose.model('WhatsAppCatalogSyncJob', schema);
