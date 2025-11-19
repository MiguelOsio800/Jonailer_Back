// routes/companyInfo.routes.js

import express from 'express';
// Importa la nueva función del controlador
import { getCompanyInfo, updateCompanyInfo, getLatestBcvRate } from '../controllers/companyInfo.controller.js'; 
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Ruta pública para obtener info de la empresa (pantalla de login)
router.get('/', getCompanyInfo);

// Rutas protegidas
router.put('/', protect, authorize('config.company.edit'), updateCompanyInfo);

// Añade esta nueva ruta para actualizar la tasa
router.get('/bcv-rate', protect, authorize('config.company.edit'), getLatestBcvRate);

export default router;