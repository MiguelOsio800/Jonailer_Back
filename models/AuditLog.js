import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    targetId: {
        type: DataTypes.STRING,
    },
});

export default AuditLog;