import { sequelize } from '../config/db.js';
import Role from './Role.js';
import Office from './Office.js';
import User from './User.js';
import Client from './Client.js';
import Vehicle from './Vehicle.js';
import Invoice from './Invoice.js';
import Category from './Category.js';
import ShippingType from './ShippingType.js';
import PaymentMethod from './PaymentMethod.js';
import Supplier from './Supplier.js';
import ExpenseCategory from './ExpenseCategory.js';
import Expense from './Expense.js';
import AssetCategory from './AssetCategory.js';
import Asset from './Asset.js';
import AuditLog from './AuditLog.js';
import CompanyInfo from './CompanyInfo.js';
// Nuevos modelos del módulo de asociados
import Asociado from './Asociado.js';
import Certificado from './Certificado.js';
import PagoAsociado from './PagoAsociado.js';
import ReciboPagoAsociado from './ReciboPagoAsociado.js';
import Remesa from './Remesa.js';
import CuentaContable from './cuentaContable.js';
import Product from './Product.js';
import InventoryItem from './InventoryItem.js'; 

import AsientoManual from './AsientoManual.js';
import AsientoManualEntry from './AsientoManualEntry.js';
// --- Definición de Relaciones ---

// User <-> Role
User.belongsTo(Role, { foreignKey: 'roleId' });
Role.hasMany(User, { foreignKey: 'roleId' });

// User <-> Office
User.belongsTo(Office, { foreignKey: 'officeId' });
Office.hasMany(User, { foreignKey: 'officeId' });

// Asociado <-> Vehicle
Vehicle.belongsTo(Asociado, { foreignKey: 'asociadoId' });
Asociado.hasMany(Vehicle, { foreignKey: 'asociadoId' });

// Vehicle <-> Certificado
Certificado.belongsTo(Vehicle, { foreignKey: 'vehiculoId' });
Vehicle.hasMany(Certificado, { foreignKey: 'vehiculoId' });

// Invoice <-> Vehicle
Invoice.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
Vehicle.hasMany(Invoice, { foreignKey: 'vehicleId' });

// Expense Relations
Expense.belongsTo(Office, { foreignKey: 'officeId' });
Office.hasMany(Expense, { foreignKey: 'officeId' });

Expense.belongsTo(PaymentMethod, { foreignKey: 'paymentMethodId' });
PaymentMethod.hasMany(Expense, { foreignKey: 'paymentMethodId' });

Expense.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(Expense, { foreignKey: 'supplierId' });

// Asset Relations
Asset.belongsTo(Office, { foreignKey: 'officeId' });
Office.hasMany(Asset, { foreignKey: 'officeId' });

Asset.belongsTo(AssetCategory, { as: 'category', foreignKey: 'categoryId' });
AssetCategory.hasMany(Asset, { as: 'assets', foreignKey: 'categoryId' });

// Asociado Payment Relations
PagoAsociado.belongsTo(Asociado, { foreignKey: 'asociadoId' });
Asociado.hasMany(PagoAsociado, { foreignKey: 'asociadoId' });

ReciboPagoAsociado.belongsTo(Asociado, { foreignKey: 'asociadoId' });
Asociado.hasMany(ReciboPagoAsociado, { foreignKey: 'asociadoId' });

// Remesa Relations
Remesa.belongsTo(Asociado, { foreignKey: 'asociadoId' });
Asociado.hasMany(Remesa, { foreignKey: 'asociadoId' });

Remesa.belongsTo(Vehicle, { foreignKey: 'vehicleId' });
Vehicle.hasMany(Remesa, { foreignKey: 'vehicleId' });

// Asiento Manual Relations
AsientoManual.hasMany(AsientoManualEntry, { as: 'entries', foreignKey: 'asientoManualId', onDelete: 'CASCADE' });
AsientoManualEntry.belongsTo(AsientoManual, { foreignKey: 'asientoManualId' });

AsientoManualEntry.belongsTo(CuentaContable, { as: 'cuenta', foreignKey: 'cuentaId' });
CuentaContable.hasMany(AsientoManualEntry, { foreignKey: 'cuentaId' });

AsientoManual.belongsTo(User, { as: 'createdBy', foreignKey: 'userId' });
User.hasMany(AsientoManual, { foreignKey: 'userId' });

// --- Sincronización de la Base de Datos ---
const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter : true }); // Usamos 'force' temporalmente
    } catch (error) {
        console.error('--- ERROR DURANTE LA SINCRONIZACIÓN ---:', error);
    }
};

export {
    sequelize,
    syncDatabase,
    Role, Office, User, Client, Vehicle, Invoice, Category, ShippingType,
    PaymentMethod, Supplier, ExpenseCategory, Expense, AssetCategory, Asset,
    AuditLog, CompanyInfo, Asociado, Certificado, PagoAsociado, ReciboPagoAsociado, Remesa, CuentaContable, AsientoManual, AsientoManualEntry,
    Product,InventoryItem
};