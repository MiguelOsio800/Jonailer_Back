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

        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalPackages = invoices.reduce((sum, inv) => 
            sum + (inv.guide?.merchandise?.reduce((p, m) => p + (m.quantity || 0), 0) || 0), 0);
        const totalWeight = invoices.reduce((sum, inv) =>
            sum + (inv.guide?.merchandise?.reduce((p, m) => p + ((m.weight || 0) * (m.quantity || 0)), 0) || 0), 0);

        // 👇 CÁLCULO CORREGIDO (30% para remesas normales)
        let cooperativeAmount = 0;
        
        invoices.forEach(inv => {
            const tipo = (inv.shippingType || '').toLowerCase();
            const montoFactura = inv.totalAmount || 0;

            if (tipo.includes('franquicia') || tipo.includes('expreso') || tipo.includes('mudanza')) {
                // 15% para la cooperativa
                cooperativeAmount += montoFactura * 0.15;
            } else if (tipo.includes('no asociado')) {
                // 30% para la cooperativa
                cooperativeAmount += montoFactura * 0.30;
            } else {
                // Remesa normal: 30% para la cooperativa (CORREGIDO)
                cooperativeAmount += montoFactura * 0.30;
            }
        });

        const newRemesa = await Remesa.create({
            ...req.body,
            id: `rem-${Date.now()}`,
            remesaNumber: `REM-${Date.now().toString().slice(-6)}`,
            totalAmount,
            cooperativeAmount, // <-- Guardamos la ganancia aquí
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
    const t = await sequelize.transaction(); // Iniciar transacción segura

    try {
        // 1. Busca la remesa
        const remesa = await Remesa.findByPk(remesaId, { transaction: t });
        if (!remesa) {
            await t.rollback();
            return res.status(404).json({ message: 'Remesa no encontrada' });
        }

        const vehicle = await Vehicle.findByPk(remesa.vehicleId, { transaction: t });

        // 2. CORRECCIÓN CRÍTICA: Liberar las facturas de forma segura
        // Buscamos directamente por remesaId en la tabla Invoices
        await Invoice.update(
            {
                shippingStatus: 'Por Procesar', // O 'Pendiente para Despacho' según lo manejes
                remesaId: null,
                vehicleId: null // Opcional, pero recomendado: quita la factura del camión para que esté 100% libre
            },
            { 
                where: { remesaId: remesa.id }, 
                transaction: t 
            }
        );

        // 3. Cambia el estado del vehículo a 'Disponible'
        if (vehicle) {
            await vehicle.update({ status: 'Disponible' }, { transaction: t });
        }

        // 4. Elimina el registro de la remesa
        await remesa.destroy({ transaction: t });

        // Confirma los cambios en la BD
        await t.commit();
        if (vehicle) await vehicle.reload();

        res.status(200).json({
            message: 'Remesa anulada con éxito. Las facturas han sido liberadas para ser usadas nuevamente.',
            updatedVehicle: vehicle
        });

    } catch (error) {
        await t.rollback();
        console.error('Error al eliminar la remesa:', error);
        res.status(500).json({ message: 'Error al eliminar la remesa', error: error.message });
    }
};