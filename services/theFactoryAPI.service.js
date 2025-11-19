import axios from 'axios';
import dotenv from 'dotenv';
import { CompanyInfo } from '../models/index.js';

dotenv.config();

const API_URL_AUTH = 'https://demoemisionv2.thefactoryhka.com.ve/api/autenticacion';
const API_URL_EMISION = 'https://demoemisionv2.thefactoryhka.com.ve/api/Emision';

// --- MEJORA: Caché en memoria para el token ---
let cachedToken = {
    token: null,
    expires: 0, // Timestamp de expiración
};

// Función para obtener el token, con caché.
const getAuthToken = async () => {
    try {
        console.log("Intentando autenticar con The Factory HKA...");
        const usuario = process.env.HKA_USUARIO;
        const clave = process.env.HKA_CLAVE;

        if (!usuario || !clave) {
            throw new Error('Las credenciales HKA_USUARIO y HKA_CLAVE no están definidas en el archivo .env');
        }

        // Si tenemos un token y no ha expirado, lo reutilizamos.
        if (cachedToken.token && Date.now() < cachedToken.expires) {
            console.log("Usando token de HKA cacheado.");
            return cachedToken.token;
        }

        console.log("Solicitando nuevo token de HKA...");
        const response = await axios.post(API_URL_AUTH, {
            usuario: usuario,
            clave: clave
        });

        if (!response.data?.token) {
            throw new Error('La respuesta de la API de autenticación no contenía un token.');
        }

        // Guardamos el token y calculamos su tiempo de expiración (ej: 50 minutos para un token de 1 hora)
        cachedToken.token = response.data.token;
        cachedToken.expires = Date.now() + 50 * 60 * 1000; // Cache por 50 mins
        console.log("Token de HKA obtenido exitosamente.");
        return cachedToken.token;

    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!! ERROR DE AUTENTICACIÓN HKA !!!!!!!!!!!!!!!!!!");
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error', error.message);
        }
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        throw new Error('No se pudo autenticar con The Factory HKA. Revisa las credenciales.');
    }
};

