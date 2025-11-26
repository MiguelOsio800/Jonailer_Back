import { Vehicle, Invoice, Remesa, sequelize } from '../models/index.js';

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
    const { asociadoId, placa, modelo, capacidadCarga } = req.body;
    if (!asociadoId || !placa || !modelo || !capacidadCarga) {
        return res.status(400).json({ 
            message: 'Faltan campos obligatorios. Asegúrese de proporcionar asociado, placa, modelo y capacidad de carga.' 
        });
    }
    try {
        const newVehicle = await Vehicle.create({ 
            id: `v-${Date.now()}`, 
            ...req.body 
        });
        res.status(201).json(newVehicle);
    } catch (error) {
        console.error('Error al crear vehículo:', error); 
        res.status(500).json({ message: 'Error al crear vehículo', error: error.message });
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
        const vehicle = await Vehicle.findByPk(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehículo no encontrado' });
        await vehicle.destroy();
        res.json({ message: 'Vehículo eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar vehículo', error: error.message });
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
        const newRemesa = await Remesa.create({
            id: `rem-${Date.now()}`,
            remesaNumber: `REM-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            asociadoId: vehicle.asociadoId,
            vehicleId,
            invoiceIds,
            totalAmount: invoicesToDispatch.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
            totalPackages: invoicesToDispatch.reduce((sum, inv) => sum + (inv.guide?.merchandise?.reduce((p, m) => p + (m.quantity || 0), 0) || 0), 0),
            totalWeight: invoicesToDispatch.reduce((sum, inv) => sum + (inv.guide?.merchandise?.reduce((p, m) => p + ((m.weight || 0) * (m.quantity || 0)), 0) || 0), 0),
        }, { transaction: t });
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