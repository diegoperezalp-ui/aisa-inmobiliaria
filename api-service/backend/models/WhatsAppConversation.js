import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 1200 },
  at: { type: Date, default: Date.now }
}, { _id: false });

const schema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  messages: { type: [messageSchema], default: [] },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

export default mongoose.models.WhatsAppConversation
  || mongoose.model('WhatsAppConversation', schema);