export const sendInvoiceToHKA = async (invoice) => {
    try {
        // --- MEJORA: Obtener datos de la empresa desde la BD ---
        const companyInfo = await CompanyInfo.findByPk(1);
        if (!companyInfo) {
            throw new Error('No se encontró la información de la empresa para la facturación.');
        }

        const token = await getAuthToken();

        // --- MEJORA: Mapeo de officeId a serie de factura HKA ---
        const officeSeriesMap = {
            'office-caracas': 'A', // Oficina Principal sede Caracas
            'office-terminal-bandera': 'B', // Oficina Terminal la bandera
            'office-valencia': 'C', // Oficina Valencia
            'office-barquisimeto-deposito': 'D', // Oficina Barquisimeto Depósito
            'office-maracaibo-terminal': 'E', // Oficina Maracaibo Terminal
            'office-maracaibo-deposito': 'F', // Oficina Maracaibo Deposito
            'office-valera-terminal': 'G', // Oficina Valera terminal
            'office-barinas-terminal': 'H', // Oficina Barinas terminal
            'office-guanare-terminal': 'I', // Oficina Guanare Terminal
            'office-bocono-terminal': 'J', // Oficina BoconoTerminal
            'office-merida-terminal': 'K', // Oficina Mérida Terminal
            'office-merida-deposito': 'L', // Oficina Mérida deposito
            'office-san-cristobal-terminal': 'M', // Oficina San Cristóbal Terminal
            'office-san-cristobal-deposito': 'N', // Oficina San Cristóbal Deposito
        };

        // --- MEJORA: Formato de fecha y hora simplificado ---
        const serie = officeSeriesMap[invoice.officeId] || ""; // Obtener serie por officeId, si no se encuentra, se deja vacía.
        const numero = invoice.invoiceNumber; // El número es el invoiceNumber completo
        const fechaEmision = new Date(invoice.date);

        // --- CORRECCIÓN: Asegurar formato dd/MM/AAAA con ceros iniciales ---
        // Usamos UTC para evitar problemas de zona horaria con DATEONLY
        const day = String(fechaEmision.getUTCDate()).padStart(2, '0');
        const month = String(fechaEmision.getUTCMonth() + 1).padStart(2, '0'); // getMonth() es 0-indexado
        const year = fechaEmision.getUTCFullYear();
        const fechaFormateada = `${day}/${month}/${year}`;

        const horaFormateada = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Caracas' }).toLowerCase(); // hh:mm:ss am/pm
        
        // --- MEJORA: Lógica de impuestos más clara ---
        const IVA_RATE = 0.16; // 16%
        let subTotalGeneral = 0;
        let ivaGeneral = 0;

        // CORRECCIÓN: Usar el totalAmount de la factura en lugar de recalcular desde items sin precio.
        // Si la factura tiene un total, lo usamos como la fuente de la verdad.
        if (invoice.totalAmount && invoice.totalAmount > 0) {
            subTotalGeneral = invoice.totalAmount / (1 + IVA_RATE);
            ivaGeneral = invoice.totalAmount - subTotalGeneral;
        }

        // --- CORRECCIÓN: Distribuir el total proporcionalmente entre los items ---
        const totalQuantity = (invoice.guide?.merchandise || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

        const detalles = (invoice.guide?.merchandise || []).map((item, index) => {
            const cantidad = item.quantity || 0;
            let itemSubtotal = 0;
            let itemIva = 0;

            // Si hay cantidad total, distribuimos. Si no, evitamos división por cero.
            if (totalQuantity > 0) {
                const proportion = cantidad / totalQuantity;
                itemSubtotal = subTotalGeneral * proportion;
                itemIva = ivaGeneral * proportion;
            }

            const precioItemRedondeado = parseFloat(itemSubtotal.toFixed(2));
            const valorIvaRedondeado = parseFloat(itemIva.toFixed(2));
            const valorTotalItem = precioItemRedondeado + valorIvaRedondeado;

            return {
                "NumeroLinea": (index + 1).toString(),
                "CodigoPLU": item.sku || `GEN-${index + 1}`,
                "Descripcion": item.description,
                "Cantidad": cantidad.toString(),
                "PrecioUnitario": (cantidad > 0 ? itemSubtotal / cantidad : 0).toFixed(2).toString(),
                "PrecioItem": precioItemRedondeado.toFixed(2).toString(),
                "CodigoImpuesto": "G", // G para IVA General
                "TasaIVA": (IVA_RATE * 100).toFixed(0),
                "ValorIVA": valorIvaRedondeado.toFixed(2).toString(),
                // CORRECCIÓN: Sumar los valores ya redondeados para evitar discrepancias.
                "ValorTotalItem": valorTotalItem.toFixed(2).toString()
            };
        });

        // Dependencia para convertir número a letras (se debe instalar)
        // npm install numero-a-letras
        const { NumerosALetras } = await import('numero-a-letras');
        const totalGeneral = subTotalGeneral + ivaGeneral;

        // --- MEJORA: Tipo de identificación del comprador dinámico ---
        const idType = (invoice.clientIdNumber.charAt(0) || 'V').toUpperCase();
        
        const hkaInvoicePayload = {
            "DocumentoElectronico": {
                "Encabezado": {
                    "IdentificacionDocumento": {
                        "TipoDocumento": "01", // 01 para Factura
                        "Serie": serie,
                        "NumeroDocumento": numero,
                        "FechaEmision": fechaFormateada,
                        "HoraEmision": horaFormateada,
                        "TipoDeVenta": "1", // 1 para Venta Interna
                        "Moneda": "VES", // Moneda del documento
                    },
                    "Emisor": {
                        "TipoIdentificacion": (companyInfo.rif.charAt(0) || 'J').toUpperCase(),
                        "NumeroIdentificacion": companyInfo.rif,
                        "RazonSocial": companyInfo.name,
                        "Direccion": companyInfo.address,
                        "Telefono": [companyInfo.phone] // Debe ser un array
                    },
                    "Comprador": {
                        "TipoIdentificacion": idType,
                        "NumeroIdentificacion": invoice.clientIdNumber,
                        "RazonSocial": invoice.clientName,
                        "Direccion": invoice.guide?.receiver?.address || 'N/A',
                        "Pais": "VE",
                        "Telefono": [invoice.guide?.receiver?.phone || '0000-0000000'] // Debe ser un array
                    },
                    "Totales": {
                        "NroItems": detalles.length.toString(),
                        "MontoGravadoTotal": subTotalGeneral.toFixed(2).toString(),
                        "MontoExentoTotal": "0.00",
                        "Subtotal": subTotalGeneral.toFixed(2).toString(),
                        "TotalIVA": ivaGeneral.toFixed(2).toString(),
                        "MontoTotalConIVA": totalGeneral.toFixed(2).toString(),
                        "TotalAPagar": totalGeneral.toFixed(2).toString(),
                        "MontoEnLetras": NumerosALetras(totalGeneral, { // CORRECCIÓN: Ajuste de opciones para formato HKA
                            plural: "bolívares",
                            singular: "bolívar",
                            centPlural: "céntimos",
                            centSingular: "céntimo",
                        }),
                        "FormasPago": [{
                            "Forma": "01", // 01: De contado
                            "Monto": totalGeneral.toFixed(2).toString(),
                            "Moneda": "VES" // Moneda del pago
                        }],
                        "ImpuestosSubtotal": [{
                            "CodigoTotalImp": "G", // G para IVA General
                            "AlicuotaImp": (IVA_RATE * 100).toFixed(2),
                            "BaseImponibleImp": subTotalGeneral.toFixed(2).toString(),
                            "ValorTotalImp": ivaGeneral.toFixed(2).toString()
                        }]
                    }
                },
                "DetallesItems": detalles
            }
        };

        console.log("================== ENVIANDO A HKA (ESTRUCTURA FINAL) ==================");
        console.log(JSON.stringify(hkaInvoicePayload, null, 2));
        console.log("=======================================================================");

        const response = await axios.post(API_URL_EMISION, hkaInvoicePayload, {
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}
        });

        console.log('✅ ¡Factura enviada a HKA con éxito!:', response.data);
        return response.data;

    } catch (error) {
        // --- MEJORA: Manejo de errores más detallado ---
        console.error("!!!!!!!!!!!!!!!!!! ERROR EN API HKA !!!!!!!!!!!!!!!!!!");
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error:', error.message);
        }
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        // Extraer el mensaje de error más útil para el frontend
        let detailedError = error.message || 'Error de comunicación con la API de HKA.';
        if (error.response?.data?.validaciones) {
            detailedError = error.response.data.validaciones.join('; ');
        } else if (error.response?.data?.errors) { // A veces los errores vienen en un objeto
            detailedError = Object.values(error.response.data.errors).flat().join('; ');
        } else if (error.response?.data?.mensaje) {
            detailedError = error.response.data.mensaje;
        }
        throw new Error(detailedError);
    }
};