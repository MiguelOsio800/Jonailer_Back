import { AuditLog } from '../models/index.js';

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