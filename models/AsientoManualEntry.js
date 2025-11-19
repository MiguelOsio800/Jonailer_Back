import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const AsientoManualEntry = sequelize.define('AsientoManualEntry', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  // El ID de la cuenta contable se añade a través de la relación
  // El ID del asiento manual se añade a través de la relación
  debe: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  haber: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  timestamps: false, // Estas líneas no necesitan sus propias marcas de tiempo
});

export default AsientoManualEntry;