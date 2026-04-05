import { Remesa, Invoice, Vehicle, Asociado, sequelize } from '../models/index.js';

export const getRemesas = async (req, res) => {
    try {
        const remesas = await Remesa.findAll({ order: [['date', 'DESC']] });
        res.json(remesas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener remesas', error: error.message });
    }
};

export const createRemesa = async (req, res) => {
    // ⚠️ Importante: Recibimos asociadoId y exchangeRate del frontend
    const { vehicleId, invoiceIds, exchangeRate, asociadoId } = req.body; 
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

        let cooperativeAmount = 0;
        
        invoices.forEach(inv => {
            const tipo = (inv.shippingType || '').toLowerCase();
            const montoFactura = inv.totalAmount || 0;

            if (tipo.includes('franquicia') || tipo.includes('expreso') || tipo.includes('mudanza')) {
                cooperativeAmount += montoFactura * 0.15;
            } else if (tipo.includes('no asociado')) {
                cooperativeAmount += montoFactura * 0.30;
            } else {
                cooperativeAmount += montoFactura * 0.30;
            }
        });

        // 1. Buscamos la info del socio
        if (!asociadoId) {
             throw new Error('El asociadoId es requerido para generar el número de remesa.');
        }
        const asociado = await Asociado.findByPk(asociadoId, { transaction: t });
        
        // 2. Extraemos SOLO el primer nombre y lo pasamos a MAYÚSCULAS
        let firstName = 'SOCIO';
        if (asociado && asociado.name) {
            firstName = asociado.name.split(' ')[0].toUpperCase(); 
        }

        // 3. Buscamos la última remesa DE ESTE SOCIO en específico
        const lastRemesa = await Remesa.findOne({
            where: { asociadoId: asociadoId },
            order: [['createdAt', 'DESC']],
            transaction: t
        });

        let nextNumber = 1;
        if (lastRemesa && lastRemesa.remesaNumber) {
            const parts = lastRemesa.remesaNumber.split('-');
            const lastNumberStr = parts[parts.length - 1]; 
            const lastNumber = parseInt(lastNumberStr, 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        // 4. Armamos el número final: REM-JUAN-1
        const newRemesaNumber = `REM-${firstName}-${nextNumber}`;

        const newRemesa = await Remesa.create({
            ...req.body,
            id: `rem-${Date.now()}`,
            remesaNumber: newRemesaNumber,
            vehicleId,
            date: req.body.date || new Date().toISOString().split('T')[0],
            totalAmount,
            cooperativeAmount,
            totalPackages,
            totalWeight,
            exchangeRate: exchangeRate || 1.00 
        }, { transaction: t });

        // ==========================================
        // LA SOLUCIÓN ESTÁ AQUÍ 👇
        // ==========================================
        // Actualizamos no solo el remesaId, sino el estado del envío 
        // y le asignamos el vehículo que transportará la factura.
        await Invoice.update(
            { 
                remesaId: newRemesa.id,
                shippingStatus: 'En Tránsito', // Evita que vuelva a salir como disponible
                vehicleId: vehicleId          // Asocia el vehículo a la factura directamente
            },
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
    const t = await sequelize.transaction();

    try {
        const remesa = await Remesa.findByPk(remesaId, { transaction: t });
        if (!remesa) {
            await t.rollback();
            return res.status(404).json({ message: 'Remesa no encontrada' });
        }

        const vehicle = await Vehicle.findByPk(remesa.vehicleId, { transaction: t });

        // Liberar facturas devolviéndolas a "Pendiente para Despacho"
        await Invoice.update(
            {
                shippingStatus: 'Pendiente para Despacho',
                remesaId: null,
                vehicleId: null 
            },
            { 
                where: { remesaId: remesa.id }, 
                transaction: t 
            }
        );

        if (vehicle) {
            await vehicle.update({ status: 'Disponible' }, { transaction: t });
        }

        await remesa.destroy({ transaction: t });

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