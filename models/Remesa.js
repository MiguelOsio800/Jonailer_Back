import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Remesa = sequelize.define('Remesa', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    remesaNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    asociadoId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'Asociados', key: 'id' }
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
    totalAmount: { // Suma de los montos de las facturas
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    totalPackages: { // Suma de todos los paquetes
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    totalWeight: { // Suma de los pesos facturados
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    cooperativeAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    officeId: {
        type: DataTypes.STRING,
        allowNull: true, // Ponlo en true inicialmente si ya hay datos, luego puedes cambiarlo a false tras limpiar la data
        references: { model: 'Offices', key: 'id' } // Asegúrate de que el nombre de la tabla sea correcto ('Offices')
    },
    exchangeRate: { // NUEVO: Tasa de cambio guardada al momento de crear la remesa
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.00,
    },
}, {
    timestamps: true,
});

export default Remesa;
