import axios from 'axios';
import dotenv from 'dotenv';
// Importamos Office para tener la referencia correcta
import { CompanyInfo, Office } from '../models/index.js';

dotenv.config();

// --- CONFIGURACIÓN DE URLS ---
const API_URL_AUTH = 'https://demoemisionv2.thefactoryhka.com.ve/api/Autenticacion';
const API_URL_EMISION = 'https://demoemisionv2.thefactoryhka.com.ve/api/Emision';
const API_URL_ANULACION = 'https://demoemisionv2.thefactoryhka.com.ve/api/Anular';

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

// --- HELPER: FORMATEAR ITEMS Y MONTOS ---
const formatDetails = (invoice, montoBase, IVA_RATE = 0.00) => {
    let subTotalGeneral = montoBase; 
    
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
        subTotalGeneral: montoBase,
        ivaGeneral: 0.00, 
    };
};

// --- FUNCIÓN CRÍTICA DE ENVÍO Y LOGGING ---
const sendToHka = async (token, serie, payload) => {
    console.log(`📤 Enviando Factura a HKA (Serie: ${serie})...`);
    
    // ==================================================================
    // ESTE LOG ES EL QUE TE MOSTRARÁ EL JSON COMPLETO
    // ==================================================================
    console.log("\n⬇️ ⬇️ ⬇️ JSON COMPLETO ENVIADO A HKA ⬇️ ⬇️ ⬇️");
    console.log(JSON.stringify(payload, null, 2));
    console.log("⬆️ ⬆️ ⬆️ FIN DEL JSON ⬆️ ⬆️ ⬆️\n");
    // ==================================================================

    const response = await axios.post(API_URL_EMISION, payload, {
        headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}
    });

    console.log('✅ ¡Factura enviada a HKA con éxito!:', response.data);
    return response.data;
};

