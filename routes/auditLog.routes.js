import express from 'express';
import { 
    getAuditLogs, 
    createAuditLog, 
    reportError // <--- Importa la nueva función
} from '../controllers/auditLog.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Ruta para reportar errores técnicos desde el frontend
router.post('/report-error', reportError); 

router.route('/')
    .get(authorize('auditoria.view'), getAuditLogs)
    .post(createAuditLog);

export default router;