// controllers/companyInfo.controller.js

import { CompanyInfo } from '../models/index.js';
import axios from 'axios';

// @desc    Obtener la información de la empresa
// @route   GET /api/company-info
export const getCompanyInfo = async (req, res) => {
    try {
        let companyInfo = await CompanyInfo.findOne();
        if (!companyInfo) {
            companyInfo = await CompanyInfo.create({
                name: 'Nombre de tu Empresa',
                rif: 'J-00000000-0',
                address: 'Dirección Fiscal',
                phone: '000-0000000',
                costPerKg: 10,
                bcvRate: 36.5,
                lastInvoiceNumber: 0,
            });
        }
        res.json(companyInfo);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la información de la empresa' });
    }
};

// @desc    Actualizar la información de la empresa
// @route   PUT /api/company-info
export const updateCompanyInfo = async (req, res) => {
    try {
        let companyInfo = await CompanyInfo.findOne();
        if (companyInfo) {
            await companyInfo.update(req.body);
        } else {
            companyInfo = await CompanyInfo.create(req.body);
        }
        res.json(companyInfo);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la información de la empresa' });
    }
};

// @desc    Obtener la última tasa de cambio del BCV
// @route   GET /api/company-info/bcv-rate
export const getLatestBcvRate = async (req, res) => {
    try {
        const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial');
        
        // CORRECCIÓN FINAL: Usamos 'promedio' como valor principal
        const rate = response.data?.promedio;

        if (!rate || typeof rate !== 'number') {
            console.warn('La respuesta de DolarAPI no incluyó un promedio válido:', response.data);
            return res.status(404).json({ message: 'No se pudo obtener una tasa de cambio válida del proveedor.' });
        }
        
        res.json({ rate });

    } catch (error) {
        console.error('Error al contactar la API de DolarAPI:', error.message);
        res.status(502).json({ message: 'Error en el servidor al contactar el servicio de tasa de cambio.' });
    }
};