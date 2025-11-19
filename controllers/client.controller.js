import { Client } from '../models/index.js';

// @desc    Obtener todos los clientes
// @route   GET /api/clients
export const getClients = async (req, res) => {
    try {
        const clients = await Client.findAll({
            order: [['name', 'ASC']],
        });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los clientes', error: error.message });
    }
};

// @desc    Obtener un cliente por ID
// @route   GET /api/clients/:id
export const getClientById = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (client) {
            res.json(client);
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el cliente', error: error.message });
    }
};

// @desc    Crear un nuevo cliente
// @route   POST /api/clients
export const createClient = async (req, res) => {
    const { id, idNumber, clientType, name, phone, address } = req.body;
    if (!idNumber || !name) {
        return res.status(400).json({ message: 'El RIF/Cédula y el nombre son obligatorios.' });
    }
    try {
        const newClient = await Client.create({
            id: id || `client-${Date.now()}`,
            idNumber,
            clientType,
            name,
            phone,
            address,
        });
        res.status(201).json(newClient);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el cliente', error: error.message });
    }
};

// @desc    Actualizar un cliente
// @route   PUT /api/clients/:id
export const updateClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (client) {
            await client.update(req.body);
            res.json(client);
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el cliente', error: error.message });
    }
};

// @desc    Eliminar un cliente
// @route   DELETE /api/clients/:id
export const deleteClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (client) {
            await client.destroy();
            res.json({ message: 'Cliente eliminado correctamente' });
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el cliente', error: error.message });
    }
};