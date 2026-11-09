import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  from: { type: String, required: true },
  status: { type: String, enum: ['processing', 'sent', 'failed', 'opted_out'], default: 'processing' },
  receivedAt: { type: Date, default: Date.now },
  error: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.models.WhatsAppEvent || mongoose.model('WhatsAppEvent', schema);
