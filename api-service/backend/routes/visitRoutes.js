import { Router } from 'express';
import { createVisit, getVisits, updateVisitStatus } from '../controllers/visitController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Agendar visita (público o autenticado)
router.post('/', (req, res, next) => {
  // Opcional auth: si hay token lo procesamos
  if (req.headers.authorization) {
    return protect(req, res, () => createVisit(req, res));
  }
  return createVisit(req, res);
});

// Ver visitas (autenticado)
router.get('/', protect, getVisits);

// Actualizar estado de visita (Admin)
router.patch('/:id/status', protect, requireAdmin, updateVisitStatus);

export default router;
