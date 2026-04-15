import { Remesa, Invoice, Vehicle, Asociado, sequelize, Office } from '../models/index.js';

export const getRemesas = async (req, res) => {
    try {
        const userOfficeId = req.user.officeId; // Se obtiene la oficina del usuario logueado
        const remesas = await Remesa.findAll({ 
            where: { officeId: userOfficeId }, // Se aplica el filtro por oficina
            order: [['date', 'DESC']] 
        });
        res.json(remesas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener remesas', error: error.message });
    }
};

export const createRemesa = async (req, res) => {
    const { vehicleId, invoiceIds, exchangeRate, asociadoId } = req.body; 
    const t = await sequelize.transaction();
    
    try {
        // 0. Validaciones preventivas de seguridad
        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            throw new Error('El arreglo de invoiceIds es requerido y no puede estar vacío.');
        }
        if (!asociadoId || !vehicleId) {
            throw new Error('El asociadoId y vehicleId son campos requeridos.');
        }

        // 1. CARGAMOS LAS FACTURAS
        const invoices = await Invoice.findAll({ 
            where: { id: invoiceIds },
            transaction: t 
        });

        if (invoices.length !== invoiceIds.length) {
            throw new Error('Una o más facturas no fueron encontradas en la base de datos.');
        }

        // 2. CÁLCULOS SEGUROS
        const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
        
        let totalPackages = 0;
        let totalWeight = 0;

        invoices.forEach(inv => {
            const merchandise = inv.guide?.merchandise || [];
            merchandise.forEach(m => {
                totalPackages += (Number(m.quantity) || 0);
                totalWeight += (Number(m.weight) || 0) * (Number(m.quantity) || 0);
            });
        });

        // 3. CÁLCULO DE COMISIÓN
        let cooperativeAmount = 0;
        invoices.forEach(inv => {
            const tipo = (inv.shippingType || '').toLowerCase();
            const montoFactura = Number(inv.totalAmount) || 0;
            const porcentaje = (tipo.includes('franquicia') || tipo.includes('expreso') || tipo.includes('mudanza')) ? 0.15 : 0.30;
            cooperativeAmount += montoFactura * porcentaje;
        });

        // ==========================================
        // 4. BUSCAR INFO DEL SOCIO, OFICINA Y ÚLTIMA REMESA
        // ==========================================
        const asociado = await Asociado.findByPk(asociadoId, { transaction: t });
        if (!asociado) throw new Error(`El asociado con ID ${asociadoId} no fue encontrado.`);

        // --- LÓGICA DE LA OFICINA (AHORA LIGADA AL USUARIO) ---
        // Tomamos el officeId directamente del usuario que está haciendo la solicitud
        const userOfficeId = req.user.officeId; 
        
        const oficina = await Office.findByPk(userOfficeId, { transaction: t });
        
        let letraOficina = 'OFC'; // Respaldo
        
        if (oficina) {
            // Lee el campo 'code' de la oficina a la que pertenece el usuario
            if (oficina.code && oficina.code.trim() !== '') {
                letraOficina = oficina.code.trim().toUpperCase();
            } 
            else if (oficina.name && oficina.name.trim() !== '') {
                letraOficina = oficina.name.trim().charAt(0).toUpperCase();
            }
        }
        // ----------------------------------------------------

        // Tomamos la cédula si existe en tu modelo, si no, usamos el ID del asociado
        const identificador = asociado.cedula || asociado.identificacion || asociadoId;

        // Buscamos la última remesa DE ESTA PERSONA EXACTA
        const lastRemesa = await Remesa.findOne({
            where: { asociadoId: asociadoId },
            order: [['createdAt', 'DESC']],
            transaction: t
        });

        let nextNumber = 1;
        if (lastRemesa?.remesaNumber) {
            // Dividimos por el guion para encontrar el último número
            const parts = lastRemesa.remesaNumber.split('-');
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
        }
        
        // Armamos el número final. Ej: B-REM-V30268581-1
        const newRemesaNumber = `${letraOficina}-REM-${identificador}-${nextNumber}`;

        // ==========================================
        // 5. CREACIÓN DE LA REMESA
        // ==========================================
        const newRemesa = await Remesa.create({
            id: `rem-${Date.now()}`,
            remesaNumber: newRemesaNumber,
            asociadoId: asociadoId,
            vehicleId: vehicleId,
            invoiceIds: invoiceIds, 
            date: req.body.date || new Date().toISOString().split('T')[0],
            totalAmount: totalAmount,
            cooperativeAmount: cooperativeAmount,
            totalPackages: totalPackages,
            totalWeight: totalWeight,
            exchangeRate: Number(exchangeRate) || 1.00,
            officeId: userOfficeId // Se guarda la oficina del creador en la BD
        }, { transaction: t });

        // 6. ACTUALIZACIÓN DE FACTURAS
        await Invoice.update(
            { 
                remesaId: newRemesa.id,
                shippingStatus: 'En Tránsito',
                vehicleId: vehicleId 
            },
            { where: { id: invoiceIds }, transaction: t }
        );

        await t.commit();
        res.status(201).json(newRemesa);

    } catch (error) {
        if (t) await t.rollback();
        
        console.error("===== ERROR DETALLADO =====");
        console.error("NOMBRE:", error.name); 
        console.error("MENSAJE:", error.message);
        if (error.parent) console.error("DB DETAIL:", error.parent.detail); 
        console.error("===========================");

        res.status(500).json({ 
            message: 'Error al crear la remesa', 
            error: error.message,
            stack: error.name === 'SequelizeValidationError' ? error.errors.map(e => e.message) : error.stack
        });
    }
};

export const deleteRemesa = async (req, res) => {
    const { id: remesaId } = req.params;
    const userOfficeId = req.user.officeId;
    const t = await sequelize.transaction();

    try {
        const remesa = await Remesa.findOne({ 
            where: { id: remesaId, officeId: userOfficeId }, 
            transaction: t 
        });

        if (!remesa) {
            await t.rollback();
            return res.status(404).json({ message: 'Remesa no encontrada o no pertenece a su oficina' });
        }

        const vehicle = await Vehicle.findByPk(remesa.vehicleId, { transaction: t });

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