import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const InventoryItem = sequelize.define('InventoryItem', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    sku: {
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
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    unit: {
        type: DataTypes.STRING, // 'unidad', 'caja', 'kg', etc.
        allowNull: false,
    },
    invoiceId: {
        type: DataTypes.STRING,
        allowNull: true, // Puede ser null si es un item manual
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    shippingStatus: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    weight: {
        type: DataTypes.FLOAT,
        allowNull: true,
    }
}, {
    timestamps: true,
});

export default InventoryItem;