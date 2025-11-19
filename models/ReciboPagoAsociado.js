import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ReciboPagoAsociado = sequelize.define('ReciboPagoAsociado', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    comprobanteNumero: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    asociadoId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Asociados',
            key: 'id'
        }
    },
    fechaPago: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    montoTotalBs: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    tasaBcv: {
        type: DataTypes.FLOAT,
    },
    pagosIds: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
    },
    detallesPago: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
});

export default ReciboPagoAsociado;