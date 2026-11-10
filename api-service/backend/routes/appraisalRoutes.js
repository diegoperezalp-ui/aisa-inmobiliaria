import { Router } from 'express';
import { createAppraisalRequest, getAppraisalRequests, updateAppraisalRequest } from '../controllers/appraisalController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(protect, requireAdmin);
router.get('/', getAppraisalRequests);
router.post('/', createAppraisalRequest);
router.patch('/:id', updateAppraisalRequest);

export default router;
