import express from 'express';
import * as cuentaContableController from '../controllers/cuentaContable.controller.js';
// CAMBIO: Usamos los nombres correctos de las funciones: protect y authorize
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// CAMBIO: Usamos las funciones y el formato de permisos correctos
router.get('/', [protect, authorize('configuracion.view')], cuentaContableController.getAllCuentasContables);
router.get('/:id', [protect, authorize('configuracion.view')], cuentaContableController.getCuentaContableById);
router.post('/', [protect, authorize('configuracion.create')], cuentaContableController.createCuentaContable); // Asumimos un permiso 'create'
router.put('/:id', [protect, authorize('configuracion.edit')], cuentaContableController.updateCuentaContable); // Asumimos un permiso 'edit'
router.delete('/:id', [protect, authorize('configuracion.delete')], cuentaContableController.deleteCuentaContable); // Asumimos un permiso 'delete'

export default router;