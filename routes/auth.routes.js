import express from 'express';
import { login, refreshToken, logout, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// --- Rate Limiter para el Login ---
// Previene ataques de fuerza bruta.
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10, // Limita cada IP a 10 intentos de login por ventana de 15 mins.
	message: 'Demasiados intentos de inicio de sesión desde esta IP. Por favor, intente de nuevo después de 15 minutos.',
    standardHeaders: true, // Devuelve la información del rate limit en los headers `RateLimit-*`
	legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

router.post('/login', loginLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout); // <-- Esta es la ruta que faltaba

router.get('/profile', protect, getMe);

export default router;