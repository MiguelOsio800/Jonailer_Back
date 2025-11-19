import express from 'express';
// 1. IMPORTA LAS NUEVAS FUNCIONES
import {
    getVehicles, createVehicle, updateVehicle, deleteVehicle,
    dispatchVehicle, finalizeTrip, assignInvoicesToVehicle, unassignInvoiceFromVehicle 
} from '../controllers/vehicle.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // Todas las rutas de vehículos están protegidas

router.route('/')
    .get(authorize('flota.view'), getVehicles)
    .post(authorize('flota.create'), createVehicle);

router.route('/:id')
    .put(authorize('flota.edit'), updateVehicle)
    .delete(authorize('flota.delete'), deleteVehicle);

// 2. AÑADE LAS NUEVAS RUTAS
router.route('/:vehicleId/assign-invoices')
    .post(authorize('flota.edit'), assignInvoicesToVehicle);

router.route('/:vehicleId/unassign-invoice')
    .post(authorize('flota.edit'), unassignInvoiceFromVehicle);
    
router.route('/:id/dispatch')
    .post(authorize('flota.dispatch'), dispatchVehicle);

router.route('/:id/finalize-trip')
    .post(authorize('flota.dispatch'), finalizeTrip);

export default router;