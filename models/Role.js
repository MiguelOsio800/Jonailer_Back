import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  permissions: {
    type: DataTypes.JSONB, // Usamos JSONB para un almacenamiento eficiente de JSON en Postgres
    allowNull: false,
    defaultValue: {},
  },
}, {
  timestamps: false, // No necesitamos createdAt/updatedAt para los roles
});

export default Role;