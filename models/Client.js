import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    idNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    clientType: {
        type: DataTypes.ENUM('persona', 'empresa'),
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
});

export default Client;