import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING, // Cambiado de INTEGER a STRING
    allowNull: false,
    unique: true,
  },
  controlNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  clientIdNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Activa', 'Anulada'),
    defaultValue: 'Activa',
  },
  paymentStatus: {
    type: DataTypes.ENUM('Pagada', 'Pendiente'),
    defaultValue: 'Pendiente',
  },
  shippingStatus: {
    type: DataTypes.ENUM('Pendiente para Despacho', 'En Tránsito', 'Entregada'),
    defaultValue: 'Pendiente para Despacho',
  },
  guide: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  vehicleId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Vehicles',
      key: 'id'
    }
  },
  remesaId: { // Campo para la relación con Remesa
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

export default Invoice;