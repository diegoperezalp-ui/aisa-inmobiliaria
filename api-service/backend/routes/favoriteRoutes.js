import { Router } from 'express';
import { toggleFavorite, getMyFavorites } from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/my', protect, getMyFavorites);
router.post('/toggle/:propertyId', protect, toggleFavorite);

export default router;
