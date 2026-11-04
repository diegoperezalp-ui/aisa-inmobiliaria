import { Router } from 'express';
import { createVisit, getVisits, updateVisitStatus } from '../controllers/visitController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Las solicitudes deben quedar asociadas a la cuenta del cliente.
router.post('/', protect, createVisit);

// Ver visitas (autenticado)
router.get('/', protect, getVisits);

// Actualizar estado de visita (Admin)
router.patch('/:id/status', protect, requireAdmin, updateVisitStatus);

export default router;
