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

    // --- Definición de Permisos para los 5 Roles ---
    const adminPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    
    // El rol Soporte Técnico tiene todos los permisos (igual que Admin)
    const techPermissions = { ...adminPermissions };
    
    // Filtramos todos los permisos relacionados con Contabilidad/Libro Contable
    const contablePermissionsRaw = ALL_PERMISSION_KEYS.filter(key => key.includes('libro-contable'));
    
    // Definición del Rol Contador
    const contadorPermissions = {
        'dashboard.view': true,
        // INCLUSIÓN COMPLETA DEL MÓDULO CONTABLE 
        ...contablePermissionsRaw.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        
        // Permisos de SOLO LECTURA a entidades básicas
        'offices.view': true,
        'categories.view': true,
        'shipping-types.view': true,
        'payment-methods.view': true,
        'clientes.view': true,
        'proveedores.view': true,
        'flota.view': true,        
        'invoices.view': true,     
        'configuracion.view': true, 
        'config.roles.manage': true, 
        'bienes-categorias.view': true, 
        'inventario-bienes.view': true, 
    };

    // El rol Operador 
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
        'clientes.delete': true, 
        'invoices.delete': true,
        
        // Permisos de Proveedores
        'proveedores.create': true,
        'proveedores.edit': true,
        'proveedores.delete': true,

        // --- Catálogos (SOLO LECTURA) ---
        'categories.view': true,
        'shipping-types.view': true,
        'payment-methods.view': true,
        'offices.view': true,
        'bienes-categorias.view': true,
        'reports.view': true,
    };
    
    // ROL ASISTENTE (Acceso Total, excepto edición/gestión en Configuración/Auditoría)
    const assistantPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    assistantPermissions['config.company.edit'] = false;
    assistantPermissions['config.users.manage'] = false;
    assistantPermissions['config.users.edit_protected'] = false;
    assistantPermissions['config.users.manage_tech_users'] = false;
    assistantPermissions['config.roles.manage'] = false; 

    // --- NUEVO ROL: Admin2 (SOLO LECTURA GLOBAL) ---
    // Incluye solo los permisos que terminan en '.view' (o son vistas de alto nivel)
    const admin2Permissions = ALL_PERMISSION_KEYS
        .filter(key => key.endsWith('.view') || key === 'inventario.view' || key === 'inventario-envios.view')
        .reduce((acc, key) => ({ ...acc, [key]: true }), {});
    
    // --- 1. Roles y Permisos ---
    console.log('Sembrando Roles y Permisos...');
    await Role.bulkCreate([
        { id: 'role-admin', name: 'Administrador', permissions: adminPermissions },
        { id: 'role-op', name: 'Operador', permissions: operatorPermissions },
        { id: 'role-cont', name: 'Contador', permissions: contadorPermissions }, 
        { id: 'role-tech', name: 'Soporte Técnico', permissions: techPermissions },
        { id: 'role-ass', name: 'Asistente', permissions: assistantPermissions },
        { id: 'role-admin2', name: 'Admin2 (Solo Lectura Global)', permissions: admin2Permissions } // Nuevo rol Admin2
    ], { updateOnDuplicate: ['name', 'permissions'] });
    console.log('Roles y permisos actualizados.');

    // --- 2. Información de la Empresa (Sin cambios) ---
    console.log('Sembrando Información de la Empresa...');
    await CompanyInfo.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
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

    // --- 3. Oficinas (Sin cambios) ---
    console.log('Sembrando Oficinas...');
    await Office.bulkCreate([
        { id: 'office-caracas', code: 'A', name: 'OFICINA SEDE CARACAS', address: 'OFICINA SEDE CARACAS', phone: '0212-111-2233' },
        { id: 'office-terminal-bandera', code: 'B', name: 'OFICINA TERMINAL LA BANDERA', address: 'OFICINA TERMINAL LA BANDERA', phone: 'N/A' },
        { id: 'office-valencia', code: 'C', name: 'OFICINA VALENCIA DEPOSITO', address: 'OFICINA VALENCIA DEPOSITO', phone: '0241-444-5566' },
        { id: 'office-barquisimeto-deposito', code: 'D', name: 'OFICINA BARQUISIMETO DEPOSITO', address: 'OFICINA BARQUISIMETO DEPOSITO', phone: 'N/A' },
        { id: 'office-terminal-maracaibo', code: 'E', name: 'OFICINA TERMINAL MARACAIBO', address: 'OFICINA TERMINAL MARACAIBO', phone: 'N/A' },
        { id: 'office-maracaibo-deposito', code: 'F', name: 'OFICINA MARACAIBO DEPOSITO', address: 'OFICINA MARACAIBO DEPOSITO', phone: 'N/A' },
        { id: 'office-terminal-valera', code: 'G', name: 'OFICINA TERMINAL VALERA', address: 'OFICINA TERMINAL VALERA', phone: 'N/A' },
        { id: 'office-terminal-barinas', code: 'H', name: 'OFICINA TERMINAL BARINAS', address: 'OFICINA TERMINAL BARINAS', phone: 'N/A' },
        { id: 'office-terminal-guanare', code: 'I', name: 'OFICINA TERMINAL GUANARE', address: 'OFICINA TERMINAL GUANARE', phone: 'N/A' },
        { id: 'office-terminal-bocono', code: 'J', name: 'OFICINA TERMINAL BOCONO', address: 'OFICINA TERMINAL BOCONO', phone: 'N/A' },
        { id: 'office-terminal-merida', code: 'K', name: 'OFICINA TERMINAL MÉRIDA', address: 'OFICINA TERMINAL MÉRIDA', phone: 'N/A' },
        { id: 'office-merida-deposito', code: 'L', name: 'OFICINA MÉRIDA DEPOSITO', address: 'OFICINA MÉRIDA DEPOSITO', phone: 'N/A' },
        { id: 'office-terminal-sancristobal', code: 'M', name: 'OFICINA TERMINAL SAN CRISTOBAL', address: 'OFICINA TERMINAL SAN CRISTOBAL', phone: 'N/A' },
        { id: 'office-sancristobal-deposito', code: 'N', name: 'OFICINA SAN CRISTOBAL DEPOSITO', address: 'OFICINA SAN CRISTOBAL DEPOSITO', phone: 'N/A' }
    ], { updateOnDuplicate: ['name', 'address', 'phone', 'code'] });
    console.log('Oficinas sembradas.');

    // --- 4. Usuarios (Actualizado con el rol admin2) ---
    console.log('Sembrando Usuarios...');
    const hashedPassword = await bcrypt.hash('123', 10);
    
    await User.bulkCreate([
        { id: 'user-dcruz', name: 'DARLIN CRUZ', username: 'dcruz', password: hashedPassword, roleId: 'role-op', officeId: 'office-caracas' },
        { id: 'user-drojas', name: 'DORIAN ROJAS', username: 'drojas', password: hashedPassword, roleId: 'role-ass', officeId: 'office-caracas' },
        { id: 'user-agarcia', name: 'ALEXANDER GARCIA', username: 'agarcia', password: hashedPassword, roleId: 'role-admin', officeId: 'office-caracas' },
        { id: 'user-nsotillo', name: 'NANCY SOTILLO', username: 'nsotillo', password: hashedPassword, roleId: 'role-op', officeId: 'office-caracas' },
        { id: 'user-mdaboin', name: 'MARLENE DABOIN', username: 'mdaboin', password: hashedPassword, roleId: 'role-op', officeId: 'office-barquisimeto-deposito' },
        { id: 'user-hcastillo', name: 'HAIKEL CASTILLO', username: 'hcastillo', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-barinas' },
        { id: 'user-lcontreras', name: 'LENIS CONTRERAS', username: 'lcontreras', password: hashedPassword, roleId: 'role-op', officeId: 'office-maracaibo-deposito' },
        { id: 'user-fandrade', name: 'FRANK ANDRADE', username: 'fandrade', password: hashedPassword, roleId: 'role-op', officeId: 'office-merida-deposito' },
        { id: 'user-psalas', name: 'PEDRO SALAS', username: 'psalas', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-merida' },
        { id: 'user-rramirez', name: 'RICHARD RAMIREZ', username: 'rramirez', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-merida' },
        { id: 'user-crodriguez', name: 'CARLOS RODRIGUEZ', username: 'crodriguez', password: hashedPassword, roleId: 'role-op', officeId: 'office-sancristobal-deposito' },
        { id: 'user-nquintero', name: 'NORA QUINTERO', username: 'nquintero', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-valera' },
        // Asignación del nuevo rol 'role-admin2' a JOSTON HERNANDEZ y JOSE RODRIGUEZ
        { id: 'user-jhernandez', name: 'JOSTON HERNANDEZ', username: 'jhernandez', password: hashedPassword, roleId: 'role-admin2', officeId: 'office-caracas' }, 
        { id: 'user-jrodriguez', name: 'JOSE RODRIGUEZ', username: 'jrodriguez', password: hashedPassword, roleId: 'role-admin2', officeId: 'office-caracas' },
        
        { id: 'user-hlarez', name: 'HOWARD LAREZ', username: 'hlarez', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-bandera' },
        { id: 'user-rpalencia', name: 'ROWGELIS PALENCIA', username: 'rpalencia', password: hashedPassword, roleId: 'role-op', officeId: 'office-valencia' },
        { id: 'user-hcastillo2', name: 'HIGINIA CASTILLO', username: 'hcastillo2', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-barinas' }, 
        { id: 'user-cdelgado', name: 'CARLOS DELGADO', username: 'cdelgado', password: hashedPassword, roleId: 'role-op', officeId: 'office-terminal-guanare' },
        { id: 'user-cduran', name: 'CARLOS DURAN', username: 'cduran', password: hashedPassword, roleId: 'role-cont', officeId: 'office-caracas' },
        { id: 'user-ccampos', name: 'CAROLINA CAMPOS', username: 'ccampos', password: hashedPassword, roleId: 'role-cont', officeId: 'office-caracas' },
        { id: 'user-soporte', name: 'SOPORTE', username: 'soporte', password: hashedPassword, roleId: 'role-tech', officeId: 'office-caracas' },
        { id: 'user-admin', name: 'ADMIN', username: 'admin', password: hashedPassword, roleId: 'role-admin', officeId: 'office-caracas' }
    ], { updateOnDuplicate: ['name', 'password', 'roleId', 'officeId'] });
    console.log('Usuarios sembrados.');

    // --- 5. Catálogos Varios (Sin cambios) ---
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

    // --- 6. Entidades Principales (Clientes, Proveedores, Asociados) (Sin cambios) ---
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

    // --- 7. Entidades Dependientes (Vehículos, Activos) (Sin cambios) ---
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

    // --- 8. Plan de Cuentas Contables (Omite la siembra) ---
    console.log('Omite la siembra del Plan de Cuentas Contables.');

    // --- 9. Asiento Manual de Ejemplo (Omite la siembra) ---
    console.log('Omite la siembra del Asiento Manual de ejemplo por dependencia con Plan de Cuentas Contables.');

    console.log('Siembra de datos completada exitosamente.');

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    // Es buena práctica cerrar la conexión de la base de datos después de la siembra
    // await sequelize.close(); 
    // console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();