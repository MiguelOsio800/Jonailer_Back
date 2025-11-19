import express from 'express';
import * as productController from '../controllers/product.controller.js';
// CAMBIO: Usamos los nombres correctos de las funciones: protect y authorize
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// CAMBIO: Usamos las funciones y el formato de permisos correctos
router.get('/', [protect, authorize('configuracion.view')], productController.getAllProducts);
router.post('/', [protect, authorize('configuracion.create')], productController.createProduct);
router.put('/:id', [protect, authorize('configuracion.edit')], productController.updateProduct);
router.delete('/:id', [protect, authorize('configuracion.delete')], productController.deleteProduct);

export default router;