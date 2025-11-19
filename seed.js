import { 
    sequelize, Role, User, Office, Asociado, Vehicle, Client, Supplier,
    CompanyInfo, CuentaContable, AssetCategory, Asset, ExpenseCategory,
    PaymentMethod, ShippingType, Category, Product, Invoice, AsientoManual, AsientoManualEntry
} from './models/index.js';

// Importante: Se necesita para encriptar la contraseña del usuario de prueba
import bcrypt from 'bcryptjs';

// (La lista de permisos queda igual...)
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

    // (La sección de permisos queda igual...)
    const adminPermissions = ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    const techPermissions = { ...adminPermissions };
    const operatorPermissions = {
        'dashboard.view': true, 'shipping-guide.view': true, 'invoices.view': true,
        'invoices.create': true, 'invoices.edit': true, 'invoices.changeStatus': true,
        'flota.view': true, 'remesas.view': true, 'asociados.view': true, 'clientes.view': true,
        'clientes.create': true, 'clientes.edit': true, 'reports.view': true,
    };

    // --- 1. Roles y Permisos ---
    console.log('Sembrando Roles y Permisos...');
    await Role.bulkCreate([
        { id: 'role-admin', name: 'Administrador', permissions: adminPermissions },
        { id: 'role-op', name: 'Operador', permissions: operatorPermissions },
        { id: 'role-tech', name: 'Soporte Técnico', permissions: techPermissions }
    ], { updateOnDuplicate: ['name', 'permissions'] });
    console.log('Roles y permisos actualizados.');

    // --- 2. Información de la Empresa ---
    console.log('Sembrando Información de la Empresa...');
    await CompanyInfo.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
            name: 'Transporte Alianza C.A.',
            rif: 'J-12345678-9',
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
        { id: 'office-caracas', code: 'CCS', name: 'Oficina Principal - Caracas', address: 'Av. Urdaneta, Caracas', phone: '0212-111-2233' },
        { id: 'office-valencia', code: 'VLN', name: 'Sucursal Valencia', address: 'Zona Industrial, Valencia', phone: '0241-444-5566' }
    ], { updateOnDuplicate: ['name', 'address', 'phone', 'code'] });
    console.log('Oficinas sembradas.');

    // --- 4. Usuarios ---
    console.log('Sembrando Usuarios...');
    const hashedPassword = await bcrypt.hash('123', 10);
    await User.bulkCreate([
        { id: 'user-admin', name: 'Administrador Principal', username: 'admin', password: hashedPassword, roleId: 'role-admin', officeId: 'office-caracas' },
        { id: 'user-operador', name: 'Juan Operador', username: 'operador', password: hashedPassword, roleId: 'role-op', officeId: 'office-valencia' }
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
        { id: 'supp-1', idNumber: 'J-11223344-5', name: 'Repuestos El Gato', phone: '0212-1112233', address: 'Quinta Crespo' },
        { id: 'supp-2', idNumber: 'J-55667788-9', name: 'Papelería El Lápiz', phone: '0212-4445566', address: 'Sabana Grande' }
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

    // --- 8. Plan de Cuentas Contables ---
    console.log('Sembrando Plan de Cuentas...');
    await CuentaContable.bulkCreate([
        // 1. ACTIVO
        { codigo: '1.1.01.00001', nombre: 'EFECTIVO POR DEPOSITAR', tipo: 'Activo' },
        { codigo: '1.1.02.00001', nombre: 'BANCO BANESCO 5215', tipo: 'Activo' },
        { codigo: '1.1.02.00002', nombre: 'BANCO BANESCO 7227', tipo: 'Activo' },
        { codigo: '1.1.02.00003', nombre: 'BANCO PROVINCIAL 8725', tipo: 'Activo' },
        { codigo: '1.1.02.00004', nombre: 'BANCO PROVINCIAL 6795', tipo: 'Activo' },
        { codigo: '1.1.03.01001', nombre: 'CUENTAS POR COBRAR MERIDA TERMINAL', tipo: 'Activo' },
        { codigo: '1.1.03.01002', nombre: 'CUENTAS POR COBRAR MERIDA DEPOSITO', tipo: 'Activo' },
        { codigo: '1.1.03.01003', nombre: 'CUENTAS POR COBRAR SAN CRISTOBAL', tipo: 'Activo' },
        { codigo: '1.1.03.01004', nombre: 'CUENTAS POR COBRAR VALENCIA', tipo: 'Activo' },
        { codigo: '1.1.03.01005', nombre: 'CUENTAS POR COBRAR VALERA', tipo: 'Activo' },
        { codigo: '1.1.03.01006', nombre: 'CUENTAS POR COBRAR BARINAS', tipo: 'Activo' },
        { codigo: '1.1.03.01007', nombre: 'CUENTAS POR COBRAR BARQUISIMETO', tipo: 'Activo' },
        { codigo: '1.1.03.02001', nombre: 'CUENTAS POR COBRAR CLIENTES', tipo: 'Activo' },
        { codigo: '1.1.03.03001', nombre: 'APORTES POR COBRAR ASOCIADOS', tipo: 'Activo' },
        { codigo: '1.1.03.04001', nombre: 'CUENTAS POR COBRAR ASOCIADOS', tipo: 'Activo' },
        { codigo: '1.1.03.05001', nombre: 'OTRAS CUENTAS POR COBRAR', tipo: 'Activo' },
        { codigo: '1.1.04.00001', nombre: 'ISLR ANTICIPADO', tipo: 'Activo' },
        { codigo: '1.1.04.00002', nombre: 'ANTICIPOS DE DIETAS', tipo: 'Activo' },
        { codigo: '1.2.01.0001', nombre: 'INMUEBLES', tipo: 'Activo' },
        { codigo: '1.2.01.0002', nombre: 'VEHICULOS', tipo: 'Activo' },
        { codigo: '1.2.01.0003', nombre: 'EQUIPOS DE COMPUTACION', tipo: 'Activo' },
        { codigo: '1.2.01.0004', nombre: 'MOBILIARIO', tipo: 'Activo' },
        { codigo: '1.2.01.0005', nombre: 'OTROS EQUIPOS DE OFICINA', tipo: 'Activo' },
        { codigo: '1.2.02.0001', nombre: 'IVA CREDITO FISCAL', tipo: 'Activo' },
        { codigo: '1.2.02.0002', nombre: 'SISTEMA ADMINISTRATIVO', tipo: 'Activo' },

        // 2. PASIVO
        { codigo: '2.1.01.00001', nombre: 'APORTES LEGALES POR PAGAR', tipo: 'Pasivo' },
        { codigo: '2.1.01.00002', nombre: 'SERVICIOS BÁSICOS POR PAGAR', tipo: 'Pasivo' },
        { codigo: '2.1.01.00003', nombre: 'FRANQUEO POSTAL POR PAGAR', tipo: 'Pasivo' },
        { codigo: '2.1.01.00004', nombre: 'REMESAS POR PAGAR', tipo: 'Pasivo' },
        { codigo: '2.1.01.00005', nombre: 'REMESAS POR PAGAR POR COBROS A DESTINO', tipo: 'Pasivo' },
        { codigo: '2.1.01.00006', nombre: 'DIETAS POR PAGAR A JUNTA DIRECTIVA', tipo: 'Pasivo' },
        { codigo: '2.2.01.00001', nombre: 'DEP. ACUMULADA DE INMUEBLES', tipo: 'Pasivo' },
        { codigo: '2.2.01.00002', nombre: 'DEP. ACUMULADA DE VEHICULOS', tipo: 'Pasivo' },
        { codigo: '2.2.01.00003', nombre: 'DEP. ACUMULADA DE COMPUTACION', tipo: 'Pasivo' },
        { codigo: '2.2.01.00004', nombre: 'DEP. ACUMULADA DE MOBILIARIO', tipo: 'Pasivo' },
        { codigo: '2.2.01.00005', nombre: 'DEP. ACUMULADA DE EQUIPOS DE OFICINA', tipo: 'Pasivo' },

        // 3. PATRIMONIO
        { codigo: '3.1.01.00001', nombre: 'CERTIFICADOS', tipo: 'Patrimonio' },
        { codigo: '3.1.01.00002', nombre: 'APORTES DE ASOCIADOS', tipo: 'Patrimonio' },
        { codigo: '3.1.01.00003', nombre: 'AJUSTES REVALUACION DE PROPIEDADES', tipo: 'Patrimonio' },
        { codigo: '3.2.01.00001', nombre: 'RESERVA EMERGENCIAS', tipo: 'Patrimonio' },
        { codigo: '3.2.01.00002', nombre: 'FONDOS DE PROTECCION', tipo: 'Patrimonio' },
        { codigo: '3.2.01.00003', nombre: 'FONDO DE EDUCACION', tipo: 'Patrimonio' },
        { codigo: '3.3.01.00001', nombre: 'RESULTADOS DEL EJERCICIO', tipo: 'Patrimonio' },

        // 4. INGRESOS
        { codigo: '4.1.01.00001', nombre: 'INGRESOS ENC. OFIC. CARACAS', tipo: 'Ingreso' },
        { codigo: '4.1.01.00002', nombre: 'INGRESOS ENC. OFIC. MERIDA TERMINAL', tipo: 'Ingreso' },
        { codigo: '4.1.01.00003', nombre: 'INGRESOS ENC. OFIC. MERIDA DEPOSITO', tipo: 'Ingreso' },
        { codigo: '4.1.01.00004', nombre: 'INGRESOS ENC. OFIC. SAN CRISTOBAL', tipo: 'Ingreso' },
        { codigo: '4.1.01.00005', nombre: 'INGRESOS ENC. OFIC. VALERA', tipo: 'Ingreso' },
        { codigo: '4.1.01.00006', nombre: 'INGRESOS ENC. OFIC. VALENCIA', tipo: 'Ingreso' },
        { codigo: '4.1.01.00007', nombre: 'INGRESOS ENC. OFIC. BARINAS', tipo: 'Ingreso' },
        { codigo: '4.1.01.00008', nombre: 'INGRESOS ENC. OFIC. BARQUISIMETO', tipo: 'Ingreso' },
        { codigo: '4.2.01.00001', nombre: 'OTROS INGRESOS', tipo: 'Ingreso' },

        // 5. GASTOS (Costos y Gastos)
        { codigo: '5.1.01.00001', nombre: 'SERVICIOS ASOEXPRES', tipo: 'Gasto' },
        { codigo: '5.1.01.00002', nombre: 'COMBUSTIBLE', tipo: 'Gasto' },
        { codigo: '5.1.01.00003', nombre: 'MMTO Y REPARACION DE VEHICULOS', tipo: 'Gasto' },
        { codigo: '5.1.01.00004', nombre: 'FRANQUEO POSTAL', tipo: 'Gasto' },
        { codigo: '5.1.01.00005', nombre: 'OTROS GASTOS IPOSTEL', tipo: 'Gasto' },
        { codigo: '5.1.01.00006', nombre: 'PERMISOLOGIAS', tipo: 'Gasto' },
        { codigo: '5.1.01.00007', nombre: 'BONO DE PRODUCCION', tipo: 'Gasto' },
        { codigo: '5.2.01.00001', nombre: 'IVSS ASOCIADOS', tipo: 'Gasto' },
        { codigo: '5.2.01.00002', nombre: 'DIETAS JUNTA DIRECTIVA', tipo: 'Gasto' },
        { codigo: '5.2.01.00003', nombre: 'CORPOELEC', tipo: 'Gasto' },
        { codigo: '5.2.01.00004', nombre: 'HIDROCAPITAL', tipo: 'Gasto' },
        { codigo: '5.2.01.00005', nombre: 'CANTV', tipo: 'Gasto' },
        { codigo: '5.2.01.00006', nombre: 'TELEFONIA CELULAR', tipo: 'Gasto' },
        { codigo: '5.2.01.00007', nombre: 'FIBRA OPTICA', tipo: 'Gasto' },
        { codigo: '5.2.01.00008', nombre: 'ALQUILERES DE OFICINA', tipo: 'Gasto' },
        { codigo: '5.2.01.00009', nombre: 'SERVICIOS DE LIMPIEZA', tipo: 'Gasto' },
        { codigo: '5.2.01.00010', nombre: 'VIATICOS Y PASAJES', tipo: 'Gasto' },
        { codigo: '5.2.01.00011', nombre: 'MATERIALES ELECTRICOS', tipo: 'Gasto' },
        { codigo: '5.2.01.00012', nombre: 'MATERIALES FERRETERIA', tipo: 'Gasto' },
        { codigo: '5.2.01.00013', nombre: 'PAPELERIA Y ARTICULOS OFICINA', tipo: 'Gasto' },
        { codigo: '5.2.01.00014', nombre: 'GASTOS GENERALES MTTO OFICINA', tipo: 'Gasto' },
        { codigo: '5.2.01.00015', nombre: 'MTTO COMPUTACION', tipo: 'Gasto' },
        { codigo: '5.2.01.00016', 'nombre': 'MTTO OTROS EQUIPOS', tipo: 'Gasto' },
        { codigo: '5.2.01.00017', nombre: 'GASTOS LEGALES', tipo: 'Gasto' },
        { codigo: '5.2.01.00018', nombre: 'IMPUESTOS MUNICIPALES', tipo: 'Gasto' },
        { codigo: '5.2.01.00019', nombre: 'ISLR', tipo: 'Gasto' },
        { codigo: '5.2.01.00020', nombre: 'HONORARIOS PROFESIONALES', tipo: 'Gasto' },
        { codigo: '5.2.01.00021', nombre: 'ESTACIONAMIENTO', tipo: 'Gasto' },
        { codigo: '5.2.01.00022', nombre: 'FACTURACION DIGITAL', tipo: 'Gasto' },
        { codigo: '5.2.01.00023', nombre: 'OTROS GASTOS', tipo: 'Gasto' },
        { codigo: '5.2.02.00001', nombre: 'COMISIONES BANESCO 5215', tipo: 'Gasto' },
        { codigo: '5.2.02.00002', nombre: 'COMISIONES BANESCO 7227', tipo: 'Gasto' },
        { codigo: '5.2.02.00003', nombre: 'COMISIONES PROVINCIAL 8725', tipo: 'Gasto' },
        { codigo: '5.2.02.00004', nombre: 'COMISIONES PROVINCIAL 6795', tipo: 'Gasto' },
    ], { updateOnDuplicate: ['nombre', 'tipo', 'codigo'] });
    console.log('Plan de cuentas sembrado.');

    // --- 9. Asiento Manual de Ejemplo ---
    console.log('Sembrando Asiento Manual de ejemplo...');
    const [asiento, created] = await AsientoManual.findOrCreate({
        where: { id: 'am-seed-1' },
        defaults: {
            id: 'am-seed-1',
            fecha: new Date(),
            descripcion: 'Asiento de apertura de caja',
            userId: 'user-admin'
        }
    });
    if (created) {
        // CORRECCIÓN: Buscar las cuentas por su código para obtener sus IDs UUID reales.
        const cuentaCaja = await CuentaContable.findOne({ where: { codigo: '1.1.01.00001' } }); // EFECTIVO POR DEPOSITAR
        const cuentaBancos = await CuentaContable.findOne({ where: { codigo: '1.1.02.00001' } }); // BANCO BANESCO 5215

        await AsientoManualEntry.bulkCreate([
            { id: 'ame-1', asientoManualId: asiento.id, cuentaId: cuentaCaja.id, debe: 500.00, haber: 0.00 },
            { id: 'ame-2', asientoManualId: asiento.id, cuentaId: cuentaBancos.id, debe: 0.00, haber: 500.00 }
        ]);
        console.log('Asiento manual de ejemplo creado.');
    } else {
        console.log('Asiento manual de ejemplo ya existía.');
    }

    // --- 10. Factura de Ejemplo ---
    console.log('Sembrando Factura de ejemplo...');
    await Invoice.findOrCreate({
        where: { id: 'inv-seed-1' },
        defaults: {
            id: 'inv-seed-1',
            invoiceNumber: 'F-000001',
            controlNumber: '00000001',
            date: new Date(),
            clientName: 'Maria Rodriguez',
            clientIdNumber: 'V-12345678-9',
            totalAmount: 116.00,
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
            guide: {
                sender: { id: 'client-1', name: 'Maria Rodriguez', idNumber: 'V-12345678-9' },
                receiver: { id: 'client-2', name: 'Comercial XYZ', idNumber: 'J-87654321-0', address: 'El Rosal, Caracas' },
                merchandise: [{ quantity: 2, description: 'Cajas de repuestos', weight: 10, price: 58 }]
            }
        }
    });
    console.log('Factura de ejemplo verificada o creada.');

  } catch (error) {
    console.error('Error durante la siembra de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();