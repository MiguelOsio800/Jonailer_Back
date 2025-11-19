import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const AsientoManual = sequelize.define('AsientoManual', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  fecha: {
    type: DataTypes.DATEONLY, // Almacena solo la fecha en formato "YYYY-MM-DD"
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true, // Mantiene createdAt y updatedAt para auditoría
});

export default AsientoManual;