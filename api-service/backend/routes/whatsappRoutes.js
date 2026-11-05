import { Router } from 'express';
import { createAiReply } from '../services/aiService.js';

const router = Router();

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  const entries = req.body?.entry || [];
  const message = entries
    .flatMap((entry) => entry.changes || [])
    .map((change) => change.value?.messages?.[0])
    .find((item) => item?.type === 'text');

  if (!message) return res.sendStatus(200);

  const phoneNumberId = entries
    .flatMap((entry) => entry.changes || [])
    .map((change) => change.value?.metadata?.phone_number_id)
    .find(Boolean);
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp] Falta WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.');
    return res.sendStatus(503);
  }

  try {
    const reply = await createAiReply(message.text.body, []);
    await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: message.from,
        type: 'text',
        text: { body: reply.answer }
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    console.error('[WhatsApp] No se pudo responder:', error.message);
  }

  return res.sendStatus(200);
});

export default router;
