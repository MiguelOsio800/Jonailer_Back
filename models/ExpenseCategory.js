import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ExpenseCategory = sequelize.define('ExpenseCategory', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
}, {
    timestamps: false,
});

export default ExpenseCategory;