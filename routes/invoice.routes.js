import express from 'express';
// Se corrige la importación para tener solo una línea con todas las funciones necesarias
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, sendInvoiceToTheFactory } from '../controllers/invoice.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('invoices.view'), getInvoices)
    .post(authorize('invoices.create'), createInvoice);

router.route('/:id')
    .put(authorize('invoices.edit', 'invoices.changeStatus'), updateInvoice)
    .delete(authorize('invoices.delete'), deleteInvoice);

// --- RUTA NUEVA AÑADIDA AQUÍ ---
// Esta es la ruta que el frontend llamará para enviar la factura a HKA
router.route('/:id/send-to-hka')
    .post(authorize('invoices.create'), sendInvoiceToTheFactory);

export default router;