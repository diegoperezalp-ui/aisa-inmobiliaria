import { Router } from 'express';
import {
  addRepair,
  createPreparation,
  getPreparations,
  promotePreparation,
  updatePreparation,
  updateRepair
} from '../controllers/preparationController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(protect, requireAdmin);
router.get('/', getPreparations);
router.post('/', createPreparation);
router.put('/:id', updatePreparation);
router.post('/:id/repairs', addRepair);
router.patch('/:id/repairs/:repairId', updateRepair);
router.post('/:id/promote', promotePreparation);

export default router;
