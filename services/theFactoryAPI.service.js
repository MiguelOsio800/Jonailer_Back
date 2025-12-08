import axios from 'axios';
import dotenv from 'dotenv';
// Importamos Office para tener la referencia correcta
import { CompanyInfo, Office } from '../models/index.js';

dotenv.config();

// --- CONFIGURACIÓN DE URLS ---
const API_URL_AUTH = 'https://demoemisionv2.thefactoryhka.com.ve/api/Autenticacion';
const API_URL_EMISION = 'https://demoemisionv2.thefactoryhka.com.ve/api/Emision';

// --- CACHÉ DE TOKEN ---
let cachedToken = {
    token: null,
    expires: 0,
};

// --- HELPER 1: HORA SEGURA (hh:mm:ss tt) ---
const getHkaTime = () => {
    const options = {
        timeZone: 'America/Caracas',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    };
    
    // Usamos Intl para formatear partes específicas y asegurar el "0" inicial
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    
    const hour = parts.find(p => p.type === 'hour').value.padStart(2, '0');
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    const dayPeriod = parts.find(p => p.type === 'dayPeriod').value.toLowerCase();

    return `${hour}:${minute}:${second} ${dayPeriod}`;
};

// --- HELPER 2: FECHA SEGURA (dd/MM/yyyy) ---
const getHkaDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

// --- HELPER 3: FORMATO FECHA INPUT ---
const formatDateInput = (dateInput) => {
    const d = new Date(dateInput);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

// --- OBTENER TOKEN ---
const getAuthToken = async () => {
    try {
        console.log("🔐 Intentando autenticar con The Factory HKA...");
        const usuario = process.env.HKA_USUARIO;
        const clave = process.env.HKA_CLAVE;

        if (!usuario || !clave) {
            throw new Error('Las credenciales HKA_USUARIO y HKA_CLAVE no están definidas en el archivo .env');
        }

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
            console.error("RESPUESTA DEL SERVIDOR HKA:", response.data);
            const serverMessage = response.data?.mensaje || response.data?.error || 'Respuesta inesperada';
            throw new Error(`La API respondió pero no envió token: ${serverMessage}`);
        }

        cachedToken.token = response.data.token;
        cachedToken.expires = Date.now() + 50 * 60 * 1000; 
        console.log("✅ Token de HKA obtenido exitosamente.");
        return cachedToken.token;

    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!! ERROR DE AUTENTICACIÓN HKA !!!!!!!!!!!!!!!!!!");
        throw new Error(error.message || 'No se pudo autenticar con The Factory HKA.');
    }
};

// --- HELPER: FORMATEAR ITEMS Y MONTOS ---
const formatDetails = (invoice, IVA_RATE = 0.16) => {
    let subTotalGeneral = 0;
    let ivaGeneral = 0;

    if (invoice.totalAmount && invoice.totalAmount > 0) {
        subTotalGeneral = invoice.totalAmount / (1 + IVA_RATE);
        ivaGeneral = invoice.totalAmount - subTotalGeneral;
    }

    const items = invoice.guide?.merchandise || [];
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const detalles = items.map((item, index) => {
        const cantidad = item.quantity || 0;
        let itemSubtotal = 0;
        let itemIva = 0;

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
            "CodigoImpuesto": "G",
            "TasaIVA": (IVA_RATE * 100).toFixed(0),
            "ValorIVA": valorIvaRedondeado.toFixed(2).toString(),
            "ValorTotalItem": valorTotalItem.toFixed(2).toString()
        };
    });

    return { detalles, subTotalGeneral, ivaGeneral, totalGeneral: subTotalGeneral + ivaGeneral };
};

