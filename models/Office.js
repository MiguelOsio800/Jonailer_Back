import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Office = sequelize.define('Office', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // --- Campo para la serie de facturación HKA (A, B, C...) ---
  hkaSerie: {
    type: DataTypes.STRING,
    allowNull: true, 
    defaultValue: null,
    comment: "Serie de facturación HKA asignada a esta oficina"
  },
  // --- NUEVO: Campo vital para el contador de facturas ---
  lastInvoiceNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  timestamps: false,
});

export default Office;