import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ShippingType = sequelize.define('ShippingType', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: false,
});

export default ShippingType;