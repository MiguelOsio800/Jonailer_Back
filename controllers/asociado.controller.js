import { Op } from 'sequelize';
import { Asociado, Certificado, PagoAsociado, ReciboPagoAsociado, Vehicle, sequelize } from '../models/index.js';

// --- CRUD para Asociados ---

// @desc    Obtener asociados (filtrado si es el propio asociado)
export const getAsociados = async (req, res) => {
    try {
        const whereClause = {};

        // 👇 SI EL USUARIO ES ASOCIADO (NO ADMIN), SOLO SE VE A SÍ MISMO
        // req.user viene del middleware 'protect'
        if (req.user && req.user.asociadoId) {
            whereClause.id = req.user.asociadoId;
        }

        const asociados = await Asociado.findAll({ 
            where: whereClause, // Aplicamos el filtro
            order: [['nombre', 'ASC']] 
        });
        res.json(asociados);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener asociados', error: error.message });
    }
};

export const createAsociado = async (req, res) => {
    try {
        const newAsociado = await Asociado.create({ id: `asoc-${Date.now()}`, ...req.body });
        res.status(201).json(newAsociado);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear asociado', error: error.message });
    }
};

export const updateAsociado = async (req, res) => {
    try {
        const asociado = await Asociado.findByPk(req.params.id);
        if (!asociado) return res.status(404).json({ message: 'Asociado no encontrado' });
        await asociado.update(req.body);
        res.json(asociado);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar asociado', error: error.message });
    }
};

export const deleteAsociado = async (req, res) => {
    try {
        const asociado = await Asociado.findByPk(req.params.id);
        if (!asociado) return res.status(404).json({ message: 'Asociado no encontrado' });
        // Lógica adicional para verificar dependencias antes de borrar podría ir aquí
        await asociado.destroy();
        res.json({ message: 'Asociado eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar asociado', error: error.message });
    }
};

// --- CRUD para Certificados ---

export const getCertificados = async (req, res) => {
    try {
        const certificados = await Certificado.findAll();
        res.json(certificados);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener certificados', error: error.message });
    }
};

export const createCertificado = async (req, res) => {
    try {
        const newCertificado = await Certificado.create({ id: `cert-${Date.now()}`, ...req.body });
        res.status(201).json(newCertificado);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear certificado', error: error.message });
    }
};

export const updateCertificado = async (req, res) => {
    try {
        const certificado = await Certificado.findByPk(req.params.id);
        if (!certificado) return res.status(404).json({ message: 'Certificado no encontrado' });
        await certificado.update(req.body);
        res.json(certificado);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar certificado', error: error.message });
    }
};

export const deleteCertificado = async (req, res) => {
    try {
        const certificado = await Certificado.findByPk(req.params.id);
        if (!certificado) return res.status(404).json({ message: 'Certificado no encontrado' });
        await certificado.destroy();
        res.json({ message: 'Certificado eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar certificado', error: error.message });
    }
};

// --- Lógica para Pagos y Recibos ---

export const getPagos = async (req, res) => {
    try {
        const pagos = await PagoAsociado.findAll({ order: [['fechaVencimiento', 'DESC']] });
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
    }
};

export const createPago = async (req, res) => {
    try {
        const newPago = await PagoAsociado.create({ id: `pago-${Date.now()}`, ...req.body });
        res.status(201).json(newPago);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear pago', error: error.message });
    }
};

export const deletePago = async (req, res) => {
    try {
        const pago = await PagoAsociado.findByPk(req.params.id);
        if (!pago) return res.status(404).json({ message: 'Pago no encontrado' });
        await pago.destroy();
        res.json({ message: 'Pago eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar pago', error: error.message });
    }
};

export const getRecibos = async (req, res) => {
    try {
        const recibos = await ReciboPagoAsociado.findAll({ order: [['fechaPago', 'DESC']] });
        res.json(recibos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener recibos', error: error.message });
    }
};

export const createRecibo = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { pagosIds, ...reciboData } = req.body;
        
        // Verificación de seguridad: Validar que los pagos existan y no estén ya pagados
        const pagosPendientes = await PagoAsociado.findAll({
            where: {
                id: { [Op.in]: pagosIds },
                status: 'Pendiente'
            },
            transaction: t
        });

        if (pagosPendientes.length !== pagosIds.length) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'Error: Uno o más pagos ya han sido procesados o no existen.' 
            });
        }

        // 1. Crear el recibo
        const newRecibo = await ReciboPagoAsociado.create({ 
            id: `recibo-${Date.now()}`, 
            pagosIds,
            ...reciboData 
        }, { transaction: t });

        // 2. Actualizar el estado de los pagos cubiertos por el recibo
        await PagoAsociado.update(
            { status: 'Pagado', reciboId: newRecibo.id },
            { where: { id: { [Op.in]: pagosIds } }, transaction: t }
        );

        await t.commit();
        res.status(201).json(newRecibo);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error al crear recibo', error: error.message });
    }
};

export const getDeudasByAsociado = async (req, res) => {
    try {
        const { id } = req.params;
        const deudas = await PagoAsociado.findAll({
            where: { 
                asociadoId: id,
                status: 'Pendiente' 
            },
            order: [['fechaVencimiento', 'ASC']]
        });
        res.json(deudas);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error al obtener deudas del asociado', 
            error: error.message 
        });
    }
};

// @desc    Obtener certificados vinculados a un asociado específico
// @route   GET /api/asociados/:id/certificados
export const getCertificadosByAsociado = async (req, res) => {
    try {
        const { id } = req.params; // ID del asociado
        
        const certificados = await Certificado.findAll({
            include: {
                model: Vehicle,
                where: { asociadoId: id }, // Filtramos por el dueño del vehículo
                attributes: [] // No necesitamos traer los datos del vehículo, solo filtrar
            }
        });
        
        res.json(certificados);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener certificados', error: error.message });
    }
};