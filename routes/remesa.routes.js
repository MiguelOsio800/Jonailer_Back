import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { getRemesas, createRemesa, deleteRemesa } from '../controllers/remesa.controller.js';

const router = express.Router();
router.use(protect); // Todas las rutas de remesas están protegidas

router.route('/')
    .get(authorize('remesas.view'), getRemesas)
    .post(authorize('remesas.create'), createRemesa);

router.route('/:id')
    .delete(authorize('remesas.delete'), deleteRemesa);

export default router;