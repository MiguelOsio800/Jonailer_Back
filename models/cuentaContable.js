import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CuentaContable = sequelize.define('CuentaContable', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'),
        allowNull: false,
    },
}, {
    timestamps: true,
    paranoid: true, // Habilita soft deletes
});

export default CuentaContable;