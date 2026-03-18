// Archivo: models/PagoAsociado.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const PagoAsociado = sequelize.define('PagoAsociado', {
    id: {
        type: DataTypes.STRING, // Nota: Asegúrate de que esto siga como lo configuramos (UUID o STRING manual)
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
    // 👇 NUEVO CAMPO: Congela la tasa del día en que se generó la deuda
    tasaCambio: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1, 
    },
    // ❌ ELIMINADO: fechaVencimiento 
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