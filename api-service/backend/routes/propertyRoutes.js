import { Router } from 'express';
import {
  getProperties,
  getPropertyByIdOrSlug,
  createProperty,
  deleteProperty
} from '../controllers/propertyController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getProperties);
router.get('/:id', getPropertyByIdOrSlug);
router.post('/', protect, requireAdmin, createProperty);
router.delete('/:id', protect, requireAdmin, deleteProperty);

export default router;
