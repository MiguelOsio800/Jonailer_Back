import { ShippingType } from '../models/index.js';

// @desc    Obtener todos los tipos de envío
// @route   GET /api/shipping-types
export const getShippingTypes = async (req, res) => {
    try {
        const shippingTypes = await ShippingType.findAll({ order: [['name', 'ASC']] });
        res.json(shippingTypes);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los tipos de envío', error: error.message });
    }
};

// @desc    Crear un nuevo tipo de envío
// @route   POST /api/shipping-types
export const createShippingType = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre del tipo de envío es obligatorio.' });
    }
    try {
        const newShippingType = await ShippingType.create({
            id: `st-${Date.now()}`,
            name,
        });
        res.status(201).json(newShippingType);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el tipo de envío', error: error.message });
    }
};

// @desc    Actualizar un tipo de envío
// @route   PUT /api/shipping-types/:id
export const updateShippingType = async (req, res) => {
    try {
        const shippingType = await ShippingType.findByPk(req.params.id);
        if (shippingType) {
            await shippingType.update(req.body);
            res.json(shippingType);
        } else {
            res.status(404).json({ message: 'Tipo de envío no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el tipo de envío', error: error.message });
    }
};

// @desc    Eliminar un tipo de envío
// @route   DELETE /api/shipping-types/:id
export const deleteShippingType = async (req, res) => {
    try {
        const shippingType = await ShippingType.findByPk(req.params.id);
        if (shippingType) {
            await shippingType.destroy();
            res.json({ message: 'Tipo de envío eliminado correctamente' });
        } else {
            res.status(404).json({ message: 'Tipo de envío no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el tipo de envío', error: error.message });
    }
};