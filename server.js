import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sequelize, syncDatabase } from './models/index.js';
import cron from 'node-cron';
import morgan from 'morgan';

// Importar todas las rutas
import authRoutes from './routes/auth.routes.js';
import companyInfoRoutes from './routes/companyInfo.routes.js';
import clientRoutes from './routes/client.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import userRoutes from './routes/user.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import officeRoutes from './routes/office.routes.js';
import roleRoutes from './routes/role.routes.js';
import categoryRoutes from './routes/category.routes.js';
import shippingTypeRoutes from './routes/shippingType.routes.js';
import paymentMethodRoutes from './routes/paymentMethod.routes.js';
import expenseCategoryRoutes from './routes/expenseCategory.routes.js';
import assetCategoryRoutes from './routes/assetCategory.routes.js';
import assetRoutes from './routes/asset.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import cuentaContableRoutes from './routes/cuentaContable.routes.js';
import productRoutes from './routes/product.routes.js';
import asociadoRoutes from './routes/asociado.routes.js'; 
import remesaRoutes from './routes/remesa.routes.js';
import asientoManualRoutes from './routes/asientoManual.routes.js';
import { updateBcvRate } from './services/rateUpdater.js';

// Cargar variables de entorno (solo se necesita una vez)
dotenv.config();

// --- Tareas Programadas (Cron Jobs) ---
cron.schedule('0 */8 * * *', () => {
  updateBcvRate();
});

const app = express();

// --- Middleware de Logging (Morgan) ---
// Usamos el formato 'combined', que es un estándar e incluye la dirección IP del solicitante.
app.use(morgan('combined'));

// --- Configuración de CORS ---
// Lista de orígenes permitidos.
const allowedOrigins = [
  'http://localhost:3000', // Origen para desarrollo local.
  // Expresión regular para aceptar cualquier subdominio del entorno de desarrollo en la nube.
  /https:\/\/.*-h813239537\.scf\.usercontent\.goog$/ 
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones sin origen (como Postman o apps móviles) y las de la whitelist.
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      (allowedOrigin instanceof RegExp) ? allowedOrigin.test(origin) : allowedOrigin === origin
    );
    if (isAllowed || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/company-info', companyInfoRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shipping-types', shippingTypeRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/asset-categories', assetCategoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/cuentas-contables', cuentaContableRoutes);
app.use('/api/products', productRoutes);
app.use('/api/asociados', asociadoRoutes);
app.use('/api/remesas', remesaRoutes);
app.use('/api/asientos-manuales', asientoManualRoutes);

// --- Lógica de arranque del servidor ---
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión con PostgreSQL establecida correctamente.');

        await syncDatabase();
        console.log('Tablas sincronizadas correctamente.');

        app.get('/api', (req, res) => {
            res.json({ message: 'API de Transporte Alianza funcionando correctamente.' });
        });

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();
updateBcvRate();
console.log('ACTUALIZACION TASA BCV CADA 8HRS');