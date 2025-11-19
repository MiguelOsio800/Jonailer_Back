import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Category = sequelize.define('Category', {
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
  tableName: 'MerchandiseCategories', // Un nombre más específico para la tabla
});

export default Category;