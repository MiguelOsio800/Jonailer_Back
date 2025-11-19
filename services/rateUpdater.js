// services/rateUpdater.js

import axios from 'axios';
import { CompanyInfo } from '../models/index.js';

/**
 * Busca la tasa de cambio más reciente del BCV desde una API externa
 * y la actualiza en la base de datos.
 */
export const updateBcvRate = async () => {
  console.log('🕒 Ejecutando tarea automática: Actualizando tasa del BCV...');

  try {
    // 1. Consultar la API externa para obtener la tasa
    const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial');
    const rate = response.data?.promedio;

    if (!rate || typeof rate !== 'number') {
      console.error('❌ No se pudo obtener una tasa válida desde la API externa. Se cancela la actualización.');
      return;
    }

    // 2. Buscar el registro de la información de la empresa
    const companyInfo = await CompanyInfo.findOne();
    if (!companyInfo) {
      console.error('❌ No se encontró la información de la empresa en la base de datos. Se cancela la actualización.');
      return;
    }

    // 3. Actualizar la tasa solo si es diferente a la que ya está guardada
    if (companyInfo.bcvRate !== rate) {
      companyInfo.bcvRate = rate;
      await companyInfo.save();
      console.log(`✅ Tasa del BCV actualizada exitosamente a: ${rate}`);
    } else {
      console.log('ℹ️ La tasa del BCV ya está actualizada. No se realizaron cambios.');
    }

  } catch (error) {
    console.error('❌ Error durante la actualización automática de la tasa del BCV:', error.message);
  }
};