import express from 'express';
import { 
    getAssetCategories, 
    createAssetCategory, 
    updateAssetCategory, 
    deleteAssetCategory 
} from '../controllers/assetCategory.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('bienes-categorias.view'), getAssetCategories)
    .post(authorize('bienes-categorias.create'), createAssetCategory);

router.route('/:id')
    .put(authorize('bienes-categorias.edit'), updateAssetCategory)
    .delete(authorize('bienes-categorias.delete'), deleteAssetCategory);

export default router;