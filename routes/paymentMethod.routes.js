import express from 'express';
import { getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from '../controllers/paymentMethod.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('payment-methods.view'), getPaymentMethods)
    .post(authorize('payment-methods.create'), createPaymentMethod);

router.route('/:id')
    .put(authorize('payment-methods.edit'), updatePaymentMethod)
    .delete(authorize('payment-methods.delete'), deletePaymentMethod);

export default router;