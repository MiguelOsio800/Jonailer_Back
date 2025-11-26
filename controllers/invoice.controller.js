import { Invoice, CompanyInfo, Client, InventoryItem, sequelize } from '../models/index.js';
// SE AGREGARON LAS NUEVAS FUNCIONES AL IMPORT:
import { sendInvoiceToHKA, sendCreditNoteToHKA, sendDebitNoteToHKA } from '../services/theFactoryAPI.service.js';

export const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ order: [['invoiceNumber', 'DESC']] });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las facturas', error: error.message });
    }
};

export const createInvoice = async (req, res) => {
    // Start a managed transaction. Sequelize will automatically commit or roll back.
    const t = await sequelize.transaction();
    try {
        // --- DIAGNÓSTICO: Imprimir el cuerpo de la solicitud para depuración ---
        console.log("================== DATOS RECIBIDOS DEL FRONTEND ==================");
        console.log(JSON.stringify(req.body, null, 2));
        console.log("==================================================================");

        const { guide, ...invoiceData } = req.body;
        const { sender, receiver } = guide;

        // 1. Validate client data
        const validateClient = (client, type) => {
            if (!client || !client.idNumber || !client.name) {
                throw new Error(`Los datos del ${type} están incompletos.`);
            }
        };
        validateClient(sender, 'remitente');
        validateClient(receiver, 'destinatario');

        // CORRECCIÓN: Extraemos solo los campos válidos del modelo Cliente para evitar el warning.
        // Esto previene que campos extra (como 'email') se pasen a 'defaults'.
        const getValidClientData = ({ idNumber, clientType, name, phone, address }) => ({
            idNumber,
            clientType,
            name,
            phone,
            address
        });

        // 2. Find or create clients within the transaction
        const [senderClient] = await Client.findOrCreate({
            where: { idNumber: sender.idNumber },
            defaults: { ...getValidClientData(sender), id: `C-${Date.now()}` },
            transaction: t
        });
        const [receiverClient] = await Client.findOrCreate({
            where: { idNumber: receiver.idNumber },
            defaults: { ...getValidClientData(receiver), id: `C-${Date.now() + 1}` },
            transaction: t
        });

        // 3. Lock the CompanyInfo row and get the next invoice number
        const companyInfo = await CompanyInfo.findByPk(1, { transaction: t, lock: t.LOCK.UPDATE });
        if (!companyInfo) {
            throw new Error('Información de la empresa no encontrada.');
        }

        const nextInvoiceNum = (companyInfo.lastInvoiceNumber || 0) + 1;
        const newInvoiceNumberFormatted = String(nextInvoiceNum).padStart(6, '0');
        const newControlNumber = String(nextInvoiceNum).padStart(8, '0');
        
        // 4. Update the counter within the same transaction
        companyInfo.lastInvoiceNumber = nextInvoiceNum;
        await companyInfo.save({ transaction: t });

        // 5. Create the new invoice
        const newInvoice = await Invoice.create({
            id: `INV-${Date.now()}`,
            invoiceNumber: newInvoiceNumberFormatted,
            controlNumber: newControlNumber,
            clientName: senderClient.name,
            clientIdNumber: senderClient.idNumber,
            date: invoiceData.date, // Usar la fecha del request
            totalAmount: invoiceData.totalAmount, // Usar el total del request
            guide: { ...guide, sender: { ...sender, id: senderClient.id }, receiver: { ...receiver, id: receiverClient.id } },
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
        }, { transaction: t });
        
        // If everything above succeeded, the transaction will be committed.
        await t.commit();

        res.status(201).json(newInvoice);

    } catch (error) {
        // If any step fails, the transaction is rolled back automatically.
        await t.rollback();
        console.error('Error al crear la factura:', error);
        res.status(500).json({ message: error.message || 'Error al crear la factura' });
    }
};

export const updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        await invoice.update(req.body);
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la factura', error: error.message });
    }
};

export const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        await invoice.destroy();
        res.json({ message: 'Factura eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la factura', error: error.message });
    }
};

export const sendInvoiceToTheFactory = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        // Llama al servicio que acabamos de crear
        const hkaResponse = await sendInvoiceToHKA(invoice);

        // --- CONSOLE.LOG AÑADIDO ---
        console.log(`[HKA] Factura ${invoice.invoiceNumber} enviada exitosamente. Respuesta:`, hkaResponse);

        // (Opcional) Aquí podrías guardar el estado en tu base de datos.
        // Por ejemplo, añadiendo un campo `hkaStatus` a tu modelo Invoice.
        // await invoice.update({ hkaStatus: 'enviada', hkaResponse: hkaResponse });

        res.status(200).json({ message: 'Factura enviada exitosamente a The Factory HKA.', hkaResponse });

    } catch (error) {
        console.error(`[HKA] Error al enviar la factura ${req.params.id}:`, error.message);
        res.status(500).json({ message: error.message || 'Error al enviar la factura.' });
    }
};

// --- NUEVAS FUNCIONES PARA NOTAS DE CRÉDITO Y DÉBITO ---

// @desc    Generar y enviar Nota de Crédito a HKA (Anulación/Devolución)
// @route   POST /api/invoices/:id/credit-note
export const createCreditNote = async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body; // El frontend debe enviar { "motivo": "Error en precio" }

    if (!motivo) {
        return res.status(400).json({ message: 'El motivo de la nota de crédito es obligatorio.' });
    }

    try {
        const invoice = await Invoice.findByPk(id);
        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        // Generamos un número temporal o consecutivo para la nota
        // IDEALMENTE: Deberías tener un contador en DB para notas, igual que para facturas.
        // Por ahora usamos un timestamp para que no choque en pruebas.
        const noteNumber = `NC-${Date.now().toString().slice(-6)}`; 

        console.log(`Generando Nota de Crédito para Factura ${invoice.invoiceNumber}...`);

        const hkaResponse = await sendCreditNoteToHKA(invoice, {
            noteNumber: noteNumber,
            reason: motivo
        });

        // Opcional: Actualizar estado de la factura local a "Anulada" si es nota total
        // invoice.status = 'Anulada';
        // await invoice.save();

        res.status(200).json({
            message: 'Nota de Crédito enviada a HKA exitosamente.',
            hkaResponse,
            noteNumber
        });

    } catch (error) {
        console.error('Error al crear Nota de Crédito:', error);
        res.status(500).json({ message: error.message || 'Error al procesar la nota de crédito.' });
    }
};

// @desc    Generar y enviar Nota de Débito a HKA (Recargo/Corrección)
// @route   POST /api/invoices/:id/debit-note
export const createDebitNote = async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
        return res.status(400).json({ message: 'El motivo de la nota de débito es obligatorio.' });
    }

    try {
        const invoice = await Invoice.findByPk(id);
        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const noteNumber = `ND-${Date.now().toString().slice(-6)}`;

        console.log(`Generando Nota de Débito para Factura ${invoice.invoiceNumber}...`);

        const hkaResponse = await sendDebitNoteToHKA(invoice, {
            noteNumber: noteNumber,
            reason: motivo
        });

        res.status(200).json({
            message: 'Nota de Débito enviada a HKA exitosamente.',
            hkaResponse,
            noteNumber
        });

    } catch (error) {
        console.error('Error al crear Nota de Débito:', error);
        res.status(500).json({ message: error.message || 'Error al procesar la nota de débito.' });
    }
};