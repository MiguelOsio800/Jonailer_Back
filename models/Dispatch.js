import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Dispatch = sequelize.define('Dispatch', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    dispatchNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    vehicleId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'Vehicles', key: 'id' }
    },
    invoiceIds: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
    },
    originOfficeId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'Offices', key: 'id' }
    },
    destinationOfficeId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'Offices', key: 'id' }
    },
    status: {
        type: DataTypes.ENUM('En Tránsito', 'Recibido', 'Anulado'),
        allowNull: false,
        defaultValue: 'En Tránsito',
    },
    receivedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    receivedBy: {
        type: DataTypes.STRING, // ID del usuario que recibe
        allowNull: true,
    },
}, {
    timestamps: true,
});

export default Dispatch;