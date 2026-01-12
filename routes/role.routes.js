import express from 'express';
import { getRoles, createRole, updateRole, deleteRole, updateRolePermissions } from '../controllers/role.controller.js';
import { getMe } from '../controllers/auth.controller.js'; 
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// RUTA PARA EL USUARIO ACTUAL (Sin authorize global)
// Esto permite que el front cargue los permisos del usuario logueado
router.get('/me', getMe); 

// RUTAS ADMINISTRATIVAS (Aquí sí aplicamos authorize individualmente)
router.route('/')
    .get(authorize('config.roles.manage'), getRoles)
    .post(authorize('config.roles.manage'), createRole);

router.route('/:id')
    .put(authorize('config.roles.manage'), updateRole)
    .delete(authorize('config.roles.manage'), deleteRole);

router.route('/:id/permissions')
    .put(authorize('config.roles.manage'), updateRolePermissions);

export default router;