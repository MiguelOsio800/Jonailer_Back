import { ExpenseCategory } from '../models/index.js';

// @desc    Obtener todas las categorías de gastos
// @route   GET /api/expense-categories
export const getExpenseCategories = async (req, res) => {
    try {
        const categories = await ExpenseCategory.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las categorías de gastos', error: error.message });
    }
};

// @desc    Crear una nueva categoría de gasto
// @route   POST /api/expense-categories
export const createExpenseCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre de la categoría es obligatorio.' });
    }
    try {
        const newCategory = await ExpenseCategory.create({
            id: `exp-cat-${Date.now()}`,
            name,
        });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la categoría de gasto', error: error.message });
    }
};

// @desc    Actualizar una categoría de gasto
// @route   PUT /api/expense-categories/:id
export const updateExpenseCategory = async (req, res) => {
    try {
        const category = await ExpenseCategory.findByPk(req.params.id);
        if (category) {
            await category.update(req.body);
            res.json(category);
        } else {
            res.status(404).json({ message: 'Categoría de gasto no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la categoría de gasto', error: error.message });
    }
};

// @desc    Eliminar una categoría de gasto
// @route   DELETE /api/expense-categories/:id
export const deleteExpenseCategory = async (req, res) => {
    try {
        const category = await ExpenseCategory.findByPk(req.params.id);
        if (category) {
            await category.destroy();
            res.json({ message: 'Categoría de gasto eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Categoría de gasto no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la categoría de gasto', error: error.message });
    }
};