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
// FUNCIONES HELPER
// ==========================================================

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

function getHkaDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateInput(dateInput) {
    const d = new Date(dateInput);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

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

// --- HELPER: FORMATEAR ITEMS Y MONTOS (USA LA BASE UNIFICADA) ---
const formatDetails = (invoice, montoBase, IVA_RATE = 0.00) => {
    let subTotalGeneral = montoBase; // Usa la base que se pasa (baseExentaHKA)
    
    const items = invoice.guide?.merchandise || [];
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const detalles = items.map((item, index) => {
        const cantidad = item.quantity || 0;
        let itemSubtotal = 0;

        if (totalQuantity > 0) {
            // Distribuye la MONTO BASE proporcionalmente a los ítems
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
            "PrecioItem": precioItemRedondeado.toFixed(2).toString(), // Precio del item (Parte del Flete)
            "PrecioAntesDescuento": null, 
            "CodigoImpuesto": EXENTO_CODE, 
            "TasaIVA": "0", 
            "ValorIVA": "0.00", 
            "ValorTotalItem": valorTotalItem.toFixed(2).toString() 
        };
    });

    return { 
        detalles, 
        subTotalGeneral: montoBase,
        ivaGeneral: 0.00, 
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

// --- FUNCIÓN PRINCIPAL: ENVIAR FACTURA (SOLUCIÓN UNIFICADA PARA [1009] Y [1012]) ---
const sendInvoiceToHKA = async (invoice) => {
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
        
        // 1. OBTENER VALORES Y CÁLCULO DE TOTALES (USANDO CAMPOS EXACTOS DEL MODELO)
        const totalGeneral = parseFloat(invoice.totalAmount || 0); // MONTO TOTAL FINAL (Total A Pagar)
        
        // Costos Adicionales (NOMBRES EXACTOS DEL MODELO)
        const montoFlete = parseFloat(invoice.montoFlete || 0.00); // Monto Base del Flete
        const manejo = parseFloat(invoice.Montomanejo || 0.00); 
        const seguro = parseFloat(invoice.insuranceAmount || 0.00); 
        const ipostel = parseFloat(invoice.ipostelFee || 0.00);
        const montoDescuento = parseFloat(invoice.discountAmount || 0.00);
        const porcentajeDescuento = parseFloat(invoice.discountPercentage || 0.00);
        
        // CÁLCULOS CRÍTICOS
        const totalAntesDescuento = totalGeneral + montoDescuento; 
        
        // CRÍTICO [1009] y [1012]: Base Exenta HKA debe ser igual al totalAntesDescuento.
        const baseExentaHKA = totalAntesDescuento; 

        // Convertir a string para el JSON
        const manejoValue = manejo.toFixed(2).toString();
        const seguroValue = seguro.toFixed(2).toString();
        const ipostelValue = ipostel.toFixed(2).toString();
        const descuentoMontoValue = montoDescuento.toFixed(2).toString();
        const descuentoPorcValue = porcentajeDescuento.toFixed(2).toString();
        
        // DEBUG: Muestra los valores antes de enviar
        console.log(`[HKA] Valores InfoAdicional: Manejo=${manejoValue}, Seguro=${seguroValue}, Ipostel=${ipostelValue}, Descuento=${descuentoMontoValue} (${descuentoPorcValue}%)`);
        console.log(`[HKA] Monto Flete (Guardado): ${montoFlete.toFixed(2)}`);
        console.log(`[HKA] Base Exenta HKA (Usada en Totales y Detalles): ${baseExentaHKA.toFixed(2)}`);


        // 2. FORMATEAR DETALLES: Usamos la base UNIFICADA (baseExentaHKA) para que los ítems sumen el total
        const IVA_RATE = 0.00; 
        const { detalles } = formatDetails(invoice, baseExentaHKA, IVA_RATE); 
        
        const idType = (invoice.clientIdNumber.charAt(0) || 'V').toUpperCase();
        const horaEmision = getHkaTime();

        // 3. Lógica para el Correo 
        const clientEmailToSend = (invoice.clientEmail && invoice.clientEmail.trim() !== '') 
            ? invoice.clientEmail 
            : FALLBACK_EMAIL;


        // 4. CÁLCULO DE VALORES EN USD
        const exchangeRate = parseFloat(invoice.exchangeRate || 1.00); 
        const exchangeRateFixed = exchangeRate.toFixed(4).toString();

        let totalesOtraMoneda = null;

        if (exchangeRate > 0) {
            const totalUSD = (totalGeneral / exchangeRate).toFixed(2);
            const subTotalUSD = (baseExentaHKA / exchangeRate).toFixed(2); // Base unificada en USD
            const descuentoUSD = (montoDescuento / exchangeRate).toFixed(2).toString();
            const totalAntesDescuentoUSD = (totalAntesDescuento / exchangeRate).toFixed(2);
            
            const usdTerms = { plural: "dólares", singular: "dólar", centPlural: "centavos", centSingular: "centavo" };
            const totalUSDLatin = NumerosALetras(parseFloat(totalUSD), usdTerms);
            
            // Construcción del bloque de USD
            totalesOtraMoneda = { 
                "Moneda": "USD",
                "TipoCambio": exchangeRateFixed,
                "MontoGravadoTotal": "0.00",
                "MontoPercibidoTotal": null,
                "MontoExentoTotal": subTotalUSD, // Base unificada en USD
                "Subtotal": subTotalUSD, // Base unificada en USD
                "TotalAPagar": totalUSD,
                "TotalIVA": "0.00",
                "MontoTotalConIVA": totalAntesDescuentoUSD, 
                "MontoEnLetras": totalUSDLatin,
                "TotalDescuento": descuentoUSD,
                "ImpuestosSubtotal": [
                    {
                        "CodigoTotalImp": EXENTO_CODE, 
                        "AlicuotaImp": "0.00",
                        "BaseImponibleImp": subTotalUSD, // Base unificada en USD
                        "ValorTotalImp": "0.00"
                    }
                ]
            };
        } else {
            console.warn("[HKA] Tasa de cambio no válida o cero. No se enviará el bloque TotalesOtraMoneda.");
        }


        // 5. CONSTRUCCIÓN DEL PAYLOAD FINAL
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
                        "MontoExentoTotal": baseExentaHKA.toFixed(2).toString(), // Base unificada para pasar [1009]
                        "Subtotal": baseExentaHKA.toFixed(2).toString(), // Base unificada
                        "TotalIVA": "0.00", 
                        "MontoTotalConIVA": totalAntesDescuento.toFixed(2).toString(), // Total Antes Descuento
                        "TotalAPagar": totalGeneral.toFixed(2).toString(), // Monto final
                        "MontoEnLetras": NumerosALetras(totalGeneral, { 
                            plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo"
                        }),
                        "FormasPago": [{ "Forma": "01", "Monto": totalGeneral.toFixed(2).toString(), "Moneda": "VES" }],
                        "TotalDescuento": descuentoMontoValue, // Incluido el monto de descuento en VES
                        "ImpuestosSubtotal": [{ 
                            "CodigoTotalImp": EXENTO_CODE, 
                            "AlicuotaImp": "0.00", 
                            "BaseImponibleImp": baseExentaHKA.toFixed(2).toString(), // Base unificada para pasar [1009]
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
                    },
                    {
                        "Campo": "Descuento Porc.",
                        "Valor": descuentoPorcValue + "%"
                    }
                ]
            }
        };

        return sendToHka(token, serie, hkaInvoicePayload);

    } catch (error) {
        handleHkaError(error);
    }
};

