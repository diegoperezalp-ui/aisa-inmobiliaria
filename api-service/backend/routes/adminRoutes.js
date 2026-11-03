import { Router } from 'express';
import { getDashboardSummary } from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/summary', protect, requireAdmin, getDashboardSummary);

export default router;
