import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('proveedores.view'), getSuppliers)
    .post(authorize('proveedores.create'), createSupplier);

router.route('/:id')
    .put(authorize('proveedores.edit'), updateSupplier)
    .delete(authorize('proveedores.delete'), deleteSupplier);

export default router;