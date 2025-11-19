import { Role, User } from '../models/index.js';

// @desc    Obtener todos los roles
// @route   GET /api/roles
export const getRoles = async (req, res) => {
    try {
        const roles = await Role.findAll({ order: [['name', 'ASC']] });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los roles', error: error.message });
    }
};

// @desc    Crear un nuevo rol
// @route   POST /api/roles
export const createRole = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre del rol es obligatorio.' });
    }
    try {
        const newRole = await Role.create({
            id: `role-${Date.now()}`,
            name,
            permissions: {}, // Se inicializa vacío, los permisos se asignan por separado
        });
        res.status(201).json(newRole);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el rol', error: error.message });
    }
};

// @desc    Actualizar un rol (solo el nombre)
// @route   PUT /api/roles/:id
export const updateRole = async (req, res) => {
    const { name } = req.body;
    try {
        const role = await Role.findByPk(req.params.id);
        if (role) {
            role.name = name ?? role.name;
            await role.save();
            res.json(role);
        } else {
            res.status(404).json({ message: 'Rol no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el rol', error: error.message });
    }
};

// @desc    Eliminar un rol
// @route   DELETE /api/roles/:id
export const deleteRole = async (req, res) => {
    try {
        const roleId = req.params.id;
        const role = await Role.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Verificar si el rol está en uso
        const userWithRole = await User.findOne({ where: { roleId } });
        if (userWithRole) {
            return res.status(400).json({ message: 'No se puede eliminar un rol que está asignado a uno o más usuarios.' });
        }

        // Evitar eliminar roles base del sistema
        if (['role-admin', 'role-op', 'role-tech'].includes(roleId)) {
             return res.status(400).json({ message: 'No se pueden eliminar los roles base del sistema.' });
        }
        
        await role.destroy();
        res.json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el rol', error: error.message });
    }
};

// @desc    Actualizar SOLO los permisos de un rol
// @route   PUT /api/roles/:id/permissions
export const updateRolePermissions = async (req, res) => {
    const { permissions } = req.body;
    try {
        const role = await Role.findByPk(req.params.id);
        if (role) {
            role.permissions = permissions || {}; // Actualizamos solo los permisos
            await role.save();
            // ¡Importante! Sequelize a veces no refleja el cambio en JSONB inmediatamente.
            // Recargamos el objeto para asegurar que la respuesta sea correcta.
            await role.reload();
            res.json(role);
        } else {
            res.status(404).json({ message: 'Rol no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar los permisos del rol', error: error.message });
    }
};