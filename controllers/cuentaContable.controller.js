import { CuentaContable } from '../models/index.js';

// Obtener todas las cuentas contables
export const getAllCuentasContables = async (req, res) => {
    try {
        const cuentas = await CuentaContable.findAll({
            order: [['codigo', 'ASC']]
        });
        res.status(200).json(cuentas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las cuentas contables', error: error.message });
    }
};

// Obtener una cuenta contable por ID
export const getCuentaContableById = async (req, res) => {
    try {
        const cuenta = await CuentaContable.findByPk(req.params.id);
        if (!cuenta) {
            return res.status(404).json({ message: 'Cuenta contable no encontrada' });
        }
        res.status(200).json(cuenta);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la cuenta contable', error: error.message });
    }
};

// Crear una nueva cuenta contable
export const createCuentaContable = async (req, res) => {
    try {
        const { codigo, nombre, tipo } = req.body;
        const nuevaCuenta = await CuentaContable.create({ codigo, nombre, tipo });
        res.status(201).json(nuevaCuenta);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'El código de la cuenta ya existe.' });
        }
        res.status(500).json({ message: 'Error al crear la cuenta contable', error: error.message });
    }
};

// Actualizar una cuenta contable
export const updateCuentaContable = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, nombre, tipo } = req.body;

        const cuenta = await CuentaContable.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ message: 'Cuenta contable no encontrada' });
        }

        await cuenta.update({ codigo, nombre, tipo });
        res.status(200).json(cuenta);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'El código de la cuenta ya existe.' });
        }
        res.status(500).json({ message: 'Error al actualizar la cuenta contable', error: error.message });
    }
};

// Eliminar una cuenta contable (soft delete)
export const deleteCuentaContable = async (req, res) => {
    try {
        const { id } = req.params;
        const cuenta = await CuentaContable.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ message: 'Cuenta contable no encontrada' });
        }

        await cuenta.destroy(); // Soft delete gracias a 'paranoid: true' en el modelo
        res.status(200).json({ message: 'Cuenta contable eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la cuenta contable', error: error.message });
    }
};