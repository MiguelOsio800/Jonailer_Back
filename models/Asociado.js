import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Asociado = sequelize.define('Asociado', {
    id: {
        type: DataTypes.STRING,
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
    cedula: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    fechaNacimiento: {
        type: DataTypes.DATEONLY,
    },
    fechaIngreso: {
        type: DataTypes.DATEONLY,
    },
    telefono: {
        type: DataTypes.STRING,
    },
    correoElectronico: {
        type: DataTypes.STRING,
        validate: {
            isEmail: true,
        },
    },
    direccion: {
        type: DataTypes.TEXT,
    },
    status: {
        type: DataTypes.ENUM('Activo', 'Inactivo', 'Suspendido'),
        defaultValue: 'Activo',
    },
    observaciones: {
        type: DataTypes.TEXT,
    },
}, {
    timestamps: true,
});

export default Asociado;