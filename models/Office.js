import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Office = sequelize.define('Office', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  code: {
    type: DataTypes.STRING,
    allowNull: true, // O 'false' si quieres que sea obligatorio
    unique: true, // Para asegurar que no haya dos oficinas con el mismo código
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
  // --- NUEVO CAMPO PARA HKA ---
  hkaSerie: {
    type: DataTypes.STRING,
    allowNull: true, // Puede ser null si la oficina no factura
    comment: "Serie de facturación para HKA (Ej: A, B, C)"
  }
}, {
  timestamps: false,
});

export default Office;