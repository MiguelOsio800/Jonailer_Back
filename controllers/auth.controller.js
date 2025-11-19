import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';
import bcrypt from 'bcryptjs';

// --- FUNCIÓN DE LOGIN CON RESPUESTA DE TOKEN JWT ---
export const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Por favor, proporcione un usuario y contraseña.' });
        }

        const user = await User.findOne({ 
            where: { username },
            include: { model: Role } 
        });

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Generamos ambos tokens
                const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                    expiresIn: '15m',
                });
                const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
                    expiresIn: '1h',
                });
                
                const { password: _, ...userWithoutPassword } = user.toJSON();

                // --- CAMBIO: ENVIAMOS TOKENS EN LA RESPUESTA JSON ---
                return res.json({ 
                    user: userWithoutPassword, accessToken, refreshToken 
                });
            }
        }

        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

    } catch (error) {
        console.error('Error en el login:', error);
        return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// --- FUNCIÓN DE REFRESH TOKEN ---
export const refreshToken = async (req, res) => {
    // Leemos el token desde el cuerpo de la solicitud
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un refresh token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }

        // Generamos un nuevo accessToken
        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '15m',
        });

        // --- CAMBIO: Enviamos el nuevo token en la respuesta JSON ---
        res.status(200).json({ accessToken: newAccessToken });

    } catch (error) {
        return res.status(403).json({ message: 'Refresh token inválido o expirado. Por favor, inicie sesión de nuevo.' });
    }
};

// --- FUNCIÓN DE LOGOUT ---
export const logout = (req, res) => {
    // El logout ahora es responsabilidad del cliente (borrar los tokens).
    // El backend simplemente confirma la acción.
    return res.status(200).json({ message: 'Sesión cerrada exitosamente' });
};


// @desc    Obtener el perfil del usuario actualmente logueado
// @route   GET /api/auth/profile
export const getMe = async (req, res) => {
    // req.user es añadido por el middleware 'protect'
    res.status(200).json(req.user);
};