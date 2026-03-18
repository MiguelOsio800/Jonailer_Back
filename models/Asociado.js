import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Asociado = sequelize.define('Asociado', {
    id: {
        type: DataTypes.STRING,
        defaultValue: DataTypes.UUIDV4, // Generación automática segura
        primaryKey: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: "El código de asociado ya existe." },
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cedula: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: "La cédula ya está registrada." },
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
        validate: { isEmail: { msg: "Formato de correo inválido." } },
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