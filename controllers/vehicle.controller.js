import { Vehicle, Invoice, Remesa, sequelize, Certificado } from '../models/index.js';

// --- CRUD Básico para Vehículos ---

// @desc    Obtener vehículos (filtrados si es asociado)
export const getVehicles = async (req, res) => {
    try {
        const whereClause = {};

        // 👇 SI EL USUARIO ES ASOCIADO, FILTRAMOS SOLO SUS VEHÍCULOS
        // req.user viene del middleware 'protect'
        if (req.user && req.user.asociadoId) {
            whereClause.asociadoId = req.user.asociadoId;
        }

        const vehicles = await Vehicle.findAll({ 
            where: whereClause, // Aplicamos el filtro
            order: [['modelo', 'ASC']] 
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener vehículos', error: error.message });
    }
};

export const createVehicle = async (req, res) => {
    // 1. Extraemos los campos mínimos indispensables
    const { placa, modelo } = req.body;
    
    // 2. Lógica de "Matrimonio" con el Asociado:
    // Prioridad 1: Si el ID viene explícitamente en el cuerpo del JSON (body)
    // Prioridad 2: Si no viene, lo tomamos del token del usuario autenticado (si es un asociado)
    let finalAsociadoId = req.body.asociadoId;

    if (!finalAsociadoId && req.user && req.user.asociadoId) {
        finalAsociadoId = req.user.asociadoId;
    }

    // 3. Validación estricta de pertenencia
    if (!finalAsociadoId) {
        return res.status(400).json({ 
            message: 'El vehículo debe estar vinculado a un asociado (asociadoId no encontrado).' 
        });
    }

    // 4. Validación de datos mínimos requeridos por el modelo
    if (!placa || !modelo) {
        return res.status(400).json({ 
            message: 'Faltan campos requeridos: placa y modelo son obligatorios.' 
        });
    }

    try {
        // 5. Creación del registro en la base de datos
        // Usamos el spread (...req.body) para capturar cualquier otro dato opcional (conductor, capacidad, etc.)
        const newVehicle = await Vehicle.create({ 
            ...req.body,
            id: `v-${Date.now()}`, // Generación de ID interno
            asociadoId: finalAsociadoId, // Aseguramos la relación con el socio
            status: req.body.status || 'Disponible' // Estado inicial automático
        });

        res.status(201).json(newVehicle);

    } catch (error) {
        console.error('Error al crear vehículo:', error);

        // Manejo específico si la placa ya existe (definida como unique en el modelo)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: 'Error: Ya existe un vehículo registrado con esa placa.' 
            });
        }

        res.status(500).json({ 
            message: 'Error interno al procesar el registro del vehículo', 
            error: error.message 
        });
    }
};

export const updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByPk(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });
        await vehicle.update(req.body);
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar vehículo', error: error.message });
    }
};

export const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await Vehicle.findByPk(id);
        
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehículo no encontrado' });
        }

        // 1. Borrado en cascada: Eliminamos los certificados vinculados al vehículo primero.
        // NOTA: Asegúrate de que tu modelo use 'vehiculoId'. Si tu modelo en BD usa 'vehicleId' (en inglés), cámbialo aquí.
        await Certificado.destroy({ 
            where: { vehiculoId: id } 
        });

        // 2. Ahora sí, eliminamos el vehículo
        await vehicle.destroy();
        
        res.json({ message: 'Vehículo y sus certificados eliminados correctamente' });

    } catch (error) {
        console.error('Error al eliminar vehículo:', error);
        
        // 3. Protección de base de datos estricta
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ 
                message: 'No se puede eliminar: Este vehículo ya tiene Facturas asignadas o Viajes (Remesas) guardados en el historial.' 
            });
        }
        res.status(500).json({ message: 'Error interno al eliminar el vehículo', error: error.message });
    }
};
// --- Lógica de Operaciones de Flota ---

/**
 * Asigna un grupo de facturas a un vehículo.
 * @route POST /api/vehicles/:vehicleId/assign-invoices
 */
export const assignInvoicesToVehicle = async (req, res) => {
    const { vehicleId } = req.params;
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ message: 'Se requiere un array de IDs de facturas (invoiceIds).' });
    }

    try {
        // 1. Actualiza las facturas en la base de datos
        const [updatedCount] = await Invoice.update(
            { vehicleId: vehicleId },
            { where: { id: invoiceIds } }
        );

        if (updatedCount === 0) {
             return res.status(404).json({ message: 'No se encontraron facturas con los IDs proporcionados para actualizar.' });
        }

        // 2. Busca las facturas recién actualizadas para obtener sus datos completos
        const updatedInvoices = await Invoice.findAll({
            where: { id: invoiceIds }
        });

        // 3. Envía la respuesta correcta que el frontend espera
        res.json({
            message: `${updatedCount} factura(s) asignada(s) correctamente.`,
            updatedInvoices: updatedInvoices // <-- Esta es la línea clave
        });

    } catch (error) {
        console.error("Error al asignar facturas:", error);
        res.status(500).json({ message: 'Error al asignar facturas al vehículo', error: error.message });
    }
};


