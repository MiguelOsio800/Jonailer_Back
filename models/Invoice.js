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
  // --- NUEVO: Campo para el email del cliente ---
  clientEmail: { 
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
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
  // NUEVO CAMPO: MONTO BASE DEL FLETE
  // =======================================================
  montoFlete: { // Monto Base del Flete (630.00 en el ejemplo)
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  
  // =======================================================
  // CAMPOS DE COSTOS Y MONEDA ADICIONALES (AJUSTADOS)
  // =======================================================
  Montomanejo: { // Monto por manejo (Anteriormente handlingFee)
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  ipostelFee: { // Monto Ipostel
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  insuranceAmount: { // Monto Seguro
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  exchangeRate: { // Tipo de cambio para el equivalente USD/USDT
    type: DataTypes.FLOAT,
    defaultValue: 1.00,
    allowNull: false,
  },
  
  // =======================================================
  // CAMPOS DE DESCUENTO (NUEVOS)
  // =======================================================
  discountAmount: { // Monto total del descuento aplicado
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  // models/Invoice.js
// ... (al final de los campos, antes de timestamps)

  discountPercentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0.00,
    allowNull: false,
  },
  
  // NUEVO CAMPO PARA LA RUTA
  specificDestination: {
    type: DataTypes.STRING, // Permite texto, números y símbolos
    allowNull: true,
  },

  // CAMPOS DEL QUE RECIBE

  receiverName: {
    type: DataTypes.STRING,
    allowNull: true // Obligatorio para asegurar consistencia
  },
  receiverIdNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receiverAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiverPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receiverEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
}, {
  timestamps: true,
});

export default Invoice;