import express from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} from '../controllers/client.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicamos el middleware de protección a todas las rutas de clientes
router.use(protect);

router.route('/')
    .get(authorize('clientes.view'), getClients)
    .post(authorize('clientes.create'), createClient);

router.route('/:id')
    .get(authorize('clientes.view'), getClientById)
    .put(authorize('clientes.edit'), updateClient)
    .delete(authorize('clientes.delete'), deleteClient);

export default router;