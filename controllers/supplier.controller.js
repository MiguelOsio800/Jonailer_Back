import { Supplier } from '../models/index.js';

// GET /api/suppliers
export const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({ order: [['name', 'ASC']] });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener proveedores', error: error.message });
    }
};

// POST /api/suppliers
export const createSupplier = async (req, res) => {
    try {
        // CAMBIO: Aseguramos que se genere un ID único.
        const newSupplier = await Supplier.create({ id: `supp-${Date.now()}`, ...req.body });
        res.status(201).json(newSupplier);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el proveedor', error: error.message });
    }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
        await supplier.update(req.body);
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar proveedor', error: error.message });
    }
};

// DELETE /api/suppliers/:id
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
        await supplier.destroy();
        res.json({ message: 'Proveedor eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar proveedor', error: error.message });
    }
};