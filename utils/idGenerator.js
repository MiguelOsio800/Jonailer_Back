// C:\Users\Miguel_Dev\Desktop\backend-on-main\utils\idGenerator.js

/**
 * Genera un ID único con un prefijo.
 * @param {string} prefix El prefijo a utilizar (e.g., 'DSP', 'INV', 'CLI').
 * @returns {string} El ID único generado (e.g., 'DSP_1700000000000_1234').
 */
export const generateUniqueId = (prefix = 'ID') => {
    // Genera una cadena única utilizando el prefijo, el timestamp actual y un número aleatorio.
    const timestamp = new Date().getTime();
    // Generamos un sufijo aleatorio de 4 dígitos (1000 a 9999)
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000; 
    
    return `${prefix}_${timestamp}_${randomSuffix}`;
};