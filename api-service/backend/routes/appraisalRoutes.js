import { Router } from 'express';
import { createAppraisalRequest, getAppraisalRequests } from '../controllers/appraisalController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(protect, requireAdmin);
router.get('/', getAppraisalRequests);
router.post('/', createAppraisalRequest);

export default router;
