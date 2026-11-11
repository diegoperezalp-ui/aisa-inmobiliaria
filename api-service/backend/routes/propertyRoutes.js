import { Router } from 'express';
import {
  getProperties,
  getAdminProperties,
  getClosedProperties,
  getPropertyByIdOrSlug,
  createProperty,
  deleteProperty,
  updateProperty
} from '../controllers/propertyController.js';
import { streamPublicPropertyPhoto } from '../controllers/consignmentController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getProperties);
router.get('/admin', protect, requireAdmin, getAdminProperties);
router.get('/admin/archive', protect, requireAdmin, getClosedProperties);
router.get('/:id/photos/:photoId', streamPublicPropertyPhoto);
router.put('/:id', protect, requireAdmin, updateProperty);
router.get('/:id', getPropertyByIdOrSlug);
router.post('/', protect, requireAdmin, createProperty);
router.delete('/:id', protect, requireAdmin, deleteProperty);

export default router;
