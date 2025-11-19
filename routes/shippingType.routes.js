import express from 'express';
import { getShippingTypes, createShippingType, updateShippingType, deleteShippingType } from '../controllers/shippingType.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('shipping-types.view'), getShippingTypes)
    .post(authorize('shipping-types.create'), createShippingType);

router.route('/:id')
    .put(authorize('shipping-types.edit'), updateShippingType)
    .delete(authorize('shipping-types.delete'), deleteShippingType);

export default router;