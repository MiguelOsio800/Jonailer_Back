import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const PagoAsociado = sequelize.define('PagoAsociado', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    asociadoId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Asociados',
            key: 'id'
        }
    },
    concepto: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cuotas: {
        type: DataTypes.STRING,
    },
    montoBs: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    montoUsd: {
        type: DataTypes.FLOAT,
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Pendiente', 'Pagado'),
        defaultValue: 'Pendiente',
    },
    reciboId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

export default PagoAsociado;