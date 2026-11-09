import { Router } from 'express';
import {
  getProperties,
  getAdminProperties,
  getPropertyByIdOrSlug,
  createProperty,
  deleteProperty,
  updateProperty
} from '../controllers/propertyController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getProperties);
router.get('/admin', protect, requireAdmin, getAdminProperties);
router.put('/:id', protect, requireAdmin, updateProperty);
router.get('/:id', getPropertyByIdOrSlug);
router.post('/', protect, requireAdmin, createProperty);
router.delete('/:id', protect, requireAdmin, deleteProperty);

export default router;
