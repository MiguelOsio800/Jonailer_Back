import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
    getAsociados, createAsociado, updateAsociado, deleteAsociado,
    getCertificados, createCertificado, updateCertificado, deleteCertificado,
    getPagos, createPago, deletePago,
    getRecibos, createRecibo,
    // Importamos las nuevas funciones necesarias para resolver el 404
    getDeudasByAsociado, getCertificadosByAsociado 
} from '../controllers/asociado.controller.js';

const router = express.Router();

router.use(protect);

// --- Rutas de Asociados ---
router.route('/')
    .get(authorize('asociados.view'), getAsociados)
    .post(authorize('asociados.create'), createAsociado);

router.route('/:id')
    .put(authorize('asociados.edit'), updateAsociado)
    .delete(authorize('asociados.delete'), deleteAsociado);

// 👇 ESTAS SON LAS RUTAS QUE FALTAN Y DAN ERROR 404
router.get('/:id/deudas', authorize('asociados.view'), getDeudasByAsociado);
router.get('/:id/certificados', authorize('asociados.view'), getCertificadosByAsociado);

// --- Rutas Generales de Certificados, Pagos y Recibos ---
router.route('/certificados')
    .get(authorize('asociados.view'), getCertificados)
    .post(authorize('asociados.edit'), createCertificado);

router.route('/certificados/:id')
    .put(authorize('asociados.edit'), updateCertificado)
    .delete(authorize('asociados.edit'), deleteCertificado);

router.route('/pagos')
    .get(authorize('asociados.view'), getPagos)
    .post(authorize('asociados.edit'), createPago);

router.route('/pagos/:id')
    .delete(authorize('asociados.pagos.delete'), deletePago);

router.route('/recibos')
    .get(authorize('asociados.view'), getRecibos)
    .post(authorize('asociados.edit'), createRecibo);

export default router;