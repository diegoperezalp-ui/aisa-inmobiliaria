import { Router } from 'express';
import { createAiReply } from '../services/aiService.js';
import { protect, requireAdmin } from '../middleware/auth.js';

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

router.post('/admin-draft', protect, requireAdmin, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ success: false, message: 'Pega el mensaje del cliente.' });
  if (message.length > 3000) return res.status(413).json({ success: false, message: 'El mensaje no puede superar 3,000 caracteres.' });

  try {
    const reply = await createAiReply(message, []);
    return res.json({ success: true, ...reply });
  } catch (error) {
    console.error('[AI] No se pudo redactar la respuesta para administración:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo redactar la respuesta. Intenta de nuevo.' });
  }
});

export default router;
