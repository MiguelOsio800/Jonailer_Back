import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    purchaseDate: {
        type: DataTypes.DATEONLY,
    },
    purchaseValue: {
        type: DataTypes.FLOAT,
    },
    status: {
        type: DataTypes.ENUM('Activo', 'En Mantenimiento', 'De Baja'),
        defaultValue: 'Activo',
    },
    imageUrl: {
        type: DataTypes.TEXT,
    },
    officeId: {
        type: DataTypes.STRING,
        references: { model: 'Offices', key: 'id' }
    },
    categoryId: {
        type: DataTypes.STRING,
        references: { model: 'AssetCategories', key: 'id' }
    }
});

export default Asset;