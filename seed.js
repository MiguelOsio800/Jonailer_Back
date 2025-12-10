import { 
    sequelize, Role, User, Office, Asociado, Vehicle, Client, Supplier,
    CompanyInfo, CuentaContable, AssetCategory, Asset, ExpenseCategory,
    PaymentMethod, ShippingType, Category, Product, Invoice, AsientoManual, AsientoManualEntry
} from './models/index.js';

// Importante: Se necesita para encriptar la contraseña del usuario de prueba
import bcrypt from 'bcryptjs';

// (La lista de permisos queda igual para definir el total de permisos disponibles)
const ALL_PERMISSION_KEYS = [
    'dashboard.view', 'shipping-guide.view', 'invoices.view', 'invoices.create', 'invoices.edit', 
    'invoices.delete', 'invoices.void', 'invoices.changeStatus', 'flota.view', 'flota.create', 
    'flota.edit', 'flota.delete', 'flota.dispatch', 'remesas.view', 'remesas.create', 'remesas.delete',
    'asociados.view', 'asociados.create', 'asociados.edit', 'asociados.delete', 'asociados.pagos.create',
    'asociados.pagos.delete', 'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    'proveedores.view', 'proveedores.create', 'proveedores.edit', 'proveedores.delete', 'libro-contable.view',
    'libro-contable.create', 'libro-contable.edit', 'libro-contable.delete', 'inventario.view',
    'inventario-envios.view', 'inventario-bienes.view', 'inventario-bienes.create', 'inventario-bienes.edit',
    'inventario-bienes.delete', 'bienes-categorias.view', 'bienes-categorias.create', 'bienes-categorias.edit',
    'bienes-categorias.delete', 'reports.view', 'auditoria.view', 'configuracion.view', 'config.company.edit',
    'config.users.manage', 'config.users.edit_protected', 'config.users.manage_tech_users', 'config.roles.manage',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete', 'offices.view',
    'offices.create', 'offices.edit', 'offices.delete', 'shipping-types.view', 'shipping-types.create',
    'shipping-types.edit', 'shipping-types.delete', 'payment-methods.view', 'payment-methods.create',
    'payment-methods.edit', 'payment-methods.delete'
];

