import express from 'express';
// Se corrige la importación para tener solo una línea con todas las funciones necesarias
// IMPORTANTE: Agregamos las nuevas funciones al import
import { 
    getInvoices, 
    createInvoice, 
    updateInvoice, 
    deleteInvoice, 
    sendInvoiceToTheFactory,
    createCreditNote, // <--- Nuevo
    createDebitNote,   // <--- Nuevo
    downloadInvoiceFile // <--- Nuevo
} from '../controllers/invoice.controller.js';
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

// --- RUTAS HKA NUEVAS ---

// Nueva Ruta: Nota de Crédito (Anular)
router.route('/:id/credit-note')
    .post(authorize('invoices.void'), createCreditNote); // Usamos permiso de anular ('invoices.void')

// Nueva Ruta: Nota de Débito
router.route('/:id/debit-note')
    .post(authorize('invoices.create'), createDebitNote);

router.route('/:id/download-hka')
    .post(authorize('invoices.view'), downloadInvoiceFile);

export default router;