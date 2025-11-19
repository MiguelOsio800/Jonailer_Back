import { Asset } from '../models/index.js';

// @desc    Obtener todos los activos
// @route   GET /api/assets
export const getAssets = async (req, res) => {
    try {
        const assets = await Asset.findAll({ order: [['name', 'ASC']] });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los activos', error: error.message });
    }
};

// @desc    Crear un nuevo activo
// @route   POST /api/assets
export const createAsset = async (req, res) => {
    const { code, name, purchaseValue, officeId, categoryId } = req.body;
    if (!code || !name || purchaseValue === undefined) {
        return res.status(400).json({ message: 'El código, nombre y valor de compra son obligatorios.' });
    }
    try {
        const newAsset = await Asset.create({
            id: `asset-${Date.now()}`,
            ...req.body,
            // CAMBIO: Validamos las claves foráneas opcionales.
            officeId: officeId || null,
            categoryId: categoryId || null,
        });
        res.status(201).json(newAsset);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el activo', error: error.message });
    }
};

export const updateAsset = async (req, res) => {
    try {
        const asset = await Asset.findByPk(req.params.id);
        if (!asset) return res.status(404).json({ message: 'Activo no encontrado' });

        // CAMBIO: Validamos las claves foráneas en la actualización.
        const dataToUpdate = { ...req.body, officeId: req.body.officeId || null, categoryId: req.body.categoryId || null };
        await asset.update(dataToUpdate);

        res.json(asset);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el activo', error: error.message });
    }
};

// @desc    Eliminar un activo
// @route   DELETE /api/assets/:id
export const deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findByPk(req.params.id);
        if (asset) {
            await asset.destroy();
            res.json({ message: 'Activo eliminado correctamente' });
        } else {
            res.status(404).json({ message: 'Activo no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el activo', error: error.message });
    }
};