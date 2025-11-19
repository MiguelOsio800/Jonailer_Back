import { AssetCategory } from '../models/index.js';

// @desc    Obtener todas las categorías de activos
// @route   GET /api/asset-categories
export const getAssetCategories = async (req, res) => {
    try {
        const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las categorías de activos', error: error.message });
    }
};

// @desc    Crear una nueva categoría de activo
// @route   POST /api/asset-categories
export const createAssetCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre de la categoría es obligatorio.' });
    }
    try {
        const newCategory = await AssetCategory.create({
            id: `asset-cat-${Date.now()}`,
            name,
        });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la categoría de activo', error: error.message });
    }
};

// @desc    Actualizar una categoría de activo
// @route   PUT /api/asset-categories/:id
export const updateAssetCategory = async (req, res) => {
    try {
        const category = await AssetCategory.findByPk(req.params.id);
        if (category) {
            await category.update(req.body);
            res.json(category);
        } else {
            res.status(404).json({ message: 'Categoría de activo no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la categoría de activo', error: error.message });
    }
};

// @desc    Eliminar una categoría de activo
// @route   DELETE /api/asset-categories/:id
export const deleteAssetCategory = async (req, res) => {
    try {
        const category = await AssetCategory.findByPk(req.params.id);
        if (category) {
            // Futuro: Añadir lógica para verificar si la categoría está en uso por algún activo
            await category.destroy();
            res.json({ message: 'Categoría de activo eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Categoría de activo no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la categoría de activo', error: error.message });
    }
};