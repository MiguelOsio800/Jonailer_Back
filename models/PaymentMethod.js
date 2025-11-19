import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const PaymentMethod = sequelize.define('PaymentMethod', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Efectivo', 'Transferencia', 'PagoMovil', 'Credito', 'Otro'),
    allowNull: false,
  },
  bankName: {
    type: DataTypes.STRING,
  },
  accountNumber: {
    type: DataTypes.STRING,
  },
  accountType: {
    type: DataTypes.ENUM('corriente', 'ahorro'),
  },
  beneficiaryName: {
    type: DataTypes.STRING,
  },
  beneficiaryId: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: false,
});

export default PaymentMethod;