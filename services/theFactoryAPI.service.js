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

// --- CONSTANTES ---
const FALLBACK_EMAIL = 'sincorreo@cooperativa.com'; 
const EXENTO_CODE = 'E';

// ==========================================================
// CORRECCIÓN DE ERROR "is not defined": Se usa la declaración
// 'function' en lugar de 'const = () =>' para asegurar el alcance global.
// ==========================================================

// --- HELPER 1: HORA SEGURA (hh:mm:ss tt) ---
function getHkaTime() {
    const options = {
        timeZone: 'America/Caracas',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    
    const hour = parts.find(p => p.type === 'hour').value.padStart(2, '0');
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    const dayPeriod = parts.find(p => p.type === 'dayPeriod').value.toLowerCase();

    return `${hour}:${minute}:${second} ${dayPeriod}`;
}

// --- HELPER 2: FECHA SEGURA (dd/MM/yyyy) ---
function getHkaDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- HELPER 3: FORMATO FECHA INPUT ---
function formatDateInput(dateInput) {
    const d = new Date(dateInput);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

// --- HELPER 4: FORMATO FECHAS BD (dd/MM/yyyy) ---
function formatDate(dateInput) {
    const d = new Date(dateInput);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
}
// ==========================================================


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
const formatDetails = (invoice, IVA_RATE = 0.00) => {
    let subTotalGeneral = 0;
    
    if (invoice.totalAmount && invoice.totalAmount > 0) {
        subTotalGeneral = invoice.totalAmount;
    }

    const items = invoice.guide?.merchandise || [];
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const detalles = items.map((item, index) => {
        const cantidad = item.quantity || 0;
        let itemSubtotal = 0;

        if (totalQuantity > 0) {
            const proportion = cantidad / totalQuantity;
            itemSubtotal = subTotalGeneral * proportion;
        }

        const precioItemRedondeado = parseFloat(itemSubtotal.toFixed(2));
        const valorTotalItem = precioItemRedondeado;

        return {
            "NumeroLinea": (index + 1).toString(),
            "CodigoCIIU": "01", 
            "CodigoPLU": item.sku || `GEN-${index + 1}`,
            "IndicadorBienoServicio": "2", 
            "Descripcion": item.description,
            "Cantidad": cantidad.toString(),
            "UnidadMedida": item.unit || "KG", 
            "PrecioUnitario": (cantidad > 0 ? itemSubtotal / cantidad : 0).toFixed(2).toString(),
            "PrecioUnitarioDescuento": null, 
            "MontoBonificacion": null, 
            "DescripcionBonificacion": null, 
            "DescuentoMonto": null, 
            "RecargoMonto": null, 
            "PrecioItem": precioItemRedondeado.toFixed(2).toString(),
            "PrecioAntesDescuento": null, 
            "CodigoImpuesto": EXENTO_CODE, 
            "TasaIVA": "0", 
            "ValorIVA": "0.00", 
            "ValorTotalItem": valorTotalItem.toFixed(2).toString() 
        };
    });

    return { 
        detalles, 
        subTotalGeneral, 
        ivaGeneral: 0.00, 
        totalGeneral: subTotalGeneral 
    };
};

// --- FUNCIÓN PARA ENVIAR A HKA ---
const sendToHka = async (token, serie, payload) => {
    console.log(`📤 Enviando Factura a HKA (Serie: ${serie})...`);
    const response = await axios.post(API_URL_EMISION, payload, {
        headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}
    });

    console.log('✅ ¡Factura enviada a HKA con éxito!:', response.data);
    return response.data;
};

// --- FUNCIÓN PRINCIPAL: ENVIAR FACTURA (CORREGIDA) ---
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
        
        // Se hace el import dinámico aquí.
        const { NumerosALetras } = await import('numero-a-letras');
        
        const IVA_RATE = 0.00; 
        const { detalles, subTotalGeneral, totalGeneral } = formatDetails(invoice, IVA_RATE);
        
        const idType = (invoice.clientIdNumber.charAt(0) || 'V').toUpperCase();
        const horaEmision = getHkaTime();

        // 1. Lógica para el Correo 
        const clientEmailToSend = (invoice.clientEmail && invoice.clientEmail.trim() !== '') 
            ? invoice.clientEmail 
            : FALLBACK_EMAIL;

        // 2. OBTENER VALORES DE COSTOS ADICIONALES (Utiliza los campos del modelo Invoice.js)
        // ESTOS VALORES SE LEEN DE LA BASE DE DATOS. SI SON 0.00, LA BD LOS TIENE EN 0.
        const manejoValue = (invoice.handlingFee || 0.00).toFixed(2).toString();
        const seguroValue = (invoice.insuranceAmount || 0.00).toFixed(2).toString(); 
        const ipostelValue = (invoice.ipostelFee || 0.00).toFixed(2).toString();
        
        // DEBUG: Muestra los valores antes de enviar
        console.log(`[HKA] Valores InfoAdicional: Manejo=${manejoValue}, Seguro=${seguroValue}, Ipostel=${ipostelValue}`);


        // 3. CÁLCULO DE VALORES EN USD
        const exchangeRate = parseFloat(invoice.exchangeRate || 1.00); 
        const exchangeRateFixed = exchangeRate.toFixed(4).toString();

        let totalesOtraMoneda = null;

        if (exchangeRate > 0) {
            const subTotalUSD = (totalGeneral / exchangeRate).toFixed(2);
            const totalUSD = subTotalUSD; 
            const usdTerms = { plural: "dólares", singular: "dólar", centPlural: "centavos", centSingular: "centavo" };
            const totalUSDLatin = NumerosALetras(parseFloat(totalUSD), usdTerms);
            
            // Construcción del bloque de USD
            totalesOtraMoneda = { 
                "Moneda": "USD",
                "TipoCambio": exchangeRateFixed,
                "MontoGravadoTotal": "0.00",
                "MontoPercibidoTotal": null,
                "MontoExentoTotal": subTotalUSD,
                "Subtotal": subTotalUSD,
                "TotalAPagar": totalUSD,
                "TotalIVA": "0.00",
                "MontoTotalConIVA": totalUSD,
                "MontoEnLetras": totalUSDLatin,
                "ImpuestosSubtotal": [
                    {
                        "CodigoTotalImp": EXENTO_CODE, 
                        "AlicuotaImp": "0.00",
                        "BaseImponibleImp": subTotalUSD,
                        "ValorTotalImp": "0.00"
                    }
                ]
            };
        } else {
            console.warn("[HKA] Tasa de cambio no válida o cero. No se enviará el bloque TotalesOtraMoneda.");
        }


        // 4. CONSTRUCCIÓN DEL PAYLOAD FINAL
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
                        "Telefono": [invoice.guide?.receiver?.phone || '0000-0000000'], 
                        "Correo": [clientEmailToSend] 
                    },
                    "Totales": {
                        "NroItems": detalles.length.toString(),
                        "MontoGravadoTotal": "0.00", 
                        "MontoExentoTotal": subTotalGeneral.toFixed(2).toString(), 
                        "Subtotal": subTotalGeneral.toFixed(2).toString(),
                        "TotalIVA": "0.00", 
                        "MontoTotalConIVA": totalGeneral.toFixed(2).toString(),
                        "TotalAPagar": totalGeneral.toFixed(2).toString(),
                        "MontoEnLetras": NumerosALetras(totalGeneral, { 
                            plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo"
                        }),
                        "FormasPago": [{ "Forma": "01", "Monto": totalGeneral.toFixed(2).toString(), "Moneda": "VES" }],
                        "ImpuestosSubtotal": [{ 
                            "CodigoTotalImp": EXENTO_CODE, 
                            "AlicuotaImp": "0.00", 
                            "BaseImponibleImp": subTotalGeneral.toFixed(2).toString(), 
                            "ValorTotalImp": "0.00" 
                        }]
                    },
                    "TotalesOtraMoneda": totalesOtraMoneda
                },
                "DetallesItems": detalles,
                "InfoAdicional": [ 
                    {
                        "Campo": "Manejo",
                        "Valor": manejoValue 
                    },
                    {
                        "Campo": "Seguro",
                        "Valor": seguroValue 
                    },
                    {
                        "Campo": "Ipostel",
                        "Valor": ipostelValue 
                    }
                ]
            }
        };

        // 5. Envío de la factura
        return sendToHka(token, serie, hkaInvoicePayload);

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

