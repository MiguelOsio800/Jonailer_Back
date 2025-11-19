import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  idNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.TEXT,
  },
});

export default Supplier;