// --- HELPER: FORMATEAR FECHAS BD ---
const formatDate = (dateInput) => {
    const d = new Date(dateInput);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

// --- FUNCIÓN PRINCIPAL: ENVIAR FACTURA ---
export const sendInvoiceToHKA = async (invoice) => {
    try {
        const companyInfo = await CompanyInfo.findByPk(1);
        if (!companyInfo) {
            throw new Error('No se encontró la información de la empresa para la facturación.');
        }

        const token = await getAuthToken();

        const office = invoice.Office;
        if (!office?.code) {
            throw new Error(`La oficina asociada no tiene un CÓDIGO (Serie) asignado en la BD.`);
        }
        const serie = office.code;

        const numero = invoice.invoiceNumber.split('-')[1] || invoice.invoiceNumber;
        const { NumerosALetras } = await import('numero-a-letras');
        const { detalles, subTotalGeneral, ivaGeneral, totalGeneral } = formatDetails(invoice);
        const IVA_RATE = 0.16;
        
        const idType = (invoice.clientIdNumber.charAt(0) || 'V').toUpperCase();
        const horaEmision = getHkaTime();

        const hkaInvoicePayload = {
            "DocumentoElectronico": {
                "Encabezado": {
                    "IdentificacionDocumento": {
                        "TipoDocumento": "01",
                        "Serie": serie,
                        "NumeroDocumento": numero,
                        "FechaEmision": formatDate(invoice.date),
                        "HoraEmision": horaEmision,
                        "TipoDeVenta": "1",
                        "Moneda": "VES",
                    },
                    "Emisor": {
                        "TipoIdentificacion": (companyInfo.rif.charAt(0) || 'J').toUpperCase(),
                        "NumeroIdentificacion": companyInfo.rif,
                        "RazonSocial": companyInfo.name,
                        "Direccion": companyInfo.address,
                        "Telefono": [companyInfo.phone]
                    },
                    "Comprador": {
                        "TipoIdentificacion": idType,
                        "NumeroIdentificacion": invoice.clientIdNumber,
                        "RazonSocial": invoice.clientName,
                        "Direccion": invoice.guide?.receiver?.address || 'N/A',
                        "Pais": "VE",
                        "Telefono": [invoice.guide?.receiver?.phone || '0000-0000000']
                    },
                    "Totales": {
                        "NroItems": detalles.length.toString(),
                        "MontoGravadoTotal": subTotalGeneral.toFixed(2).toString(),
                        "MontoExentoTotal": "0.00",
                        "Subtotal": subTotalGeneral.toFixed(2).toString(),
                        "TotalIVA": ivaGeneral.toFixed(2).toString(),
                        "MontoTotalConIVA": totalGeneral.toFixed(2).toString(),
                        "TotalAPagar": totalGeneral.toFixed(2).toString(),
                        "MontoEnLetras": NumerosALetras(totalGeneral, { 
                            plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo"
                        }),
                        "FormasPago": [{ "Forma": "01", "Monto": totalGeneral.toFixed(2).toString(), "Moneda": "VES" }],
                        "ImpuestosSubtotal": [{ "CodigoTotalImp": "G", "AlicuotaImp": (IVA_RATE * 100).toFixed(2), "BaseImponibleImp": subTotalGeneral.toFixed(2).toString(), "ValorTotalImp": ivaGeneral.toFixed(2).toString() }]
                    }
                },
                "DetallesItems": detalles
            }
        };

        console.log(`📤 Enviando Factura a HKA (Serie: ${serie})...`);
        const response = await axios.post(API_URL_EMISION, hkaInvoicePayload, {
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}
        });

        console.log('✅ ¡Factura enviada a HKA con éxito!:', response.data);
        return response.data;

    } catch (error) {
        handleHkaError(error);
    }
};

// --- EXPORTAR FUNCIONES DE NOTAS ---
export const sendCreditNoteToHKA = async (invoice, noteDetails) => {
    return await sendNoteToHKA(invoice, noteDetails, "02");
};

export const sendDebitNoteToHKA = async (invoice, noteDetails) => {
    return await sendNoteToHKA(invoice, noteDetails, "03");
};

