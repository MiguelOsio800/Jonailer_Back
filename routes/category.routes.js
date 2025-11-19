import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('categories.view'), getCategories)
    .post(authorize('categories.create'), createCategory);

router.route('/:id')
    .put(authorize('categories.edit'), updateCategory)
    .delete(authorize('categories.delete'), deleteCategory);

export default router;