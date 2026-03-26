// Importamos la función que ya tienes definida en tus modelos
import { syncDatabase, sequelize } from './models/index.js';

const iniciarSincronizacion = async () => {
    try {
        console.log("⏳ Conectando a la base de datos...");
        await sequelize.authenticate();
        console.log("✅ Conexión establecida correctamente.");

        console.log("⏳ Sincronizando modelos con la base de datos...");
        // Esto creará toda la estructura de tablas y relaciones
        await syncDatabase();
        
        console.log("🚀 ¡Estructura de la base de datos montada exitosamente!");
        process.exit(0); // Cierra el script exitosamente
    } catch (error) {
        console.error("❌ Error al montar la base de datos:", error);
        process.exit(1); // Cierra el script con error
    }
};

iniciarSincronizacion();