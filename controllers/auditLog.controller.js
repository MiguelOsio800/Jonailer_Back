import { AuditLog } from '../models/index.js';
import { generateUniqueId } from '../utils/idGenerator.js';

// @desc    Obtener todos los registros de auditoría
// @route   GET /api/audit-logs
export const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({ 
            order: [['timestamp', 'DESC']],
            limit: 1000 // Limitamos para no sobrecargar
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los registros de auditoría', error: error.message });
    }
};

// @desc    Crear un nuevo registro de auditoría
// @route   POST /api/audit-logs
export const createAuditLog = async (req, res) => {
    const { userId, userName, action, details, targetId } = req.body;
    if (!userId || !userName || !action || !details) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para el registro de auditoría.' });
    }
    try {
        const newLog = await AuditLog.create({
            id: `log-${Date.now()}`,
            timestamp: new Date(),
            userId,
            userName,
            action,
            details,
            targetId,
        });
        res.status(201).json(newLog);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el registro de auditoría', error: error.message });
    }
};

export const logAppError = async (req, res) => {
    try {
        const { error, stack, component } = req.body;
        
        await AuditLog.create({
            id: generateUniqueId('ERR'), // Ahora funcionará porque ya está importada
            userId: req.user ? req.user.id : 'anonymous',
            action: 'ERROR_APLICACION',
            details: `Error en ${component}: ${error} | Stack: ${stack}`,
            ipAddress: req.ip
        });

        res.status(200).json({ message: 'Error registrado en auditoría' });
    } catch (err) {
        console.error('Error al guardar reporte de error del front:', err);
        res.status(500).json({ message: 'Error al registrar auditoría' });
    }
};

export const reportError = async (req, res) => {
    try {
        const { message, stack, componentStack, url } = req.body;

        await AuditLog.create({
            id: generateUniqueId('ERR'),
            timestamp: new Date(),
            userId: req.user.id,
            userName: req.user.name,
            action: 'FRONTEND_ERROR',
            details: `Error en cliente: ${message}. URL: ${url}`,
            targetId: 'SYSTEM',
            // Si tu modelo lo permite, puedes guardar el stack en un campo de metadatos
        });

        res.status(200).json({ message: 'Error reportado con éxito' });
    } catch (error) {
        console.error('Error al guardar reporte de error del front:', error);
        res.status(500).json({ message: 'Error interno al procesar el reporte' });
    }
};