import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CompanyInfo = sequelize.define('CompanyInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false, // No se autoincrementa, usaremos un ID fijo
    defaultValue: 1, // Siempre usaremos el ID 1
  },
  name: { type: DataTypes.STRING, allowNull: false },
  rif: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING },
  logoUrl: { type: DataTypes.TEXT },
  loginImageUrl: { type: DataTypes.TEXT },
  costPerKg: { type: DataTypes.FLOAT },
  bcvRate: { type: DataTypes.FLOAT },
  postalLicense: { type: DataTypes.STRING },
  lastInvoiceNumber: { type: DataTypes.INTEGER },
}, {
  timestamps: false, // No necesitamos timestamps para esta tabla
});

export default CompanyInfo;