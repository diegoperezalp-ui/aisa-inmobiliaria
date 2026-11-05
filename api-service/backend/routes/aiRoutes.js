import { Router } from 'express';
import { createAiReply } from '../services/aiService.js';

const router = Router();

router.post('/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ success: false, message: 'Escribe tu consulta.' });
  }

  try {
    const reply = await createAiReply(message, history);
    return res.json({ success: true, ...reply });
  } catch (error) {
    console.error('[AI] Error del chat:', error);
    return res.status(500).json({
      success: false,
      message: 'No pude completar la consulta ahora. Intenta de nuevo en un momento.'
    });
  }
});

export default router;
