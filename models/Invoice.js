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
  },
  // Nuevo campo para guardar el nombre del oficinista
  createdByName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
  // =======================================================
  // CAMPOS ADICIONALES REQUERIDOS PARA HKA / INFORMES
  // =======================================================
  handlingFee: { // Monto por manejo (solicitado)
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  ipostelFee: { // Monto Ipostel (solicitado implícitamente)
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  insuranceAmount: { // Monto Seguro (solicitado en InfoAdicional)
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  exchangeRate: { // Tipo de cambio para el equivalente USD/USDT
    type: DataTypes.FLOAT,
    defaultValue: 1.00,
    allowNull: false,
  }
  
}, {
  timestamps: true,
});

export default Invoice;