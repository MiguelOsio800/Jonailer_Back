import express from 'express';
import { 
    getExpenseCategories, 
    createExpenseCategory, 
    updateExpenseCategory, 
    deleteExpenseCategory 
} from '../controllers/expenseCategory.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Usamos el permiso general del libro contable para gestionar sus categorías
router.route('/')
    .get(authorize('libro-contable.view'), getExpenseCategories)
    .post(authorize('libro-contable.create'), createExpenseCategory);

router.route('/:id')
    .put(authorize('libro-contable.edit'), updateExpenseCategory)
    .delete(authorize('libro-contable.delete'), deleteExpenseCategory);

export default router;