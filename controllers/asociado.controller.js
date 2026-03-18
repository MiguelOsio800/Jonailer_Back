import { Op } from 'sequelize';
import { Asociado, Certificado, PagoAsociado, ReciboPagoAsociado, Vehicle, sequelize } from '../models/index.js';

// --- CRUD para Asociados ---

// @desc    Obtener asociados (filtrado si es el propio asociado)
export const getAsociados = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const whereClause = {};

        if (req.user && req.user.asociadoId) {
            whereClause.id = req.user.asociadoId;
        }

        const { count, rows } = await Asociado.findAndCountAll({
            where: whereClause,
            order: [['nombre', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: rows
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener asociados', error: error.message });
    }
};

export const createAsociado = async (req, res) => {
    try {
        const { id, codigo, cedula } = req.body;

        // 1. Verificamos si ya existe por ID, Código o Cédula antes de intentar crear
        const existente = await Asociado.findOne({
            where: {
                [Op.or]: [
                    { id: id || null },
                    { codigo: codigo },
                    { cedula: cedula }
                ]
            }
        });

        if (existente) {
            // SI EXISTE: Actualizamos en lugar de crear
            await existente.update(req.body);
            return res.status(200).json(existente);
        }

        // SI NO EXISTE: Creamos el nuevo registro
        const newAsociado = await Asociado.create(req.body);
        res.status(201).json(newAsociado);

    } catch (error) {
        console.error("Error en createAsociado:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: 'Ya existe un asociado con ese código o cédula.' 
            });
        }
        res.status(500).json({ message: 'Error al procesar el socio', error: error.message });
    }
};

export const updateAsociado = async (req, res) => {
    try {
        const { id } = req.params;

        const asociado = await Asociado.findByPk(id);
        if (!asociado) {
            return res.status(404).json({ message: 'Asociado no encontrado' });
        }
        
        await asociado.update(req.body);
        res.json(asociado);

    } catch (error) {
        console.error("Error al actualizar asociado:", error);
        res.status(500).json({ message: 'Error al actualizar asociado', error: error.message });
    }
};

export const deleteAsociado = async (req, res) => {
    try {
        const asociado = await Asociado.findByPk(req.params.id);
        if (!asociado) return res.status(404).json({ message: 'Asociado no encontrado' });

        // Intentar eliminar
        await asociado.destroy();
        res.json({ message: 'Asociado eliminado correctamente' });
    } catch (error) {
        // Capturar error de restricción de llave foránea (Foreign Key)
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ 
                message: 'No se puede eliminar el asociado porque tiene vehículos, pagos o certificados asociados. Elimine esos registros primero.' 
            });
        }
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
        // CAMBIO: Ordenar por createdAt en lugar de fechaVencimiento
        const pagos = await PagoAsociado.findAll({ order: [['createdAt', 'DESC']] });
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener pagos', error: error.message });
    }
};

export const createPago = async (req, res) => {
    try {
        // Extraemos tasaCambio del body. Ya no leemos fechaVencimiento
        const { tasaCambio, fechaVencimiento, ...restoDatos } = req.body; 

        const newPago = await PagoAsociado.create({ 
            id: `pago-${Date.now()}`, 
            tasaCambio: tasaCambio || 1, // Guardamos la tasa
            ...restoDatos 
        });
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
            // CAMBIO: Ordenar por createdAt
            order: [['createdAt', 'ASC']]
        });
        res.json(deudas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener deudas del asociado', error: error.message });
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

export const generarDeudaMasiva = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { concepto, montoBs, montoUsd, fechaVencimiento, cuotas, applyTo, asociadosIds } = req.body;
        
        let targetAsociados = [];

        // 1. Buscamos a los socios
        if (asociadosIds && asociadosIds.length > 0) {
            targetAsociados = await Asociado.findAll({ 
                where: { id: asociadosIds }, 
                transaction: t 
            });
        } else {
            const whereClause = applyTo === 'Activo' ? { status: 'Activo' } : {};
            targetAsociados = await Asociado.findAll({ 
                where: whereClause, 
                transaction: t 
            });
        }

        if (targetAsociados.length === 0) {
            await t.rollback();
            return res.status(404).json({ message: 'No se encontraron asociados para aplicar la deuda.' });
        }

        // --- CORRECCIÓN AQUÍ ---
        // 2. Filtramos socios inválidos y preparamos los datos con un ID manual para cada uno
        const fechaActual = Date.now(); // Usamos esto de base para los IDs

        const nuevosPagos = targetAsociados
            .filter(socio => socio && socio.id !== '')
            .map((socio, index) => ({
                id: `pago-${fechaActual}-${index}`,
                asociadoId: socio.id,
                concepto: cuotas ? `${concepto} (Cuota ${cuotas})` : concepto,
                montoBs: montoBs || 0,
                montoUsd: montoUsd || 0,
                tasaCambio: req.body.tasaCambio || 1, // <-- Agregamos la tasa
                status: 'Pendiente'
                // Ya no incluimos fechaVencimiento
            }));

        // 3. Insertamos en bloque
        await PagoAsociado.bulkCreate(nuevosPagos, { transaction: t });

        // 4. Confirmamos la transacción
        await t.commit();
        res.status(201).json({ 
            message: `Deuda generada exitosamente para ${nuevosPagos.length} asociados.` 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error en deuda masiva:", error);
        res.status(500).json({ message: 'Error interno al generar deuda masiva', error: error.message });
    }
};