// --- LÓGICA DE NOTAS (CORREGIDA: AGREGADA SERIE FACTURA AFECTADA) ---
const sendNoteToHKA = async (invoice, noteDetails, docType) => {
    try {
        const companyInfo = await CompanyInfo.findByPk(1);
        if (!companyInfo) throw new Error('No se encontró la información de la empresa.');
        const token = await getAuthToken();

        const office = invoice.Office;
        if (!office?.code) {
            throw new Error(`La oficina asociada no tiene un CÓDIGO (Serie) en la BD.`);
        }
        const serie = office.code;

        // 1. Fechas y Hora
        const fechaEmision = getHkaDate();
        const horaEmision = getHkaTime();
        
        // 2. CORRECCIÓN NÚMEROS Y SERIES (Vital para evitar error 203)
        // Nota: Limpiamos prefijos como "ND-"
        const cleanNoteNumber = noteDetails.noteNumber.replace(/\D/g, ''); 
        
        // Factura Afectada: Separamos Serie y Número (Ej: CCS-000001 -> Serie: CCS, Num: 000001)
        const invoiceParts = invoice.invoiceNumber.split('-');
        let affectedInvoiceSeries = "";
        let cleanAffectedInvoice = invoice.invoiceNumber;

        if (invoiceParts.length > 1) {
            affectedInvoiceSeries = invoiceParts[0]; // "CCS"
            cleanAffectedInvoice = invoiceParts[1];  // "000001"
        } else {
            // Si no tiene guión, asumimos que es el número y la serie es la misma de la oficina actual
            affectedInvoiceSeries = serie; 
        }
        
        const fechaFacturaAfectada = formatDateInput(invoice.date);

        // 3. Montos
        const IVA_RATE = 0.16;
        let subTotalGeneral = 0;
        let ivaGeneral = 0;

        if (invoice.totalAmount && invoice.totalAmount > 0) {
            subTotalGeneral = invoice.totalAmount / (1 + IVA_RATE);
            ivaGeneral = invoice.totalAmount - subTotalGeneral;
        }

        const { NumerosALetras } = await import('numero-a-letras');
        const { detalles, totalGeneral } = formatDetails(invoice);

        const hkaPayload = {
            "DocumentoElectronico": {
                "Encabezado": {
                    "IdentificacionDocumento": {
                        "TipoDocumento": docType,
                        "NumeroDocumento": cleanNoteNumber,
                        "Serie": serie,
                        "FechaEmision": fechaEmision,
                        "HoraEmision": horaEmision,
                        "TipoDeVenta": "1",
                        "Moneda": "VES",
                        "NumeroFacturaAfectada": cleanAffectedInvoice,
                        "SerieFacturaAfectada": affectedInvoiceSeries, // <--- CAMBIO: Agregado campo requerido
                        "FechaFacturaAfectada": fechaFacturaAfectada,
                        "MontoFacturaAfectada": invoice.totalAmount.toFixed(2).toString(),
                        "ComentarioFacturaAfectada": noteDetails.reason || "Ajuste administrativo"
                    },
                    "Emisor": {
                        "TipoIdentificacion": (companyInfo.rif.charAt(0) || 'J').toUpperCase(),
                        "NumeroIdentificacion": companyInfo.rif,
                        "RazonSocial": companyInfo.name,
                        "Direccion": companyInfo.address,
                        "Telefono": [companyInfo.phone]
                    },
                    "Comprador": {
                        "TipoIdentificacion": (invoice.clientIdNumber.charAt(0) || 'V').toUpperCase(),
                        "NumeroIdentificacion": invoice.clientIdNumber,
                        "RazonSocial": invoice.clientName,
                        "Direccion": invoice.guide?.receiver?.address || 'N/A',
                        "Pais": "VE",
                        "Telefono": [invoice.guide?.receiver?.phone || '0000-0000000']
                    },
                    "Totales": {
                        "NroItems": detalles.length.toString(),
                        "MontoGravadoTotal": subTotalGeneral.toFixed(2).toString(),
                        "MontoExentoTotal": "0.00",
                        "Subtotal": subTotalGeneral.toFixed(2).toString(),
                        "TotalIVA": ivaGeneral.toFixed(2).toString(),
                        "MontoTotalConIVA": totalGeneral.toFixed(2).toString(),
                        "TotalAPagar": totalGeneral.toFixed(2).toString(),
                        "MontoEnLetras": NumerosALetras(totalGeneral, { 
                            plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo"
                        }),
                        "FormasPago": [{
                            "Forma": "01",
                            "Monto": totalGeneral.toFixed(2).toString(),
                            "Moneda": "VES"
                        }],
                        "ImpuestosSubtotal": [{
                            "CodigoTotalImp": "G",
                            "AlicuotaImp": (IVA_RATE * 100).toFixed(2),
                            "BaseImponibleImp": subTotalGeneral.toFixed(2).toString(),
                            "ValorTotalImp": ivaGeneral.toFixed(2).toString()
                        }]
                    }
                },
                "DetallesItems": detalles
            }
        };

        console.log(`=== ENVIANDO NOTA TIPO ${docType} A HKA (Serie: ${serie}) ===`);
        const response = await axios.post(API_URL_EMISION, hkaPayload, {
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}
        });

        console.log('✅ Nota enviada con éxito:', response.data);
        return response.data;

    } catch (error) {
        handleHkaError(error);
    }
};

// --- MANEJO DE ERRORES ---
const handleHkaError = (error) => {
    console.error("!!!!!!!!!!!!!!!!!! ERROR EN API HKA !!!!!!!!!!!!!!!!!!");
    let detailedError = error.message || 'Error de comunicación con HKA.';
    
    if (error.response?.data) {
        console.error(JSON.stringify(error.response.data, null, 2));
        if (error.response.data.mensaje) {
            detailedError = error.response.data.mensaje;
        } else if (error.response.data.validaciones) {
            detailedError = "Validación: " + error.response.data.validaciones.join('; ');
        } else if (error.response.data.errors) {
            detailedError = JSON.stringify(error.response.data.errors);
        }
    }
    
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    throw new Error(detailedError);
};