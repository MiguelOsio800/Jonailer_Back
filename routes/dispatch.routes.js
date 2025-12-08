import express from 'express';
import { createDispatch, receiveDispatch, getAllDispatches } from '../controllers/dispatch.controller.js';
import { protect } from '../middleware/auth.middleware.js'; // Asumiendo middleware de autenticación

const router = express.Router();

// Rutas para Despachos
router.get('/', protect, getAllDispatches);
router.post('/', protect, createDispatch);
router.post('/receive/:dispatchId', protect, receiveDispatch);

export default router;