/**
 * Desasigna una factura de un vehículo.
 * @route POST /api/vehicles/:vehicleId/unassign-invoice
 */
export const unassignInvoiceFromVehicle = async (req, res) => {
    const { invoiceId } = req.body;
    if (!invoiceId) {
        return res.status(400).json({ message: 'Se requiere el ID de la factura (invoiceId).' });
    }
    try {
        const [updatedCount] = await Invoice.update(
            { vehicleId: null },
            { where: { id: invoiceId } }
        );

        if (updatedCount > 0) {
            res.json({ message: 'Factura desasignada correctamente.' });
        } else {
            res.status(404).json({ message: 'No se encontró la factura especificada.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al desasignar la factura', error: error.message });
    }
};

/**
 * Marca un vehículo como 'En Ruta' y sus facturas como 'En Tránsito'.
 * @route POST /api/vehicles/:id/dispatch
 */
export const dispatchVehicle = async (req, res) => {
    const { id: vehicleId } = req.params;
    const t = await sequelize.transaction();
    try {
        const invoicesToDispatch = await Invoice.findAll({
            where: { vehicleId, shippingStatus: 'Pendiente para Despacho' },
            transaction: t
        });
        
        if (invoicesToDispatch.length === 0) {
            await t.rollback();
            return res.status(404).json({ message: 'No se encontraron facturas pendientes para despachar en este vehículo.' });
        }
        
        const invoiceIds = invoicesToDispatch.map(inv => inv.id);
        const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
        
        if (!vehicle) {
            await t.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        // 👇 NUEVA LÓGICA DE CÁLCULO
        let cooperativeAmount = 0;
        invoicesToDispatch.forEach(inv => {
            const tipo = (inv.shippingType || '').toLowerCase();
            const montoFactura = inv.totalAmount || 0;

            if (tipo.includes('franquicia') || tipo.includes('expreso') || tipo.includes('mudanza')) {
                cooperativeAmount += montoFactura * 0.15;
            } else if (tipo.includes('no asociado')) {
                cooperativeAmount += montoFactura * 0.30;
            } else {
                cooperativeAmount += montoFactura * 0.70;
            }
        });

        // CREACIÓN DE LA REMESA
        const newRemesa = await Remesa.create({
            id: `rem-${Date.now()}`,
            remesaNumber: `REM-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            asociadoId: vehicle.asociadoId,
            vehicleId,
            invoiceIds,
            totalAmount: invoicesToDispatch.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
            cooperativeAmount, // <-- Guardamos la ganancia de la cooperativa aquí
            totalPackages: invoicesToDispatch.reduce((sum, inv) => sum + (inv.guide?.merchandise?.reduce((p, m) => p + (m.quantity || 0), 0) || 0), 0),
            totalWeight: invoicesToDispatch.reduce((sum, inv) => sum + (inv.guide?.merchandise?.reduce((p, m) => p + ((m.weight || 0) * (m.quantity || 0)), 0) || 0), 0),
        }, { transaction: t });

        // ... (El resto de tu función dispatchVehicle queda igual: actualiza facturas, vehículo y hace commit)
        await Invoice.update(
            { shippingStatus: 'En Tránsito', remesaId: newRemesa.id },
            { where: { id: invoiceIds }, transaction: t }
        );
        await vehicle.update({ status: 'En Ruta' }, { transaction: t });
        await t.commit();
        
        const updatedInvoices = await Invoice.findAll({ where: { id: invoiceIds } });
        await vehicle.reload();
        
        res.status(200).json({
            message: `Vehículo ${vehicle.placa} despachado con la remesa ${newRemesa.remesaNumber}.`,
            newRemesa,
            updatedInvoices,
            updatedVehicle: vehicle
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al despachar el vehículo:', error);
        res.status(500).json({ message: 'Error al despachar el vehículo', error: error.message });
    }
};

/**
 * Finaliza el viaje, marca las facturas como 'Entregada' y libera el vehículo.
 * @route POST /api/vehicles/:id/finalize-trip
 */
export const finalizeTrip = async (req, res) => {
    const { id: vehicleId } = req.params;
    const t = await sequelize.transaction();
    try {
        const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
        if (!vehicle) {
            await t.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }
        await vehicle.update({ status: 'Disponible' }, { transaction: t });
        await Invoice.update(
            { shippingStatus: 'Entregada', vehicleId: null },
            { where: { vehicleId }, transaction: t }
        );
        await t.commit();
        res.json({ message: `Viaje del vehículo ${vehicle.placa} finalizado.` });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error al finalizar el viaje', error: error.message });
    }
};