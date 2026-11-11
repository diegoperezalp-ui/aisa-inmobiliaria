import { Router } from 'express';
import {
  createConsignment,
  getConsignments,
  streamConsignmentPhoto,
  updateConsignmentStatus,
  approveConsignment
} from '../controllers/consignmentController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { consignmentPhotoUpload } from '../middleware/consignmentPhotoUpload.js';

const router = Router();

// Consignar propiedad (público)
router.post('/', rateLimit({ limit: 8, windowMs: 60 * 60 * 1000, message: 'Recibimos varias solicitudes desde tu conexión. Intenta de nuevo más tarde.' }), consignmentPhotoUpload.array('photos', 5), createConsignment);

// Ver y gestionar consignaciones (Admin)
router.get('/', protect, requireAdmin, getConsignments);
router.get('/:id/photos/:photoId', protect, requireAdmin, streamConsignmentPhoto);
router.patch('/:id/status', protect, requireAdmin, updateConsignmentStatus);
router.post('/:id/approve', protect, requireAdmin, approveConsignment);

export default router;
