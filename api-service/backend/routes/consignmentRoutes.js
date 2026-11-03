import { Router } from 'express';
import {
  createConsignment,
  getConsignments,
  updateConsignmentStatus
} from '../controllers/consignmentController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Consignar propiedad (público)
router.post('/', createConsignment);

// Ver y gestionar consignaciones (Admin)
router.get('/', protect, requireAdmin, getConsignments);
router.patch('/:id/status', protect, requireAdmin, updateConsignmentStatus);

export default router;
