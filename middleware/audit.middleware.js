import { AuditLog } from '../models/index.js';

/**
 * Middleware de auditoría que registra una acción en la base de datos.
 * Es un middleware de orden superior que se configura con una acción y una función para obtener detalles.
 *
 * @param {string} action - La descripción de la acción a registrar (ej. "Creó una factura").
 * @param {(req, resBody) => { details: string, targetId: string }} getDetails - Una función que extrae detalles y el ID del objetivo desde la solicitud y el cuerpo de la respuesta.
 */
export const auditAction = (action, getDetails) => {
    return (req, res, next) => {
        // Guardamos la función original res.json para poder llamarla después.
        const originalJson = res.json;
        let responseBody = null;

        // Sobrescribimos res.json para interceptar el cuerpo de la respuesta.
        res.json = (body) => {
            responseBody = body;
            res.json = originalJson; // Restauramos la función original.
            return res.json(body); // Llamamos a la función original para enviar la respuesta.
        };

        // El evento 'finish' se dispara cuando la respuesta se ha enviado completamente.
        res.on('finish', async () => {
            try {
                // Solo registramos si la operación fue exitosa (status 2xx) y si hay un usuario logueado.
                if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                    const { user } = req;

                    // Usamos la función getDetails para extraer información específica de la ruta.
                    const { details, targetId } = getDetails(req, responseBody);

                    await AuditLog.create({
                        id: `log-${Date.now()}`,
                        timestamp: new Date(),
                        userId: user.id,
                        userName: user.name,
                        action: action,
                        details: details,
                        targetId: targetId,
                    });
                }
            } catch (error) {
                // Si la auditoría falla, no queremos que la aplicación se caiga.
                // Simplemente lo registramos en la consola.
                console.error('Error al registrar la acción de auditoría:', error);
            }
        });

        next();
    };
};