import express from 'express';
import { getOffices, createOffice, updateOffice, deleteOffice } from '../controllers/office.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
// Por ahora las dejamos públicas, luego añadiremos seguridad con protect y authorize
router.route('/')
    .get(authorize('offices.view'), getOffices)
    .post(authorize('offices.create'), createOffice);

router.route('/:id')
    .put(authorize('offices.edit'), updateOffice)
    .delete(authorize('offices.delete'), deleteOffice);

export default router;