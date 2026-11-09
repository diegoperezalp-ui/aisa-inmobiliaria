import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import WhatsAppEvent from '../models/WhatsAppEvent.js';
import WhatsAppContact from '../models/WhatsAppContact.js';
import { createAiReply } from '../services/aiService.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { getWhatsAppCatalogFeed } from '../controllers/whatsappCatalogFeedController.js';
import {
  getWhatsAppCatalogStatus,
  syncWhatsAppCatalog,
  syncWhatsAppProfile
} from '../controllers/whatsappCatalogController.js';

const router = Router();
const memoryEvents = new Set();
const memoryOptOuts = new Set();
const MAX_MEMORY_EVENTS = 10000;

// Meta Commerce Manager fetches this public feed on a schedule; it needs no Graph API token.
router.get('/catalog/feed.csv', getWhatsAppCatalogFeed);
router.get('/catalog/status', protect, requireAdmin, getWhatsAppCatalogStatus);
router.post('/catalog/sync', protect, requireAdmin, syncWhatsAppCatalog);
router.post('/profile/sync', protect, requireAdmin, syncWhatsAppProfile);

router.get('/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verifyToken && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.sendStatus(403);
});

async function hasOptedOut(phone) {
  if (mongoose.connection.readyState === 1) {
    const contact = await WhatsAppContact.findOne({ phone }).select('optedOut').lean();
    return Boolean(contact?.optedOut);
  }
  return memoryOptOuts.has(phone);
}

async function setOptOut(phone, optedOut) {
  if (mongoose.connection.readyState === 1) {
    await WhatsAppContact.findOneAndUpdate(
      { phone },
      { $set: { optedOut, optedOutAt: optedOut ? new Date() : null } },
      { upsert: true, new: true, runValidators: true }
    );
  }
  if (optedOut) memoryOptOuts.add(phone);
  else memoryOptOuts.delete(phone);
}

async function claimMessage(message) {
  if (mongoose.connection.readyState === 1) {
    try {
      await WhatsAppEvent.create({ messageId: message.id, from: message.from, status: 'processing' });
      return true;
    } catch (error) {
      if (error?.code === 11000) {
        const retried = await WhatsAppEvent.findOneAndUpdate(
          { messageId: message.id, status: 'failed' },
          { $set: { status: 'processing', error: '' } },
          { new: true }
        );
        return Boolean(retried);
      }
      throw error;
    }
  }
  if (memoryEvents.has(message.id)) return false;
  memoryEvents.add(message.id);
  if (memoryEvents.size > MAX_MEMORY_EVENTS) memoryEvents.delete(memoryEvents.values().next().value);
  return true;
}

async function setEventStatus(id, status, error = '') {
  if (mongoose.connection.readyState === 1) {
    await WhatsAppEvent.updateOne({ messageId: id }, { $set: { status, error } });
  }
}

async function sendText(phoneId, token, recipient, text) {
  const response = await fetch('https://graph.facebook.com/v23.0/' + encodeURIComponent(phoneId) + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: text } }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Meta rechazó el envío (${response.status}): ${await response.text()}`);
}

async function processMessage(value, message) {
  const phoneId = value.metadata?.phone_number_id;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token || !message.id || !message.from) return;
  const claimed = await claimMessage(message);
  if (!claimed) return;
  try {
    const text = message.text?.body?.trim() || '';
    if (!text) { await setEventStatus(message.id, 'failed', 'Tipo de mensaje no compatible'); return; }
    if (/^(parar|stop|baja|cancelar)$/i.test(text)) {
      await setOptOut(message.from, true);
      await sendText(phoneId, token, message.from, 'Entendido. Dejaremos de enviarte respuestas automáticas. Escribe INICIAR cuando quieras reanudarlas.');
      await setEventStatus(message.id, 'opted_out');
      return;
    }
    if (/^iniciar$/i.test(text)) {
      await setOptOut(message.from, false);
      await sendText(phoneId, token, message.from, 'Listo, reanudaste las respuestas automáticas. ¿Buscas comprar o rentar?');
      await setEventStatus(message.id, 'sent');
      return;
    }
    if (await hasOptedOut(message.from)) {
      await setEventStatus(message.id, 'opted_out');
      return;
    }
    const reply = await createAiReply(text, []);
    await sendText(phoneId, token, message.from, reply.answer || 'Gracias por escribir a Aisa. Un asesor te ayudará en breve.');
    await setEventStatus(message.id, 'sent');
  } catch (error) {
    console.error('[WhatsApp] Error al procesar mensaje:', error.message);
    try { await setEventStatus(message.id, 'failed', error.message.slice(0, 500)); } catch (statusError) { console.error('[WhatsApp] No se pudo actualizar el estado:', statusError.message); }
  }
}

router.post('/webhook', (req, res) => {
  const appSecret = process.env.META_APP_SECRET;
  const signature = req.get('x-hub-signature-256');
  if (!appSecret || !Buffer.isBuffer(req.body) || !signature) return res.sendStatus(401);
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', appSecret).update(req.body).digest('hex'));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.sendStatus(401);

  let payload;
  try { payload = JSON.parse(req.body.toString('utf8')); } catch { return res.sendStatus(400); }
  const events = (payload.entry || []).flatMap(entry => entry.changes || [])
    .filter(change => change.field === 'messages')
    .flatMap(change => (change.value?.messages || []).map(message => ({ value: change.value, message })));
  res.sendStatus(200);
  for (const event of events) void processMessage(event.value, event.message);
});

export default router;
