import { User } from '../models/index.js';

// @desc    Obtener todos los usuarios
// @route   GET /api/users
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['name', 'ASC']],
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

// @desc    Crear un nuevo usuario
// @route   POST /api/users
export const createUser = async (req, res) => {
    // Agregamos asociadoId al destructuring
    const { name, username, password, roleId, officeId, asociadoId } = req.body;
    try {
        const newUser = await User.create({
            id: `user-${Date.now()}`,
            name,
            username,
            password,
            roleId,
            // Si viene vacío o undefined, lo guardamos como null
            officeId: officeId || null,
            asociadoId: asociadoId || null,
        });
        const { password: _, ...userWithoutPassword } = newUser.toJSON();
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el usuario', error: error.message });
    }
};

// @desc    Actualizar un usuario
// @route   PUT /api/users/:id
export const updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        if (!req.body.password) {
            delete req.body.password;
        }

        const dataToUpdate = {
            ...req.body,
            officeId: req.body.officeId || null, // <--- Coma agregada aquí
            asociadoId: req.body.asociadoId || null
        };

        await user.update(dataToUpdate);
        const { password, ...userWithoutPassword } = user.toJSON();
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el usuario', error: error.message });
    }
};

// @desc    Eliminar un usuario
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        await user.destroy();
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el usuario', error: error.message });
    }
};