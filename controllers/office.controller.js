import { Office } from '../models/index.js';

// @desc    Obtener todas las oficinas
// @route   GET /api/offices
export const getOffices = async (req, res) => {
    try {
        const offices = await Office.findAll({
            order: [['name', 'ASC']],
        });
        res.json(offices);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las oficinas', error: error.message });
    }
};

// @desc    Crear una nueva oficina
// @route   POST /api/offices
export const createOffice = async (req, res) => {
    const { id, code, name, address, phone } = req.body;
    if (!name || !address || !phone) {
        return res.status(400).json({ message: 'Nombre, dirección y teléfono son obligatorios.' });
    }
    try {
        const newOffice = await Office.create({
            id: id || `off-${Date.now()}`,
            code,
            name,
            address,
            phone,
        });
        res.status(201).json(newOffice);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la oficina', error: error.message });
    }
};

// @desc    Actualizar una oficina
// @route   PUT /api/offices/:id
export const updateOffice = async (req, res) => {
    try {
        const office = await Office.findByPk(req.params.id);
        if (office) {
            await office.update(req.body);
            res.json(office);
        } else {
            res.status(404).json({ message: 'Oficina no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la oficina', error: error.message });
    }
};

// @desc    Eliminar una oficina
// @route   DELETE /api/offices/:id
export const deleteOffice = async (req, res) => {
    try {
        const office = await Office.findByPk(req.params.id);
        if (office) {
            await office.destroy();
            res.json({ message: 'Oficina eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Oficina no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la oficina', error: error.message });
    }
};