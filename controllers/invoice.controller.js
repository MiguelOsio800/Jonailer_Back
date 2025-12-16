import { Invoice, CompanyInfo, Client, Office, sequelize } from '../models/index.js'; // Importar Office
import { sendInvoiceToHKA, sendCreditNoteToHKA, sendDebitNoteToHKA } from '../services/theFactoryAPI.service.js';
import { Op } from 'sequelize'; // Importamos Op para usar OR

export const getInvoices = async (req, res) => {
    try {
        const { user } = req;
        const whereClause = {};

        // === FILTRO UNIVERSAL DE VISIBILIDAD DE FACTURAS (CORRECCIÓN FINAL) ===
        if (user && user.roleId !== 'role-admin' && user.officeId) {
            const userOfficeId = user.officeId;

            // Se usa Op.or para que el usuario vea:
            // 1. Facturas creadas en su oficina (officeId)
            // 2. O Facturas destinadas a su oficina.
            whereClause[Op.or] = [
                // Condición 1: Facturas creadas en su oficina (Historial de Ventas Propio)
                { officeId: userOfficeId },
                
                // Condición 2: Facturas destinadas a su oficina (Carga Entrante o Historial de Recepción)
                // ELIMINAMOS EL FILTRO DE SHIPPING STATUS para asegurarnos de que la factura se cargue siempre que
                // esté asociada a una oficina de destino, sin importar su estado final.
                {
                    // Busca dentro del campo JSONB 'guide' la oficina de destino
                    guide: {
                        destinationOfficeId: userOfficeId
                    }
                }
            ];
            
        } else if (user && user.roleId !== 'role-admin' && !user.officeId) {
             // Si el usuario no es admin pero no tiene officeId, no ve ninguna factura.
            whereClause.id = null;
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
        
        // Actualiza el registro con los nuevos campos de costos, etc.
        await invoice.update(req.body);
        
        // CRÍTICO: Recarga la instancia para asegurar que todos los datos recién guardados sean devueltos al frontend
        // Esto le da al frontend la instancia más fresca para su siguiente llamada a 'sendInvoiceToTheFactory'
        const freshInvoice = await Invoice.findByPk(req.params.id, { include: [Office] });
        
        res.json(freshInvoice);
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

// --- ENVÍO DE FACTURA A HKA (CORRECCIÓN DE CARRERA/RACE CONDITION) ---
export const sendInvoiceToTheFactory = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        // 1. Fetch the invoice to prepare for update (if data is in body)
        let invoice = await Invoice.findByPk(invoiceId);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        // 2. CRÍTICO: Actualiza la factura con cualquier dato nuevo que el frontend haya podido enviar 
        // (En caso de que el frontend intente guardar y enviar en la misma petición).
        // Esto también asegura que la escritura haya terminado ANTES de la lectura.
        if (Object.keys(req.body).length > 0) {
            await invoice.update(req.body);
        }
        
        // 3. Re-fetch la instancia completa con la relación Office y los datos más frescos
        // Esto garantiza que los campos como montoFlete y clientEmail estén cargados.
        const freshInvoice = await Invoice.findByPk(invoiceId, { include: [Office] });
        if (!freshInvoice) return res.status(404).json({ message: 'Factura no encontrada después de recarga' });


        const hkaResponse = await sendInvoiceToHKA(freshInvoice);
        console.log(`[HKA] Factura ${freshInvoice.invoiceNumber} enviada.`);
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
        // Se realiza un re-fetch para asegurar los datos más frescos antes de la nota
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
        // Se realiza un re-fetch para asegurar los datos más frescos antes de la nota
        const invoice = await Invoice.findByPk(id, { include: [Office] });
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const noteNumber = `ND-${Date.now().toString().slice(-6)}`;
        const hkaResponse = await sendDebitNoteToHKA(invoice, { noteNumber, reason: motivo });

        res.json({ message: 'Nota Débito enviada', hkaResponse, noteNumber });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};