// --- LÓGICA DE NOTAS (CORREGIDA) ---
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
        
        // 2. CORRECCIÓN NÚMEROS Y SERIES
        const cleanNoteNumber = noteDetails.noteNumber.replace(/\D/g, ''); 
        
        const invoiceParts = invoice.invoiceNumber.split('-');
        let affectedInvoiceSeries = "";
        let cleanAffectedInvoice = invoice.invoiceNumber;

        if (invoiceParts.length > 1) {
            affectedInvoiceSeries = invoiceParts[0]; 
            cleanAffectedInvoice = invoiceParts[1];  
        } else {
            affectedInvoiceSeries = serie; 
        }
        
        const fechaFacturaAfectada = formatDateInput(invoice.date);

        // 3. Montos - Se reutiliza formatDetails que fuerza IVA 0
        const IVA_RATE = 0.00; 
        const { NumerosALetras } = await import('numero-a-letras');
        const { detalles, subTotalGeneral, totalGeneral } = formatDetails(invoice, IVA_RATE);

        // 4. Lógica para el Correo 
        const clientEmailToSend = (invoice.clientEmail && invoice.clientEmail.trim() !== '') 
            ? invoice.clientEmail 
            : FALLBACK_EMAIL;

        // 5. Costos adicionales
        const manejoValue = (invoice.handlingFee || 0.00).toFixed(2).toString();
        const seguroValue = (invoice.insuranceAmount || 0.00).toFixed(2).toString(); 
        const ipostelValue = (invoice.ipostelFee || 0.00).toFixed(2).toString();
        
        // DEBUG: Muestra los valores antes de enviar
        console.log(`[HKA Nota] Valores InfoAdicional: Manejo=${manejoValue}, Seguro=${seguroValue}, Ipostel=${ipostelValue}`);


        // 6. CÁLCULO DE VALORES EN USD (SOLUCIÓN para Monto USD en notas)
        const exchangeRate = parseFloat(invoice.exchangeRate || 1.00); 
        const exchangeRateFixed = exchangeRate.toFixed(4).toString();

        let totalesOtraMoneda = null;

        if (exchangeRate > 0) {
            const subTotalUSD = (totalGeneral / exchangeRate).toFixed(2);
            const totalUSD = subTotalUSD; 
            const usdTerms = { plural: "dólares", singular: "dólar", centPlural: "centavos", centSingular: "centavo" };
            const totalUSDLatin = NumerosALetras(parseFloat(totalUSD), usdTerms);
        
            totalesOtraMoneda = { 
                "Moneda": "USD",
                "TipoCambio": exchangeRateFixed,
                "MontoGravadoTotal": "0.00",
                "MontoPercibidoTotal": null,
                "MontoExentoTotal": subTotalUSD,
                "Subtotal": subTotalUSD,
                "TotalAPagar": totalUSD,
                "TotalIVA": "0.00",
                "MontoTotalConIVA": totalUSD,
                "MontoEnLetras": totalUSDLatin,
                "ImpuestosSubtotal": [
                    {
                        "CodigoTotalImp": EXENTO_CODE, 
                        "AlicuotaImp": "0.00",
                        "BaseImponibleImp": subTotalUSD,
                        "ValorTotalImp": "0.00"
                    }
                ]
            };
        }


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
                        "SerieFacturaAfectada": affectedInvoiceSeries, 
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
                        "Telefono": [invoice.guide?.receiver?.phone || '0000-0000000'],
                        "Correo": [clientEmailToSend] 
                    },
                    "Totales": {
                        "NroItems": detalles.length.toString(),
                        "MontoGravadoTotal": "0.00", 
                        "MontoExentoTotal": subTotalGeneral.toFixed(2).toString(),
                        "Subtotal": subTotalGeneral.toFixed(2).toString(),
                        "TotalIVA": "0.00", 
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
                            "CodigoTotalImp": EXENTO_CODE, 
                            "AlicuotaImp": "0.00",
                            "BaseImponibleImp": subTotalGeneral.toFixed(2).toString(),
                            "ValorTotalImp": "0.00" 
                        }]
                    },
                    "TotalesOtraMoneda": totalesOtraMoneda
                },
                "DetallesItems": detalles,
                "InfoAdicional": [
                    {
                        "Campo": "Manejo",
                        "Valor": manejoValue
                    },
                    {
                        "Campo": "Seguro",
                        "Valor": seguroValue
                    },
                    {
                        "Campo": "Ipostel",
                        "Valor": ipostelValue
                    }
                ]
            }
        };

        return sendToHka(token, serie, hkaPayload);

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