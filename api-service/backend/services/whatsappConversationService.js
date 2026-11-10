import mongoose from 'mongoose';
import WhatsAppConversation from '../models/WhatsAppConversation.js';

const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 12;
const memoryConversations = new Map();

export const getWhatsAppHistory = async (phone) => {
  if (mongoose.connection.readyState === 1) {
    const conversation = await WhatsAppConversation.findOne({ phone, expiresAt: { $gt: new Date() } })
      .select('messages')
      .lean();
    return (conversation?.messages || []).slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content }));
  }

  const conversation = memoryConversations.get(phone);
  if (!conversation || conversation.expiresAt <= Date.now()) {
    memoryConversations.delete(phone);
    return [];
  }
  return conversation.messages.slice(-MAX_MESSAGES);
};

export const addWhatsAppMessage = async (phone, role, content) => {
  const message = { role, content: String(content || '').slice(0, 1200), at: new Date() };
  const expiresAt = new Date(Date.now() + RETENTION_MS);

  if (mongoose.connection.readyState === 1) {
    await WhatsAppConversation.findOneAndUpdate(
      { phone },
      {
        $push: { messages: { $each: [message], $slice: -MAX_MESSAGES } },
        $set: { expiresAt }
      },
      { upsert: true, new: true, runValidators: true }
    );
    return;
  }

  const current = memoryConversations.get(phone);
  const messages = current && current.expiresAt > Date.now() ? current.messages : [];
  memoryConversations.set(phone, {
    messages: [...messages, { role, content: message.content }].slice(-MAX_MESSAGES),
    expiresAt: expiresAt.getTime()
  });
};

export const clearWhatsAppHistory = async (phone) => {
  if (mongoose.connection.readyState === 1) {
    await WhatsAppConversation.deleteOne({ phone });
  }
  memoryConversations.delete(phone);
};
