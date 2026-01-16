import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Vehicle = sequelize.define('Vehicle', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    asociadoId: { 
        // Se mantiene obligatorio para asegurar que cada vehículo pertenezca a un dueño
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
    ano: {
        type: DataTypes.INTEGER,
        allowNull: true, // Permite registro rápido sin año
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    serialCarroceria: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    serialMotor: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    uso: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    servicio: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    nroPuestos: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    nroEjes: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    tara: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    capacidadCarga: {
        type: DataTypes.FLOAT,
        allowNull: true, // Flexibilizado para el registro simplificado del frontend
        defaultValue: 0,
    },
    clase: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    actividadVehiculo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Disponible', 'En Ruta', 'En Mantenimiento'),
        defaultValue: 'Disponible', // Valor inicial automático
    },
    driver: {
        type: DataTypes.STRING,
        allowNull: true, // El conductor puede asignarse luego
    },
    imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
});

export default Vehicle;