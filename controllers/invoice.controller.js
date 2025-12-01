import { Invoice, CompanyInfo, Client, Office, sequelize } from '../models/index.js'; // Importar Office
import { sendInvoiceToHKA, sendCreditNoteToHKA, sendDebitNoteToHKA } from '../services/theFactoryAPI.service.js';

export const getInvoices = async (req, res) => {
    try {
        const { user } = req;
        const whereClause = {};
        if (user && user.roleId !== 'role-admin' && user.officeId) {
            whereClause.officeId = user.officeId;
        }
        const invoices = await Invoice.findAll({ 
            where: whereClause, 
            order: [['invoiceNumber', 'DESC']],
            include: [{ model: Office, attributes: ['name', 'code'] }]
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las facturas', error: error.message });
    }
};

export const createInvoice = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { guide, ...invoiceData } = req.body;
        const { sender, receiver } = guide;

        if (req.user.roleId !== 'role-admin') {
            guide.originOfficeId = req.user.officeId;
        } else if (!guide.originOfficeId) {
            guide.originOfficeId = req.user.officeId;
        }

        const getValidClientData = ({ idNumber, clientType, name, phone, address }) => ({
            idNumber, clientType, name, phone, address
        });

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

        const userOfficeId = req.user?.officeId;
        if (!userOfficeId) throw new Error('No se pudo determinar la oficina del usuario.');

        const office = await Office.findByPk(userOfficeId, { transaction: t, lock: t.LOCK.UPDATE });
        
        // Validación usando el código de oficina como serie
        if (!office || !office.code) throw new Error(`La oficina no tiene un CÓDIGO (Serie) asignado.`);
        
        const nextInvoiceNum = (office.lastInvoiceNumber || 0) + 1;
        const newInvoiceNumberFormatted = `${office.code}-${String(nextInvoiceNum).padStart(6, '0')}`;
        const newControlNumber = String(nextInvoiceNum).padStart(8, '0');
        
        office.lastInvoiceNumber = nextInvoiceNum;
        await office.save({ transaction: t });

        const newInvoice = await Invoice.create({
            id: `INV-${Date.now()}`,
            invoiceNumber: newInvoiceNumberFormatted,
            controlNumber: newControlNumber,
            clientName: senderClient.name,
            clientIdNumber: senderClient.idNumber,
            date: invoiceData.date,
            totalAmount: invoiceData.totalAmount,
            officeId: userOfficeId,
            guide: { ...guide, sender: { ...sender, id: senderClient.id }, receiver: { ...receiver, id: receiverClient.id } },
            status: 'Activa',
            paymentStatus: 'Pendiente',
            shippingStatus: 'Pendiente para Despacho',
            createdByName: invoiceData.createdByName || 'Sistema'
        }, { transaction: t });
        
        await t.commit();
        res.status(201).json(newInvoice);

    } catch (error) {
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
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

export const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        await invoice.destroy();
        res.json({ message: 'Factura eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};

// --- ENVÍO DE FACTURA A HKA ---
export const sendInvoiceToTheFactory = async (req, res) => {
    try {
        // 👇 IMPORTANTE: include: [Office]
        const invoice = await Invoice.findByPk(req.params.id, { include: [Office] });
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const hkaResponse = await sendInvoiceToHKA(invoice);
        console.log(`[HKA] Factura ${invoice.invoiceNumber} enviada.`);
        res.status(200).json({ message: 'Factura enviada a HKA.', hkaResponse });

    } catch (error) {
        console.error(`[HKA] Error factura ${req.params.id}:`, error.message);
        res.status(500).json({ message: error.message });
    }
};

// --- NOTA DE CRÉDITO ---
export const createCreditNote = async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ message: 'Motivo requerido' });

    try {
        // 👇 IMPORTANTE: include: [Office]
        const invoice = await Invoice.findByPk(id, { include: [Office] });
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const noteNumber = `NC-${Date.now().toString().slice(-6)}`;
        const hkaResponse = await sendCreditNoteToHKA(invoice, { noteNumber, reason: motivo });

        res.json({ message: 'Nota Crédito enviada', hkaResponse, noteNumber });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- NOTA DE DÉBITO ---
export const createDebitNote = async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ message: 'Motivo requerido' });

    try {
        // 👇 IMPORTANTE: include: [Office]
        const invoice = await Invoice.findByPk(id, { include: [Office] });
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const noteNumber = `ND-${Date.now().toString().slice(-6)}`;
        const hkaResponse = await sendDebitNoteToHKA(invoice, { noteNumber, reason: motivo });

        res.json({ message: 'Nota Débito enviada', hkaResponse, noteNumber });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};