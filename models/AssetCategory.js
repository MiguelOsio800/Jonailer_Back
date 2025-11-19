import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const AssetCategory = sequelize.define('AssetCategory', {
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

export default AssetCategory;