// --- EXPORTAR FUNCIONES DE NOTAS ---
const sendCreditNoteToHKA = async (invoice, noteDetails) => {
    return await sendNoteToHKA(invoice, noteDetails, "02");
};

const sendDebitNoteToHKA = async (invoice, noteDetails) => {
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

        // 3. Montos - Se recalcula con lógica de su negocio (USANDO CAMPOS EXACTOS DEL MODELO)
        const totalGeneral = parseFloat(invoice.totalAmount || 0); // El MONTO TOTAL
        const montoFlete = parseFloat(invoice.montoFlete || 0.00); // Monto Base del Flete
        const manejo = parseFloat(invoice.Montomanejo || 0.00); 
        const seguro = parseFloat(invoice.insuranceAmount || 0.00); 
        const ipostel = parseFloat(invoice.ipostelFee || 0.00);
        const montoDescuento = parseFloat(invoice.discountAmount || 0.00);
        const porcentajeDescuento = parseFloat(invoice.discountPercentage || 0.00);
        
        const totalAntesDescuento = totalGeneral + montoDescuento;
        const baseExentaHKA = totalAntesDescuento; // Base unificada para pasar [1012]
        
        const IVA_RATE = 0.00; 
        const { NumerosALetras } = await import('numero-a-letras');
        const { detalles } = formatDetails(invoice, baseExentaHKA, IVA_RATE); // <-- CAMBIO APLICADO AQUÍ

        // 4. Lógica para el Correo 
        const clientEmailToSend = (invoice.clientEmail && invoice.clientEmail.trim() !== '') 
            ? invoice.clientEmail 
            : FALLBACK_EMAIL;

        // 5. Costos adicionales (para InfoAdicional)
        const manejoValue = manejo.toFixed(2).toString();
        const seguroValue = seguro.toFixed(2).toString(); 
        const ipostelValue = ipostel.toFixed(2).toString();
        const descuentoMontoValue = montoDescuento.toFixed(2).toString();
        const descuentoPorcValue = porcentajeDescuento.toFixed(2).toString();
        
        // DEBUG: Muestra los valores antes de enviar
        console.log(`[HKA Nota] Valores InfoAdicional: Manejo=${manejoValue}, Seguro=${seguroValue}, Ipostel=${ipostelValue}, Descuento=${descuentoMontoValue} (${descuentoPorcValue}%)`);


        // 6. CÁLCULO DE VALORES EN USD (SOLUCIÓN para Monto USD en notas)
        const exchangeRate = parseFloat(invoice.exchangeRate || 1.00); 
        const exchangeRateFixed = exchangeRate.toFixed(4).toString();

        let totalesOtraMoneda = null;

        if (exchangeRate > 0) {
            const totalUSD = (totalGeneral / exchangeRate).toFixed(2);
            const subTotalUSD = (baseExentaHKA / exchangeRate).toFixed(2); // Base unificada en USD
            const descuentoUSD = (montoDescuento / exchangeRate).toFixed(2).toString();
            const totalAntesDescuentoUSD = (totalAntesDescuento / exchangeRate).toFixed(2);
            
            const usdTerms = { plural: "dólares", singular: "dólar", centPlural: "centavos", centSingular: "centavo" };
            const totalUSDLatin = NumerosALetras(parseFloat(totalUSD), usdTerms);
        
            totalesOtraMoneda = { 
                "Moneda": "USD",
                "TipoCambio": exchangeRateFixed,
                "MontoGravadoTotal": "0.00",
                "MontoPercibidoTotal": null,
                "MontoExentoTotal": subTotalUSD, // Base unificada en USD
                "Subtotal": subTotalUSD, // Base unificada en USD
                "TotalAPagar": totalUSD,
                "TotalIVA": "0.00",
                "MontoTotalConIVA": totalAntesDescuentoUSD, // Monto antes del descuento
                "MontoEnLetras": totalUSDLatin,
                "TotalDescuento": descuentoUSD, // Incluido el descuento
                "ImpuestosSubtotal": [
                    {
                        "CodigoTotalImp": EXENTO_CODE, 
                        "AlicuotaImp": "0.00",
                        "BaseImponibleImp": subTotalUSD, // Base unificada en USD
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
                        "MontoExentoTotal": baseExentaHKA.toFixed(2).toString(),
                        "Subtotal": baseExentaHKA.toFixed(2).toString(),
                        "TotalIVA": "0.00", 
                        "MontoTotalConIVA": totalAntesDescuento.toFixed(2).toString(),
                        "TotalAPagar": totalGeneral.toFixed(2).toString(),
                        "MontoEnLetras": NumerosALetras(totalGeneral, { 
                            plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo"
                        }),
                        "FormasPago": [{
                            "Forma": "01",
                            "Monto": totalGeneral.toFixed(2).toString(),
                            "Moneda": "VES"
                        }],
                        "TotalDescuento": descuentoMontoValue, // Incluido el monto de descuento en VES
                        "ImpuestosSubtotal": [{
                            "CodigoTotalImp": EXENTO_CODE, 
                            "AlicuotaImp": "0.00",
                            "BaseImponibleImp": baseExentaHKA.toFixed(2).toString(),
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
                    },
                    {
                        "Campo": "Descuento Porc.",
                        "Valor": descuentoPorcValue + "%"
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

// ==========================================================
// EXPORTACIONES FINALES (CORRECCIÓN DE SyntaxError)
// ==========================================================
export {
    sendInvoiceToHKA,
    sendCreditNoteToHKA,
    sendDebitNoteToHKA
};