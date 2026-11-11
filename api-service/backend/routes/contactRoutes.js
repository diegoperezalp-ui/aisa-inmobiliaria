import { Router } from 'express';
import { submitContact, getContacts } from '../controllers/contactController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/', rateLimit({ limit: 8, windowMs: 60 * 60 * 1000, message: 'Recibimos varias solicitudes desde tu conexión. Intenta de nuevo más tarde.' }), submitContact);
router.get('/', protect, requireAdmin, getContacts);

export default router;
