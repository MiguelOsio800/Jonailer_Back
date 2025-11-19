import { AsientoManual, AsientoManualEntry, CuentaContable, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

export const getAsientosManuales = async (req, res) => {
    try {
        const asientos = await AsientoManual.findAll({
            include: [{
                model: AsientoManualEntry,
                as: 'entries',
                include: [{ model: CuentaContable, as: 'cuenta' }]
            }],
            order: [['fecha', 'DESC']]
        });
        res.status(200).json(asientos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los asientos manuales', error: error.message });
    }
};

export const createAsientoManual = async (req, res) => {
    const { fecha, descripcion, entries } = req.body;
    const userId = req.user.id;

    // --- VALIDACIONES ---
    if (!fecha || !descripcion || !entries) {
        return res.status(400).json({ message: 'Los campos fecha, descripción y entries son obligatorios.' });
    }
    if (!Array.isArray(entries) || entries.length < 2) {
        return res.status(400).json({ message: 'Se requieren al menos dos líneas (entries) para un asiento.' });
    }

    let totalDebe = 0;
    let totalHaber = 0;

    for (const entry of entries) {
        // Exclusión Mutua
        if ((entry.debe > 0 && entry.haber > 0) || (entry.debe === 0 && entry.haber === 0)) {
            return res.status(400).json({ message: `La línea para la cuenta ${entry.cuentaId} es inválida. Debe tener un valor en 'debe' o 'haber', pero no en ambos.` });
        }
        totalDebe += parseFloat(entry.debe || 0);
        totalHaber += parseFloat(entry.haber || 0);
    }

    // Partida Doble (Balance)
    if (totalDebe.toFixed(2) !== totalHaber.toFixed(2)) {
        return res.status(400).json({ message: `El asiento no está balanceado. Total Debe: ${totalDebe.toFixed(2)}, Total Haber: ${totalHaber.toFixed(2)}.` });
    }

    const t = await sequelize.transaction();
    try {
        // Referencias Válidas
        const cuentaIds = entries.map(e => e.cuentaId);
        const cuentasExistentes = await CuentaContable.count({ where: { id: { [Op.in]: cuentaIds } }, transaction: t });
        if (cuentasExistentes !== cuentaIds.length) {
            throw new Error('Una o más de las cuentas contables proporcionadas no existen.');
        }

        // --- CREACIÓN ---
        const nuevoAsiento = await AsientoManual.create({
            id: `AM-${Date.now()}`,
            fecha,
            descripcion,
            userId,
        }, { transaction: t });

        const entriesToCreate = entries.map(entry => ({
            id: `AME-${Date.now()}-${Math.random()}`,
            asientoManualId: nuevoAsiento.id,
            cuentaId: entry.cuentaId,
            debe: entry.debe,
            haber: entry.haber,
        }));

        await AsientoManualEntry.bulkCreate(entriesToCreate, { transaction: t });

        await t.commit();

        const result = await AsientoManual.findByPk(nuevoAsiento.id, {
            include: [{
                model: AsientoManualEntry,
                as: 'entries',
                include: [{ model: CuentaContable, as: 'cuenta' }]
            }]
        });

        res.status(201).json(result);

    } catch (error) {
        await t.rollback();
        console.error("Error al crear asiento manual:", error);
        res.status(500).json({ message: error.message || 'Error en el servidor al crear el asiento.' });
    }
};

export const deleteAsientoManual = async (req, res) => {
    const { id } = req.params;
    try {
        const asiento = await AsientoManual.findByPk(id);
        if (!asiento) {
            return res.status(404).json({ message: 'Asiento manual no encontrado.' });
        }

        // La eliminación en cascada (onDelete: 'CASCADE') se encargará de las entradas.
        await asiento.destroy();

        res.status(200).json({ message: 'Asiento manual eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el asiento manual.', error: error.message });
    }
};