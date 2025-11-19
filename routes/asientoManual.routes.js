import express from 'express';
import * as asientoManualController from '../controllers/asientoManual.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('libro-contable.view'), asientoManualController.getAsientosManuales)
    .post(authorize('libro-contable.create'), asientoManualController.createAsientoManual);

router.route('/:id')
    .delete(authorize('libro-contable.delete'), asientoManualController.deleteAsientoManual);

export default router;