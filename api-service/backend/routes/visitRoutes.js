import { Router } from 'express';
import { createAdminVisit, createVisit, getVisits, updateVisitStatus } from '../controllers/visitController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Las solicitudes deben quedar asociadas a la cuenta del cliente.
router.post('/', rateLimit({ limit: 10, windowMs: 60 * 60 * 1000 }), protect, createVisit);
router.post('/admin', rateLimit({ limit: 60, windowMs: 60 * 60 * 1000 }), protect, requireAdmin, createAdminVisit);

// Ver visitas (autenticado)
router.get('/', protect, getVisits);

// Actualizar estado de visita (Admin)
router.patch('/:id/status', protect, requireAdmin, updateVisitStatus);

export default router;