// --- FUNCIÓN PRINCIPAL: ENVIAR FACTURA (CON TRAMPA, BLINDAJE Y CONDICIONES SIN NUMERO) ---
const sendInvoiceToHKA = async (invoice) => {
    try {
        // 1. OBTENER DATOS BÁSICOS Y TOKEN
        const companyInfo = await CompanyInfo.findByPk(1);
        if (!companyInfo) throw new Error('No se encontró la información de la empresa.');

        const token = await getAuthToken();

        // 2. DEFINIR VARIABLES DE TIEMPO
        const horaEmision = getHkaTime(); 
        const fechaEmision = formatDate(invoice.date);

        const office = invoice.Office;
        if (!office?.code) throw new Error(`La oficina no tiene un CÓDIGO (Serie) asignado.`);
        
        const serie = office.code;
        const numero = invoice.invoiceNumber.split('-')[1] || invoice.invoiceNumber;
        const { NumerosALetras } = await import('numero-a-letras');
        
        // --- 3. DATOS FINANCIEROS ---
        const totalGeneral = parseFloat(invoice.totalAmount || 0);
        const montoFlete = parseFloat(invoice.montoFlete || 0.00);
        const manejo = parseFloat(invoice.Montomanejo || 0.00); 
        const seguro = parseFloat(invoice.insuranceAmount || 0.00); 
        const ipostel = parseFloat(invoice.ipostelFee || 0.00);
        const montoDescuento = parseFloat(invoice.discountAmount || 0.00);
        const porcentajeDescuento = parseFloat(invoice.discountPercentage || 0.00);
        
        const totalAntesDescuento = totalGeneral + montoDescuento; 
        const baseExentaHKA = totalAntesDescuento; 

        // Formatear valores auxiliares
        const manejoValue = manejo.toFixed(2).toString();
        const seguroValue = seguro.toFixed(2).toString();
        const ipostelValue = ipostel.toFixed(2).toString();
        const descuentoMontoValue = montoDescuento.toFixed(2).toString();
        const descuentoPorcValue = porcentajeDescuento.toFixed(2).toString();
        
        // --- 4. LÓGICA DE CONDICIÓN DE PAGO ---
        const paymentType = invoice.guide?.paymentType; 
        let condicionPagoTexto = 'Flete por Cobrar'; 

        if (paymentType === 'flete-pagado') {
            condicionPagoTexto = 'Flete Pagado';
        } else if (paymentType === 'flete-destino') {
            condicionPagoTexto = 'Flete a Destino';
        } else {
            const statusUpper = invoice.paymentStatus ? invoice.paymentStatus.toUpperCase() : '';
            if (['PAGADA', 'PAGADO', 'PAID', 'COMPLETED'].includes(statusUpper)) {
                 condicionPagoTexto = 'Flete Pagado';
            }
        }

        // --- 5. LÓGICA DE MONEDA ---
        const paymentCurrency = invoice.guide?.paymentCurrency || 'VES';
        let monedaTexto = 'Bolívares';
        if (paymentCurrency === 'USD') {
            monedaTexto = 'Dólares';
        }

        // --- 6. EXTRACCIÓN DE DATOS (SOLO USAMOS RECEIVER PARA TODO) ---
        const senderGuide = invoice.guide?.sender || {};
        const receiverGuide = invoice.guide?.receiver || {};
        const cleanID = (id) => id ? id.replace(/\s/g, '').toUpperCase() : 'N/A';

        // DESTINATARIO (Receiver) - PROTAGONISTA DE INFO ADICIONAL
        const receiver = {
            name: invoice.receiverName || receiverGuide.name || 'Cliente Genérico',
            identificacion: cleanID(invoice.receiverIdNumber || receiverGuide.idNumber || receiverGuide.identificacion || receiverGuide.rif),
            address: invoice.receiverAddress || receiverGuide.address || 'Sin dirección',
            phone: invoice.receiverPhone || receiverGuide.phone || '0000000000',
            email: invoice.receiverEmail || receiverGuide.email || FALLBACK_EMAIL
        };

        // REMITENTE (Sender) - PROTAGONISTA DE COMPRADOR
        const sender = {
            name: senderGuide.name || 'N/A',
            identificacion: cleanID(senderGuide.idNumber || senderGuide.identificacion || senderGuide.rif),
            address: senderGuide.address || 'N/A',
            phone: senderGuide.phone || 'N/A'
        };

        const clientEmailToSend = (invoice.clientEmail && invoice.clientEmail.trim() !== '') ? invoice.clientEmail : FALLBACK_EMAIL;

        // --- 7. CONSTRUCCIÓN INFO ADICIONAL (CON "LA TRAMPA" Y CONDICIONES) ---
        const additionalInfoFields = [
            { "Campo": "Oficina", "Valor": invoice.Office?.name || 'N/A' },
            { "Campo": "Ruta", "Valor": invoice.specificDestination || 'N/A' },
            { "Campo": "Condicion", "Valor": condicionPagoTexto },
            { "Campo": "Moneda", "Valor": monedaTexto },
            { "Campo": "Asegurado", "Valor": invoice.guide?.hasInsurance ? 'SI' : 'NO' },
            { "Campo": "Declarado", "Valor": invoice.guide?.declaredValue?.toString() || '0' },
            { "Campo": "Recogida", "Valor": invoice.guide?.pickupOrder || 'N/A' },
            { "Campo": "Transbordo", "Valor": invoice.guide?.isTransbordo ? 'Si' : 'No' },
            
            // LA TRAMPA: Etiquetas Remitente -> Valores Receiver
            { "Campo": "Remitente", "Valor": receiver.name },
            { "Campo": "IDRemitente", "Valor": receiver.identificacion },
            { "Campo": "DirRemitente", "Valor": receiver.address },
            { "Campo": "TelRemitente", "Valor": receiver.phone },
            { "Campo": "CorRemitente", "Valor": receiver.email }, 
            
            // COSTOS
            { "Campo": "Manejo", "Valor": manejoValue },
            { "Campo": "Seguro", "Valor": seguroValue },
            { "Campo": "Ipostel", "Valor": ipostelValue }
        ];

        // =========================================================================
        // AGREGAR CONDICIONES GENERALES (Divididas por cláusulas)
        // =========================================================================
        const condicionesTexto = [
            "Primero: La cooperativa indemnizará solo (3) veces el valor del flete en caso de extravío o siniestro si no tiene valor asegurado.",
            "Segundo: Mercancía frágil o de fácil descomposición deteriorada por mal embalaje corre por cuenta del cliente.",
            "Tercero: En caso de siniestro no imputable, se indemnizará según valor declarado menos el deducible de la póliza.",
            "Cuarto: No habrá indemnización si la mercancía es confiscada por autoridades; el cliente pagará el flete.",
            "Quinto: No somos responsables por retardos debidos a fuerza mayor o accidentes del vehículo.",
            "Sexto: A los 30 días la Guía vence. Responsabilidad limitada a 50,00 Bs por valores no declarados.",
            "Séptimo: Mercancía no retirada en 90 días pasará a remate sin derecho a reclamo.",
            "Octavo: Encomiendas no recibidas a domicilio se devuelven al depósito de origen.",
            "Noveno: El cliente declara el contenido real; la compañía no responde por fallas de contenido no declarado.",
            "Décimo: Mercancía con más de 72h en oficina no será indemnizada por la aseguradora en caso de siniestro.",
            "Décimo Primero: Controversias se resolverán amistosamente o mediante arbitraje."
        ];

        // Agregamos cada cláusula como una línea nueva con el CAMPO "Condiciones" (Sin número)
        condicionesTexto.forEach((clausula) => {
            const valorSeguro = clausula.length > 160 ? clausula.substring(0, 157) + "..." : clausula;
            
            additionalInfoFields.push({
                "Campo": "Condiciones", 
                "Valor": valorSeguro
            });
        });
        // =========================================================================

        // --- 8. DETALLES Y TOTALES ---
        const { detalles } = formatDetails(invoice, baseExentaHKA); 
        
        // =========================================================================
        // BLINDAJE ANTI ERROR 400: VALIDACIÓN DE ID PARA COMPRADOR (AHORA ES SENDER)
        // =========================================================================
        
        // 1. Limpiamos SOLO números del REMITENTE (Sender)
        let cleanNumber = sender.identificacion.replace(/\D/g, '');
        
        // 2. Si quedó vacío (porque era "N/A" o letras), usamos genérico
        if (!cleanNumber || cleanNumber.length === 0) {
            cleanNumber = "00000000"; 
        }

        // 3. Determinamos Tipo (V, E, J, G, P) del REMITENTE. Si no es válido, usamos V.
        let idTypeChar = (sender.identificacion.charAt(0) || 'V').toUpperCase();
        if (!['V', 'E', 'J', 'G', 'P', 'C'].includes(idTypeChar)) {
            idTypeChar = 'V'; // Default a V si viene basura
        }
        // =========================================================================

        // --- 9. CÁLCULOS USD ---
        const exchangeRate = parseFloat(invoice.exchangeRate || 1.00); 
        const exchangeRateFixed = exchangeRate.toFixed(4).toString();
        let totalesOtraMoneda = null;

        if (monedaTexto === 'Dólares' && exchangeRate > 0) {
            const totalUSD = (totalGeneral / exchangeRate).toFixed(2);
            const subTotalUSD = (baseExentaHKA / exchangeRate).toFixed(2);
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
                "MontoTotalConIVA": (totalAntesDescuento / exchangeRate).toFixed(2), 
                "MontoEnLetras": totalUSDLatin,
                "TotalDescuento": (montoDescuento / exchangeRate).toFixed(2).toString(),
                "ImpuestosSubtotal": [{ "CodigoTotalImp": EXENTO_CODE, "AlicuotaImp": "0.00", "BaseImponibleImp": subTotalUSD, "ValorTotalImp": "0.00" }]
            };
        }

        // --- 10. PAYLOAD FINAL ---
        const hkaPayload = {
            "DocumentoElectronico": {
                "Encabezado": {
                    "IdentificacionDocumento": {
                        "TipoDocumento": "01",
                        "Serie": serie,
                        "NumeroDocumento": numero,
                        "FechaEmision": fechaEmision, 
                        "HoraEmision": horaEmision, 
                        "TipoDeVenta": "1",
                        "Moneda": "VES", 
                    },
                    "Emisor": {
                        "TipoIdentificacion": (companyInfo.rif.charAt(0) || 'J').toUpperCase(),
                        "NumeroIdentificacion": companyInfo.rif.replace(/\D/g, ''),
                        "RazonSocial": companyInfo.name,
                        "Direccion": companyInfo.address,
                        "Telefono": [companyInfo.phone]
                    },
                    "Comprador": {
                        // TRAMPA 3 APLICADA: Comprador es SENDER (Remitente)
                        "TipoIdentificacion": idTypeChar,
                        "NumeroIdentificacion": cleanNumber, // Validado para evitar error 400
                        "RazonSocial": sender.name, 
                        "Direccion": sender.address, 
                        "Pais": "VE",
                        "Telefono": [sender.phone],
                        "Correo": [clientEmailToSend] // Usamos el email del cliente global o fallback
                    },
                    "Totales": {
                        "NroItems": detalles.length.toString(),
                        "MontoGravadoTotal": "0.00", 
                        "MontoExentoTotal": baseExentaHKA.toFixed(2).toString(),
                        "Subtotal": baseExentaHKA.toFixed(2).toString(),
                        "TotalIVA": "0.00", 
                        "MontoTotalConIVA": totalAntesDescuento.toFixed(2).toString(),
                        "TotalAPagar": totalGeneral.toFixed(2).toString(),
                        "MontoEnLetras": NumerosALetras(totalGeneral, { plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo" }),
                        "FormasPago": [{ "Forma": "01", "Monto": totalGeneral.toFixed(2).toString(), "Moneda": "VES" }],
                        "TotalDescuento": descuentoMontoValue, 
                        "ImpuestosSubtotal": [{ "CodigoTotalImp": EXENTO_CODE, "AlicuotaImp": "0.00", "BaseImponibleImp": baseExentaHKA.toFixed(2).toString(), "ValorTotalImp": "0.00" }]
                    },
                    "TotalesOtraMoneda": totalesOtraMoneda
                },
                "DetallesItems": detalles,
                "InfoAdicional": additionalInfoFields
            }
        };

        return sendToHka(token, serie, hkaPayload);

    } catch (error) {
        handleHkaError(error);
    }
};

const voidInvoiceInHKA = async (invoice) => {
    try {
        const token = await getAuthToken();
        const office = invoice.Office;
        
        if (!office?.code) throw new Error('La oficina no tiene Serie.');

        const numero = invoice.invoiceNumber.split('-')[1] || invoice.invoiceNumber;

        const payload = {
            "TipoDocumento": "01",
            "Serie": office.code,
            "NumeroDocumento": numero,
            "MotivoAnulacion": "Anulación por error administrativo" 
        };

        console.log("🚀 Payload enviado a HKA para anular:", JSON.stringify(payload, null, 2));

        const response = await axios.post(API_URL_ANULACION, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
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

// --- LÓGICA DE NOTAS (Con misma lógica de comprador y info adicional) ---
const sendNoteToHKA = async (invoice, noteDetails, docType) => {
    try {
        const companyInfo = await CompanyInfo.findByPk(1);
        if (!companyInfo) throw new Error('No se encontró la información de la empresa.');
        const token = await getAuthToken();

        const office = invoice.Office;
        if (!office?.code) throw new Error(`La oficina no tiene un CÓDIGO (Serie) en la BD.`);
        const serie = office.code;

        // 1. Fechas y Hora
        const fechaEmision = getHkaDate();
        const horaEmision = getHkaTime();
        
        const cleanNoteNumber = noteDetails.noteNumber.replace(/\D/g, ''); 
        
        const invoiceParts = invoice.invoiceNumber.split('-');
        let affectedInvoiceSeries = invoiceParts.length > 1 ? invoiceParts[0] : serie;
        let cleanAffectedInvoice = invoiceParts.length > 1 ? invoiceParts[1] : invoice.invoiceNumber;
        const fechaFacturaAfectada = formatDateInput(invoice.date);

        // 3. Montos
        const totalGeneral = parseFloat(invoice.totalAmount || 0);
        const manejo = parseFloat(invoice.Montomanejo || 0.00); 
        const seguro = parseFloat(invoice.insuranceAmount || 0.00); 
        const ipostel = parseFloat(invoice.ipostelFee || 0.00);
        const montoDescuento = parseFloat(invoice.discountAmount || 0.00);
        const porcentajeDescuento = parseFloat(invoice.discountPercentage || 0.00);
        
        const totalAntesDescuento = totalGeneral + montoDescuento;
        const baseExentaHKA = totalAntesDescuento; 
        
        const { NumerosALetras } = await import('numero-a-letras');
        const { detalles } = formatDetails(invoice, baseExentaHKA); 

        const manejoValue = manejo.toFixed(2).toString();
        const seguroValue = seguro.toFixed(2).toString(); 
        const ipostelValue = ipostel.toFixed(2).toString();
        const descuentoMontoValue = montoDescuento.toFixed(2).toString();

        // 6. CÁLCULO DE VALORES EN USD
        const exchangeRate = parseFloat(invoice.exchangeRate || 1.00); 
        const exchangeRateFixed = exchangeRate.toFixed(4).toString();
        const paymentCurrency = invoice.guide?.paymentCurrency || 'VES';
        let monedaTexto = paymentCurrency === 'USD' ? 'Dólares' : 'Bolívares';
        
        let totalesOtraMoneda = null;

        if (monedaTexto === 'Dólares' && exchangeRate > 0) {
            const totalUSD = (totalGeneral / exchangeRate).toFixed(2);
            const subTotalUSD = (baseExentaHKA / exchangeRate).toFixed(2);
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
                "MontoTotalConIVA": (totalAntesDescuento / exchangeRate).toFixed(2), 
                "MontoEnLetras": totalUSDLatin,
                "TotalDescuento": (montoDescuento / exchangeRate).toFixed(2).toString(), 
                "ImpuestosSubtotal": [{ "CodigoTotalImp": EXENTO_CODE, "AlicuotaImp": "0.00", "BaseImponibleImp": subTotalUSD, "ValorTotalImp": "0.00" }]
            };
        }

        // Recuperar datos Receiver y Sender
        const receiverGuide = invoice.guide?.receiver || {};
        const senderGuide = invoice.guide?.sender || {};
        const cleanID = (id) => id ? id.replace(/\s/g, '').toUpperCase() : 'N/A';
        
        const receiver = {
            name: invoice.receiverName || receiverGuide.name || 'Cliente Genérico',
            identificacion: cleanID(invoice.receiverIdNumber || receiverGuide.idNumber || receiverGuide.identificacion || receiverGuide.rif),
            address: invoice.receiverAddress || receiverGuide.address || 'Sin dirección',
            phone: invoice.receiverPhone || receiverGuide.phone || '0000000000',
            email: invoice.receiverEmail || receiverGuide.email || 'N/A'
        };

        const sender = {
            name: senderGuide.name || 'N/A',
            identificacion: cleanID(senderGuide.idNumber || senderGuide.identificacion || senderGuide.rif),
            address: senderGuide.address || 'N/A',
            phone: senderGuide.phone || 'N/A'
        };

        const clientEmailToSend = (invoice.clientEmail && invoice.clientEmail.trim() !== '') ? invoice.clientEmail : FALLBACK_EMAIL;

        // Construir InfoAdicional Dinámico (INFO = RECEIVER)
        const additionalInfoFields = [
            { "Campo": "Oficina", "Valor": invoice.Office?.name || 'N/A' },
            { "Campo": "Ruta", "Valor": invoice.specificDestination || 'N/A' },
            { "Campo": "Condicion", "Valor": "N/A" }, 
            { "Campo": "Moneda", "Valor": monedaTexto },
            { "Campo": "Asegurado", "Valor": invoice.guide?.hasInsurance ? 'SI' : 'NO' },
            { "Campo": "Declarado", "Valor": invoice.guide?.declaredValue?.toString() || '0' },
            { "Campo": "Recogida", "Valor": invoice.guide?.pickupOrder || 'N/A' },
            { "Campo": "Transbordo", "Valor": invoice.guide?.isTransbordo ? 'Si' : 'No' },
            
            // LA TRAMPA: Etiquetas Remitente -> Valores Receiver
            { "Campo": "Remitente", "Valor": receiver.name },
            { "Campo": "IDRemitente", "Valor": receiver.identificacion },
            { "Campo": "DirRemitente", "Valor": receiver.address },
            { "Campo": "TelRemitente", "Valor": receiver.phone },
            { "Campo": "CorRemitente", "Valor": receiver.email }, 
            
            // COSTOS
            { "Campo": "Manejo", "Valor": manejoValue },
            { "Campo": "Seguro", "Valor": seguroValue },
            { "Campo": "Ipostel", "Valor": ipostelValue }
        ];

        // AGREGAR CONDICIONES GENERALES TAMBIÉN EN NOTAS
        const condicionesTexto = [
            "Primero: La cooperativa indemnizará solo (3) veces el valor del flete en caso de extravío o siniestro si no tiene valor asegurado.",
            "Segundo: Mercancía frágil o de fácil descomposición deteriorada por mal embalaje corre por cuenta del cliente.",
            "Tercero: En caso de siniestro no imputable, se indemnizará según valor declarado menos el deducible de la póliza.",
            "Cuarto: No habrá indemnización si la mercancía es confiscada por autoridades; el cliente pagará el flete.",
            "Quinto: No somos responsables por retardos debidos a fuerza mayor o accidentes del vehículo.",
            "Sexto: A los 30 días la Guía vence. Responsabilidad limitada a 50,00 Bs por valores no declarados.",
            "Séptimo: Mercancía no retirada en 90 días pasará a remate sin derecho a reclamo.",
            "Octavo: Encomiendas no recibidas a domicilio se devuelven al depósito de origen.",
            "Noveno: El cliente declara el contenido real; la compañía no responde por fallas de contenido no declarado.",
            "Décimo: Mercancía con más de 72h en oficina no será indemnizada por la aseguradora en caso de siniestro.",
            "Décimo Primero: Controversias se resolverán amistosamente o mediante arbitraje."
        ];

        condicionesTexto.forEach((clausula) => {
            const valorSeguro = clausula.length > 160 ? clausula.substring(0, 157) + "..." : clausula;
            additionalInfoFields.push({
                "Campo": "Condiciones", 
                "Valor": valorSeguro
            });
        });

        // BLINDAJE ID PARA NOTAS (COMPRADOR = SENDER)
        let cleanNumber = sender.identificacion.replace(/\D/g, '');
        if (!cleanNumber || cleanNumber.length === 0) {
            cleanNumber = "00000000"; 
        }
        let idTypeChar = (sender.identificacion.charAt(0) || 'V').toUpperCase();
        if (!['V', 'E', 'J', 'G', 'P', 'C'].includes(idTypeChar)) {
            idTypeChar = 'V'; 
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
                        "NumeroIdentificacion": companyInfo.rif.replace(/\D/g, ''),
                        "RazonSocial": companyInfo.name,
                        "Direccion": companyInfo.address,
                        "Telefono": [companyInfo.phone]
                    },
                    "Comprador": {
                        // TRAMPA APLICADA: COMPRADOR = SENDER
                        "TipoIdentificacion": idTypeChar,
                        "NumeroIdentificacion": cleanNumber, 
                        "RazonSocial": sender.name, 
                        "Direccion": sender.address, 
                        "Pais": "VE",
                        "Telefono": [sender.phone],
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
                        "MontoEnLetras": NumerosALetras(totalGeneral, { plural: "bolívares", singular: "bolívar", centPlural: "céntimos", centSingular: "céntimo" }),
                        "FormasPago": [{ "Forma": "01", "Monto": totalGeneral.toFixed(2).toString(), "Moneda": "VES" }],
                        "TotalDescuento": descuentoMontoValue, 
                        "ImpuestosSubtotal": [{ "CodigoTotalImp": EXENTO_CODE, "AlicuotaImp": "0.00", "BaseImponibleImp": subTotalUSD, "ValorTotalImp": "0.00" }]
                    },
                    "TotalesOtraMoneda": totalesOtraMoneda
                },
                "DetallesItems": detalles,
                "InfoAdicional": additionalInfoFields
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
// EXPORTACIONES FINALES
// ==========================================================
export {
    sendInvoiceToHKA,
    sendCreditNoteToHKA,
    sendDebitNoteToHKA,
    voidInvoiceInHKA
};