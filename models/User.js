import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roleId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Roles',
      key: 'id',
    },
  },
  officeId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Offices',
      key: 'id',
    },
  },
});

// Hook para hashear la contraseña automáticamente antes de crear o actualizar.
const hashPassword = async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
};

User.beforeCreate(hashPassword);
User.beforeUpdate(hashPassword);

export default User;