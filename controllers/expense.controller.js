import { Expense } from '../models/index.js';

export const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.findAll({ order: [['date', 'DESC']] });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los gastos', error: error.message });
    }
};

export const createExpense = async (req, res) => {
    try {
        // CAMBIO: Se asegura de que los IDs opcionales vacíos se conviertan en null.
        const expenseData = {
            ...req.body,
            id: `exp-${Date.now()}`,
            supplierId: req.body.supplierId || null,
            paymentMethodId: req.body.paymentMethodId || null,
            officeId: req.body.officeId || null,
            categoryId: req.body.categoryId || null,
        };
        const newExpense = await Expense.create(expenseData);
        res.status(201).json(newExpense);
    } catch (error) {
        console.error("Error al crear el gasto:", error);
        res.status(500).json({ message: 'Error al crear el gasto', error: error.message });
    }
};

export const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

        // CAMBIO: Se aplica la misma validación para la actualización.
        const dataToUpdate = {
            ...req.body,
            supplierId: req.body.supplierId || null,
            paymentMethodId: req.body.paymentMethodId || null,
            officeId: req.body.officeId || null,
            categoryId: req.body.categoryId || null,
        };

        await expense.update(dataToUpdate);
        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el gasto', error: error.message });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
        await expense.destroy();
        res.json({ message: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el gasto', error: error.message });
    }
};