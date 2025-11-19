import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear una instancia de Sequelize con las credenciales de la base de datos
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // Poner en `console.log` para ver las consultas SQL en la terminal
  }
);