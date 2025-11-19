import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
    getAsociados, createAsociado, updateAsociado, deleteAsociado,
    getCertificados, createCertificado, updateCertificado, deleteCertificado,
    getPagos, createPago, deletePago,
    getRecibos, createRecibo
} from '../controllers/asociado.controller.js';

const router = express.Router();

// Todas las rutas de este archivo requerirán que el usuario esté autenticado.
router.use(protect);

// Rutas para Asociados
router.route('/')
    .get(authorize('asociados.view'), getAsociados)
    .post(authorize('asociados.create'), createAsociado);

router.route('/:id')
    .put(authorize('asociados.edit'), updateAsociado)
    .delete(authorize('asociados.delete'), deleteAsociado);

// Rutas para Certificados
router.route('/certificados')
    .get(authorize('asociados.view'), getCertificados)
    .post(authorize('asociados.edit'), createCertificado); // Se necesita permiso de edición de asociado para manejar certificados

router.route('/certificados/:id')
    .put(authorize('asociados.edit'), updateCertificado)
    .delete(authorize('asociados.edit'), deleteCertificado);

// Rutas para Pagos y Recibos
router.route('/pagos')
    .get(authorize('asociados.view'), getPagos)
    .post(authorize('asociados.edit'), createPago); // Permiso de edición para añadir deudas

router.route('/pagos/:id')
    .delete(authorize('asociados.pagos.delete'), deletePago); // Permiso específico para borrar deudas

router.route('/recibos')
    .get(authorize('asociados.view'), getRecibos)
    .post(authorize('asociados.edit'), createRecibo); // Permiso de edición para registrar pagos

export default router;