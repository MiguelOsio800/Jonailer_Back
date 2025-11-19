import express from 'express';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../controllers/asset.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('inventario-bienes.view'), getAssets)
    .post(authorize('inventario-bienes.create'), createAsset);

router.route('/:id')
    .put(authorize('inventario-bienes.edit'), updateAsset)
    .delete(authorize('inventario-bienes.delete'), deleteAsset);

export default router;