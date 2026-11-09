import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  optedOut: { type: Boolean, default: false },
  optedOutAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.WhatsAppContact || mongoose.model('WhatsAppContact', schema);
