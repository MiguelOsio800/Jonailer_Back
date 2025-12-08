import { sequelize } from '../config/db.js';
import Dispatch from '../models/Dispatch.js';
import Invoice from '../models/Invoice.js';
import Vehicle from '../models/Vehicle.js';
import { generateUniqueId } from '../utils/idGenerator.js'; // Asumiendo que tiene una función para generar IDs
import { AuditLog } from '../middleware/audit.middleware.js'; // Asumiendo el middleware de auditoría

// Función para obtener todos los despachos (necesario para la vista 'Historial')
export const getAllDispatches = async (req, res) => {
    try {
        const dispatches = await Dispatch.findAll({
            order: [['date', 'DESC']]
        });
        res.status(200).json(dispatches);
    } catch (error) {
        console.error('Error al obtener despachos:', error);
        res.status(500).json({ message: 'Error al obtener despachos' });
    }
};


// 1. Lógica para crear un nuevo despacho
export const createDispatch = async (req, res) => {
    const { invoiceIds, vehicleId, destinationOfficeId } = req.body;
    const originOfficeId = req.user.officeId; // Asumiendo que el ID de la oficina de origen está en el token del usuario

    if (!invoiceIds || invoiceIds.length === 0 || !vehicleId || !destinationOfficeId || !originOfficeId) {
        return res.status(400).json({ message: 'Faltan datos requeridos para el despacho.' });
    }

    const t = await sequelize.transaction();

    try {
        const dispatchId = generateUniqueId('DSP'); // Generar un ID único para el despacho
        
        // 1. Crear el nuevo registro de Dispatch
        const newDispatch = await Dispatch.create({
            id: dispatchId,
            dispatchNumber: `${new Date().getFullYear()}${Math.floor(Math.random() * 90000) + 10000}`, // Número simple de ejemplo
            date: new Date().toISOString().split('T')[0],
            vehicleId,
            invoiceIds,
            originOfficeId,
            destinationOfficeId,
            status: 'En Tránsito',
        }, { transaction: t });

        // 2. Actualizar el estado de las Facturas (ShippingStatus)
        await Invoice.update(
            { shippingStatus: 'En Tránsito' },
            { 
                where: { id: invoiceIds, shippingStatus: 'Pendiente para Despacho', status: 'Activa' },
                transaction: t 
            }
        );

        // 3. Actualizar el estado del Vehículo a 'En Ruta'
        await Vehicle.update(
            { status: 'En Ruta', currentLoadKg: 0 }, // Reiniciar carga actual, asumiendo que se calcula al recibir
            { where: { id: vehicleId }, transaction: t }
        );
        
        await t.commit();
        
        // 4. Registrar en Auditoría
        await AuditLog(req.user.id, req.user.name, 'CREATE_DISPATCH', `Despacho ${newDispatch.dispatchNumber} creado con ${invoiceIds.length} encomiendas de ${originOfficeId} a ${destinationOfficeId}.`, newDispatch.id);

        res.status(201).json(newDispatch);

    } catch (error) {
        await t.rollback();
        console.error('Error al crear el despacho:', error);
        res.status(500).json({ message: 'Error en el servidor al crear el despacho.' });
    }
};


// 2. Lógica para recibir un despacho en la oficina de destino
export const receiveDispatch = async (req, res) => {
    const { dispatchId } = req.params;
    const { verifiedInvoiceIds } = req.body; // IDs de facturas recibidas
    const receivedBy = req.user.id;
    const receivedByName = req.user.name; // Nombre del usuario para el log
    const destinationOfficeId = req.user.officeId;
    const receivedDate = new Date().toISOString().split('T')[0];

    if (!verifiedInvoiceIds || !dispatchId) {
        return res.status(400).json({ message: 'Faltan datos: ID del despacho o lista de facturas recibidas.' });
    }

    const t = await sequelize.transaction();

    try {
        const dispatch = await Dispatch.findByPk(dispatchId);

        if (!dispatch || dispatch.destinationOfficeId !== destinationOfficeId) {
            return res.status(404).json({ message: 'Despacho no encontrado o no destinado a esta oficina.' });
        }
        
        if (dispatch.status === 'Recibido') {
            return res.status(409).json({ message: 'El despacho ya fue recibido previamente.' });
        }

        const allDispatchInvoices = dispatch.invoiceIds;
        const missingInvoiceIds = allDispatchInvoices.filter(id => !verifiedInvoiceIds.includes(id));

        // 1. Actualizar el Dispatch
        await dispatch.update({
            status: 'Recibido',
            receivedDate,
            receivedBy,
        }, { transaction: t });

        // 2. Procesar Facturas Recibidas (Actualizar a 'En Oficina Destino')
        if (verifiedInvoiceIds.length > 0) {
             await Invoice.update(
                { shippingStatus: 'En Oficina Destino' },
                { where: { id: verifiedInvoiceIds, status: 'Activa' }, transaction: t }
            );
        }

        // 3. Procesar Facturas Faltantes (Actualizar a 'Reportada Falta')
        if (missingInvoiceIds.length > 0) {
            await Invoice.update(
                { shippingStatus: 'Reportada Falta' },
                { where: { id: missingInvoiceIds, status: 'Activa' }, transaction: t }
            );
        }

        // 4. Actualizar el estado del Vehículo (Asumimos que debe estar en 'Disponible' después de la entrega)
        await Vehicle.update(
            { status: 'Disponible', currentLoadKg: 0 },
            { where: { id: dispatch.vehicleId }, transaction: t }
        );

        await t.commit();
        
        // 5. Registrar en Auditoría
        await AuditLog(receivedBy, receivedByName, 'RECEIVE_DISPATCH', `Despacho ${dispatch.dispatchNumber} recibido en ${destinationOfficeId}. Recibidas: ${verifiedInvoiceIds.length}, Faltantes: ${missingInvoiceIds.length}.`, dispatch.id);

        res.status(200).json({ message: 'Despacho recibido y facturas actualizadas con éxito.', received: verifiedInvoiceIds.length, missing: missingInvoiceIds.length });

    } catch (error) {
        await t.rollback();
        console.error('Error al recibir el despacho:', error);
        res.status(500).json({ message: 'Error en el servidor al recibir el despacho.' });
    }
};

// ... export other utility functions for Dispatch if needed (e.g., getOne, delete)