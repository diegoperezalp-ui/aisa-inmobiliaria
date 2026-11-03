import { Router } from 'express';
import { submitContact, getContacts } from '../controllers/contactController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', submitContact);
router.get('/', protect, requireAdmin, getContacts);

export default router;
