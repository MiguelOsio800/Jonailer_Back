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
  // --- NUEVO: Campo para la serie de facturación HKA ---
  hkaSerie: {
    type: DataTypes.STRING,
    allowNull: true, 
    defaultValue: null, // Ej: "A", "B"
    comment: "Serie de facturación HKA asignada a esta oficina"
  }
}, {
  timestamps: false,
});

export default Office;