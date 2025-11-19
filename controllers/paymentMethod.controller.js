import { PaymentMethod } from '../models/index.js';

// @desc    Obtener todas las formas de pago
// @route   GET /api/payment-methods
export const getPaymentMethods = async (req, res) => {
    try {
        const paymentMethods = await PaymentMethod.findAll({ order: [['name', 'ASC']] });
        res.json(paymentMethods);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las formas de pago', error: error.message });
    }
};

// @desc    Crear una nueva forma de pago
// @route   POST /api/payment-methods
export const createPaymentMethod = async (req, res) => {
    const { name, type } = req.body;
    if (!name || !type) {
        return res.status(400).json({ message: 'El nombre y el tipo son obligatorios.' });
    }
    try {
        const newPaymentMethod = await PaymentMethod.create({
            id: `pm-${Date.now()}`,
            ...req.body,
        });
        res.status(201).json(newPaymentMethod);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la forma de pago', error: error.message });
    }
};

// @desc    Actualizar una forma de pago
// @route   PUT /api/payment-methods/:id
export const updatePaymentMethod = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.findByPk(req.params.id);
        if (paymentMethod) {
            await paymentMethod.update(req.body);
            res.json(paymentMethod);
        } else {
            res.status(404).json({ message: 'Forma de pago no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la forma de pago', error: error.message });
    }
};

// @desc    Eliminar una forma de pago
// @route   DELETE /api/payment-methods/:id
export const deletePaymentMethod = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.findByPk(req.params.id);
        if (paymentMethod) {
            await paymentMethod.destroy();
            res.json({ message: 'Forma de pago eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Forma de pago no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la forma de pago', error: error.message });
    }
};