import { Remesa, Invoice, Vehicle, sequelize } from '../models/index.js';

export const getRemesas = async (req, res) => {
    try {
        const remesas = await Remesa.findAll({ order: [['date', 'DESC']] });
        res.json(remesas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener remesas', error: error.message });
    }
};

export const createRemesa = async (req, res) => {
    const { vehicleId, invoiceIds } = req.body;
    const t = await sequelize.transaction();
    try {
        const invoices = await Invoice.findAll({ where: { id: invoiceIds }, transaction: t });
        if (invoices.length !== invoiceIds.length) {
            throw new Error('Una o más facturas no fueron encontradas.');
        }

        // --- CÁLCULOS CORREGIDOS ---
        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalPackages = invoices.reduce((sum, inv) => 
            sum + (inv.guide?.merchandise?.reduce((p, m) => p + (m.quantity || 0), 0) || 0), 0);
        const totalWeight = invoices.reduce((sum, inv) =>
            sum + (inv.guide?.merchandise?.reduce((p, m) => p + ((m.weight || 0) * (m.quantity || 0)), 0) || 0), 0);

        const newRemesa = await Remesa.create({
            ...req.body,
            id: `rem-${Date.now()}`,
            remesaNumber: `REM-${Date.now().toString().slice(-6)}`,
            totalAmount,
            totalPackages,
            totalWeight
        }, { transaction: t });

        await Invoice.update(
            { remesaId: newRemesa.id },
            { where: { id: invoiceIds }, transaction: t }
        );

        await t.commit();
        res.status(201).json(newRemesa);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error al crear la remesa', error: error.message });
    }
};

export const deleteRemesa = async (req, res) => {
    const { id: remesaId } = req.params;
    const t = await sequelize.transaction(); // Iniciar transacción

    try {
        // 1. Busca la remesa y sus facturas asociadas
        const remesa = await Remesa.findByPk(remesaId, { transaction: t });
        if (!remesa) {
            await t.rollback();
            return res.status(404).json({ message: 'Remesa no encontrada' });
        }

        const vehicle = await Vehicle.findByPk(remesa.vehicleId, { transaction: t });

        // 2. Para cada factura, revierte el estado y elimina las asociaciones
        if (remesa.invoiceIds && remesa.invoiceIds.length > 0) {
            await Invoice.update(
                {
                    shippingStatus: 'Pendiente para Despacho',
                    remesaId: null,
                    // No revertimos vehicleId aquí, porque las facturas siguen asignadas a ese vehículo,
                    // solo que aún no han salido a ruta.
                },
                { where: { id: remesa.invoiceIds }, transaction: t }
            );
        }

        // 3. Cambia el estado del vehículo a 'Disponible'
        if (vehicle) {
            await vehicle.update({ status: 'Disponible' }, { transaction: t });
        }

        // 4. Elimina el registro de la remesa
        await remesa.destroy({ transaction: t });

        // Confirma los cambios si todo fue exitoso
        await t.commit();

        // Prepara la respuesta final
        const updatedInvoices = await Invoice.findAll({ where: { id: remesa.invoiceIds } });
        if (vehicle) await vehicle.reload();

        res.status(200).json({
            message: 'Remesa eliminada. Facturas y vehículo revertidos a su estado anterior.',
            updatedInvoices,
            updatedVehicle: vehicle
        });

    } catch (error) {
        await t.rollback(); // Revierte todo si hay un error
        console.error('Error al eliminar la remesa:', error);
        res.status(500).json({ message: 'Error al eliminar la remesa', error: error.message });
    }
};