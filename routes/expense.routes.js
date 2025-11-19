import express from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('libro-contable.view'), getExpenses)
    .post(authorize('libro-contable.create'), createExpense);

router.route('/:id')
    .put(authorize('libro-contable.edit'), updateExpense)
    .delete(authorize('libro-contable.delete'), deleteExpense);

export default router;