import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Certificado = sequelize.define('Certificado', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    vehiculoId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Vehicles',
            key: 'id'
        }
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    fechaInicio: {
        type: DataTypes.DATEONLY,
    },
    fechaSuspension: {
        type: DataTypes.DATEONLY,
    },
    rutaVehiculo: {
        type: DataTypes.STRING,
    },
    status: {
        type: DataTypes.ENUM('Activo', 'Inactivo', 'Suspendido', 'Excluido'),
        defaultValue: 'Activo',
    },
});

export default Certificado;