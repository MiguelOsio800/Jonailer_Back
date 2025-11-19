import { Category } from '../models/index.js';

// @desc    Obtener todas las categorías
// @route   GET /api/categories
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las categorías', error: error.message });
    }
};

// @desc    Crear una nueva categoría
// @route   POST /api/categories
export const createCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre de la categoría es obligatorio.' });
    }
    try {
        const newCategory = await Category.create({
            id: `cat-${Date.now()}`,
            name,
        });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la categoría', error: error.message });
    }
};

// @desc    Actualizar una categoría
// @route   PUT /api/categories/:id
export const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (category) {
            await category.update(req.body);
            res.json(category);
        } else {
            res.status(404).json({ message: 'Categoría no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la categoría', error: error.message });
    }
};

// @desc    Eliminar una categoría
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (category) {
            await category.destroy();
            res.json({ message: 'Categoría eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Categoría no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la categoría', error: error.message });
    }
};