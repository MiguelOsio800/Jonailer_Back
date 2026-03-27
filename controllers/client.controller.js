import { Client, Office } from '../models/index.js';

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
    // 💡 AHORA RECIBIMOS EL officeId DEL FRONTEND
    const { id, idNumber, clientType, name, phone, address, email, officeId } = req.body; 
    
    if (!idNumber || !name) {
        return res.status(400).json({ message: 'El RIF/Cédula y el nombre son obligatorios.' });
    }
    
    try {
        let finalEmail = (email && email.trim() !== '') ? email : null;

        // MAGIA: Si no hay correo del cliente, pero sabemos su oficina, usamos el de la oficina
        if (!finalEmail && officeId) {
            const office = await Office.findByPk(officeId);
            if (office && office.email) {
                finalEmail = office.email; // Hereda el correo de sucursal
            }
        }

        // Salvavidas final: Si la oficina no tiene correo registrado, usamos el genérico
        if (!finalEmail) {
            finalEmail = 'cooperativafacturas1@gmail.com';
        }

        const newClient = await Client.create({
            id: id || `client-${Date.now()}`,
            idNumber,
            clientType,
            name,
            phone,
            address,
            email: finalEmail,
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
            
            // 💡 AÑADIR: Forzar una recarga para obtener todos los campos, 
            // incluyendo aquellos que podrían ser omitidos por defecto (como el email).
            const updatedClient = await Client.findByPk(req.params.id); 
            
            res.json(updatedClient); // Usar la instancia recargada
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