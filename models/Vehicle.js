import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Vehicle = sequelize.define('Vehicle', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    asociadoId: { // Clave foránea para la relación con Asociado
        type: DataTypes.STRING,
        allowNull: false,
    },
    placa: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    modelo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ano: DataTypes.INTEGER,
    color: DataTypes.STRING,
    serialCarroceria: DataTypes.STRING,
    serialMotor: DataTypes.STRING,
    tipo: DataTypes.STRING,
    uso: DataTypes.STRING,
    servicio: DataTypes.STRING,
    nroPuestos: DataTypes.INTEGER,
    nroEjes: DataTypes.INTEGER,
    tara: DataTypes.FLOAT,
    capacidadCarga: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    clase: DataTypes.STRING,
    actividadVehiculo: DataTypes.STRING,
    status: {
        type: DataTypes.ENUM('Disponible', 'En Ruta', 'En Mantenimiento'),
        defaultValue: 'Disponible',
    },
    driver: DataTypes.STRING,
    imageUrl: DataTypes.TEXT,
});

export default Vehicle;