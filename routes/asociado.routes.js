import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
    getAsociados, createAsociado, updateAsociado, deleteAsociado,
    getCertificados, createCertificado, updateCertificado, deleteCertificado,
    getPagos, createPago, deletePago,
    getRecibos, createRecibo,
    // Nuevas funciones que debemos añadir al controlador
    getDeudasByAsociado,
    getCertificadosByAsociado
} from '../controllers/asociado.controller.js';

const router = express.Router();

router.use(protect);

// --- Rutas de Asociados (Básicas) ---
router.route('/')
    .get(authorize('asociados.view'), getAsociados)
    .post(authorize('asociados.create'), createAsociado);

// --- NUEVAS RUTAS ESPECÍFICAS (Resuelve el 404 de dcruz) ---
// Estas deben ir antes de /:id para que Express las reconozca correctamente
router.get('/:id/deudas', authorize('asociados.view'), getDeudasByAsociado);
router.get('/:id/certificados', authorize('asociados.view'), getCertificadosByAsociado);

router.route('/:id')
    .put(authorize('asociados.edit'), updateAsociado)
    .delete(authorize('asociados.delete'), deleteAsociado);

// --- Rutas de Certificados Generales ---
router.route('/certificados')
    .get(authorize('asociados.view'), getCertificados)
    .post(authorize('asociados.edit'), createCertificado);

router.route('/certificados/:id')
    .put(authorize('asociados.edit'), updateCertificado)
    .delete(authorize('asociados.edit'), deleteCertificado);

// --- Rutas de Pagos y Recibos ---
router.route('/pagos')
    .get(authorize('asociados.view'), getPagos)
    .post(authorize('asociados.edit'), createPago);

router.route('/pagos/:id')
    .delete(authorize('asociados.pagos.delete'), deletePago);

router.route('/recibos')
    .get(authorize('asociados.view'), getRecibos)
    .post(authorize('asociados.edit'), createRecibo);

export default router;