import { Product } from '../models/index.js';

// Obtener todos los productos
export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['name', 'ASC']]
        });
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los productos', error: error.message });
    }
};

// Crear un nuevo producto
export const createProduct = async (req, res) => {
    try {
        const { name, description } = req.body;
        const newProduct = await Product.create({ name, description });
        res.status(201).json(newProduct);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Un producto con ese nombre ya existe.' });
        }
        res.status(500).json({ message: 'Error al crear el producto', error: error.message });
    }
};

// Actualizar un producto
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        await product.update({ name, description });
        res.status(200).json(product);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Un producto con ese nombre ya existe.' });
        }
        res.status(500).json({ message: 'Error al actualizar el producto', error: error.message });
    }
};

// Eliminar un producto
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        await product.destroy(); // Soft delete
        res.status(200).json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el producto', error: error.message });
    }
};