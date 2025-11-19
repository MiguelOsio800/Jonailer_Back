import { Role, Office, Category, ShippingType, PaymentMethod, ExpenseCategory, AssetCategory, User, Client, Invoice, Vehicle, Supplier, Expense, Asset } from '../models/index.js';

// @desc    Obtener todos los datos de configuración/catálogos
// @route   GET /api/settings/all-data
export const getAllData = async (req, res) => {
    try {
        // Se ejecutan todas las consultas en paralelo para mayor eficiencia
        const [
            users, roles, offices, categories, shippingTypes, paymentMethods,
            clients, suppliers, vehicles, invoices, expenses,
            expenseCategories, assetCategories, assets
        ] = await Promise.all([
            User.findAll({ attributes: { exclude: ['password'] } }),
            Role.findAll(),
            Office.findAll(),
            Category.findAll(),
            ShippingType.findAll(),
            PaymentMethod.findAll(),
            Client.findAll(),
            Supplier.findAll(),
            Vehicle.findAll(),
            Invoice.findAll(),
            Expense.findAll(),
            ExpenseCategory.findAll(),
            AssetCategory.findAll(),
            Asset.findAll(),
        ]);

        // Devolvemos un solo objeto grande, similar a como lo maneja tu DataContext
        res.json({
            users, roles, offices, categories, shippingTypes, paymentMethods,
            clients, suppliers, vehicles, invoices, expenses,
            expenseCategories, assetCategories, assets
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al obtener todos los datos de configuración', error: error.message });
    }
};