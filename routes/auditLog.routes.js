import express from 'express';
import { getAuditLogs, createAuditLog } from '../controllers/auditLog.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('auditoria.view'), getAuditLogs)
    .post(createAuditLog); // Cualquier usuario logueado puede crear un registro

export default router;