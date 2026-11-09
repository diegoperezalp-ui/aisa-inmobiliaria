import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import { previewOrImportProperties } from '../controllers/propertyImportController.js';

const router = Router();
router.post('/import', protect, requireAdmin, (req, res, next) => {
  Promise.resolve(previewOrImportProperties(req, res)).catch(next);
});
export default router;