const seedDatabase = async () => {
  try {
    console.log('Iniciando la siembra de datos...');
    // Sincroniza la base de datos, alterando las tablas si es necesario
    await sequelize.sync({ alter: true });

    // --- Definición de Permisos para los 4 Roles ---
    const adminPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    
    // El rol Soporte Técnico tiene todos los permisos (igual que Admin)
    const techPermissions = { ...adminPermissions };
    
    // El rol Contador solo tiene acceso a dashboard y al módulo contable completo
    const contablePermissions = ALL_PERMISSION_KEYS.filter(key => key.includes('libro-contable'));
   const contadorPermissions = {
        // Vistas esenciales (Dashboard y contables)
        'dashboard.view': true,
        ...contablePermissions.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        
        // Permisos de SOLO LECTURA a entidades básicas (Catálogos y Tablas Maestras)
        'offices.view': true,
        'categories.view': true,
        'shipping-types.view': true,
        'payment-methods.view': true,
        'clientes.view': true,
        'proveedores.view': true,
        'flota.view': true,        // Necesario para ver el vehículo en los gastos/remesas
        'invoices.view': true,     // Necesario para ver facturas relacionadas con asientos
        'configuracion.view': true, // Necesario para ver el Plan de Cuentas (cuentas-contables)
        
        // Permiso para listar roles (Necesario en el frontend para crear/editar usuarios si fuera necesario)
        // Nota: El endpoint GET /roles requiere el permiso de 'manage', que es muy amplio. 
        // Se añade el permiso completo por compatibilidad con la ruta, pero si se desea más seguridad,
        // se debe modificar el middleware 'authorize' en roles.routes.js para usar un permiso más granular.
        'config.roles.manage': true, 
    };

    // El rol Operador incluye todos sus permisos anteriores más los permisos de acción de proveedores.
    const operatorPermissions = {
        // --- Vistas Operativas ---
        'dashboard.view': true,
        'shipping-guide.view': true,
        'invoices.view': true,
        'flota.view': true,
        'remesas.view': true,
        'asociados.view': true,
        'clientes.view': true,
        'proveedores.view': true,
        'inventario-bienes.view': true,
        
        // --- Permisos de Acción ---
        'invoices.create': true,
        'invoices.edit': true,
        'invoices.changeStatus': true,
        'clientes.create': true,
        'clientes.edit': true,
        
        // **NUEVOS PERMISOS PARA OPERADOR (Proveedores)**
        'proveedores.create': true,
        'proveedores.edit': true,
        'proveedores.delete': true,

        // --- Catálogos (SOLO LECTURA para que carguen los selectores) ---
        'categories.view': true,
        'shipping-types.view': true,
        'payment-methods.view': true,
        'offices.view': true,
        'bienes-categorias.view': true,
        'reports.view': true,
    };

    // --- 1. Roles y Permisos ---
    console.log('Sembrando Roles y Permisos...');
    await Role.bulkCreate([
        { id: 'role-admin', name: 'Administrador', permissions: adminPermissions },
        { id: 'role-op', name: 'Operador', permissions: operatorPermissions },
        { id: 'role-cont', name: 'Contador', permissions: contadorPermissions }, // Nuevo rol Contador
        { id: 'role-tech', name: 'Soporte Técnico', permissions: techPermissions }
    ], { updateOnDuplicate: ['name', 'permissions'] });
    console.log('Roles y permisos actualizados.');

    // --- 2. Información de la Empresa ---
    console.log('Sembrando Información de la Empresa...');
    await CompanyInfo.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
            // **NOMBRE DE LA EMPRESA ACTUALIZADO**
            name: 'Asociación Cooperativa Mixta Fraternidad Del Transporte',
            rif: 'J-123456789',
            address: 'Av. Principal, Edificio Central, Piso 1, Caracas, Venezuela',
            phone: '0212-555-1234',
            costPerKg: 10.5,
            bcvRate: 36.50,
            lastInvoiceNumber: 1,
        }
    });
    console.log('Información de la empresa verificada o creada.');

    // --- 3. Oficinas ---
    console.log('Sembrando Oficinas...');
    await Office.bulkCreate([
        { id: 'office-caracas', code: 'A', name: 'Oficina Principal - Caracas', address: 'Av. Urdaneta, Caracas', phone: '0212-111-2233' },
        { id: 'office-valencia', code: 'C', name: 'Sucursal Valencia', address: 'Zona Industrial, Valencia', phone: '0241-444-5566' }
    ], { updateOnDuplicate: ['name', 'address', 'phone', 'code'] });
    console.log('Oficinas sembradas.');

    // --- 4. Usuarios ---
    console.log('Sembrando Usuarios...');
    const hashedPassword = await bcrypt.hash('123', 10);
    await User.bulkCreate([
        { id: 'user-admin', name: 'Administrador Principal', username: 'admin', password: hashedPassword, roleId: 'role-admin', officeId: 'office-caracas' },
        { id: 'user-operador', name: 'Juan Operador', username: 'operador', password: hashedPassword, roleId: 'role-op', officeId: 'office-valencia' },
        { id: 'user-contador', name: 'Contador Ejemplo', username: 'contador', password: hashedPassword, roleId: 'role-cont', officeId: 'office-caracas' }, // Nuevo usuario Contador
        { id: 'user-tech', name: 'Soporte Ejemplo', username: 'soporte', password: hashedPassword, roleId: 'role-tech', officeId: 'office-caracas' } // Nuevo usuario Soporte
    ], { updateOnDuplicate: ['name', 'password', 'roleId', 'officeId'] });
    console.log('Usuarios sembrados.');

    // --- 5. Catálogos Varios ---
    console.log('Sembrando Catálogos (Métodos de Pago, Tipos de Envío, etc.)...');
    await PaymentMethod.bulkCreate([
        { id: 'pm-efectivo', name: 'Efectivo', type: 'Efectivo' },
        { id: 'pm-zelle', name: 'Zelle', type: 'Transferencia' },
        { id: 'pm-bs', name: 'Transferencia Bs.', type: 'Transferencia', bankName: 'Banesco', accountNumber: '0134-1234-56-7890123456' }
    ], { updateOnDuplicate: ['name', 'type', 'bankName', 'accountNumber'] });

    await ShippingType.bulkCreate([
        { id: 'st-estandar', name: 'Envío Estándar' },
        { id: 'st-expreso', name: 'Envío Expreso' }
    ], { updateOnDuplicate: ['name'] });

    await Category.bulkCreate([
        { id: 'cat-electronica', name: 'Electrónica' },
        { id: 'cat-ropa', name: 'Ropa y Calzado' }
    ], { updateOnDuplicate: ['name'] });

    await ExpenseCategory.bulkCreate([
        { id: 'exp-cat-oficina', name: 'Suministros de Oficina' },
        { id: 'exp-cat-combustible', name: 'Combustible y Lubricantes' }
    ], { updateOnDuplicate: ['name'] });

    await AssetCategory.bulkCreate([
        { id: 'asset-cat-pc', name: 'Equipos de Computación' },
        { id: 'asset-cat-muebles', name: 'Mobiliario y Equipo' }
    ], { updateOnDuplicate: ['name'] });
    console.log('Catálogos sembrados.');

    // --- 6. Entidades Principales (Clientes, Proveedores, Asociados) ---
    console.log('Sembrando Clientes, Proveedores y Asociados...');
    await Client.bulkCreate([
        { id: 'client-1', idNumber: 'V-12345678-9', clientType: 'persona', name: 'Maria Rodriguez', phone: '0414-1234567', address: 'La Candelaria, Caracas' },
        { id: 'client-2', idNumber: 'J-87654321-0', clientType: 'empresa', name: 'Comercial XYZ', phone: '0212-9876543', address: 'El Rosal, Caracas' }
    ], { updateOnDuplicate: ['name', 'phone', 'address', 'clientType'] });

    await Supplier.bulkCreate([
        { id: 'supp-1', idNumber: 'J-112233445', name: 'Repuestos El Gato', phone: '0212-1112233', address: 'Quinta Crespo' },
        { id: 'supp-2', idNumber: 'J-556677889', name: 'Papelería El Lápiz', phone: '0212-4445566', address: 'Sabana Grande' }
    ], { updateOnDuplicate: ['name', 'phone', 'address'] });

    await Asociado.bulkCreate([
        { id: 'asoc-1', codigo: 'A001', nombre: 'Pedro Pérez', cedula: 'V-8765432-1', fechaIngreso: '2020-01-15' },
        { id: 'asoc-2', codigo: 'A002', nombre: 'Ana Gómez', cedula: 'V-9876543-2', fechaIngreso: '2021-05-20' }
    ], { updateOnDuplicate: ['nombre', 'cedula', 'fechaIngreso'] });
    console.log('Entidades principales sembradas.');

    // --- 7. Entidades Dependientes (Vehículos, Activos) ---
    console.log('Sembrando Vehículos y Activos...');
    await Vehicle.bulkCreate([
        { id: 'vehicle-1', asociadoId: 'asoc-1', placa: 'AB123CD', modelo: 'Ford Cargo 815', capacidadCarga: 5000, status: 'Disponible' },
        { id: 'vehicle-2', asociadoId: 'asoc-2', placa: 'XY456Z', modelo: 'Chevrolet NPR', capacidadCarga: 4500, status: 'Disponible' }
    ], { updateOnDuplicate: ['asociadoId', 'modelo', 'capacidadCarga', 'status'] });

    await Asset.bulkCreate([
        { id: 'asset-1', code: 'PC-001', name: 'Laptop Gerencia', purchaseValue: 1200, officeId: 'office-caracas', categoryId: 'asset-cat-pc' },
        { id: 'asset-2', code: 'ES-005', name: 'Escritorio Operador', purchaseValue: 300, officeId: 'office-valencia', categoryId: 'asset-cat-muebles' }
    ], { updateOnDuplicate: ['name', 'purchaseValue', 'officeId', 'categoryId'] });
    console.log('Entidades dependientes sembradas.');

    // --- 8. Plan de Cuentas Contables (ELIMINADO A PETICIÓN DEL USUARIO) ---
    console.log('Omite la siembra del Plan de Cuentas Contables.');
    // La sección de CuentaContable.bulkCreate ha sido eliminada.

    // --- 9. Asiento Manual de Ejemplo (ELIMINADO A PETICIÓN DEL USUARIO) ---
    // La sección de AsientoManual y AsientoManualEntry ha sido eliminada porque dependía del Plan de Cuentas.
    console.log('Omite la siembra del Asiento Manual de ejemplo por dependencia con Plan de Cuentas Contables.');

    console.log('Siembra de datos completada exitosamente.');

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();