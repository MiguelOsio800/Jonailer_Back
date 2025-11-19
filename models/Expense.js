import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Expense = sequelize.define('Expense', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    category: { // Mantenemos como string simple como en tu `types.ts`
        type: DataTypes.STRING,
        allowNull: false,
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Pagado', 'Pendiente'),
        defaultValue: 'Pendiente',
    },
    supplierRif: { type: DataTypes.STRING },
    supplierName: { type: DataTypes.STRING },
    invoiceNumber: { type: DataTypes.STRING },
    controlNumber: { type: DataTypes.STRING },
    taxableBase: { type: DataTypes.FLOAT },
    vatAmount: { type: DataTypes.FLOAT },
    officeId: {
        type: DataTypes.STRING,
        references: { model: 'Offices', key: 'id' }
    },
    paymentMethodId: {
        type: DataTypes.STRING,
        references: { model: 'PaymentMethods', key: 'id' }
    }
});

export default Expense;