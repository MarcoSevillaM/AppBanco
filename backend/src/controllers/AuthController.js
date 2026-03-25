/**
 * AuthController - Controlador de autenticación
 * Maneja el login y verificación de tokens
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'appbanco_v1.5_secret_key_2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

const AuthController = {
    /**
     * POST /api/auth/login
     * Autenticar usuario administrador
     */
    async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ 
                    error: 'Usuario y contraseña son requeridos' 
                });
            }

            const ecoSis = req.app.get('ecoSis');
            const db = ecoSis.database;
            await db.ready();

            // Buscar usuario en la tabla admin
            const admin = db.obtenerAdmin(username);

            if (!admin) {
                return res.status(401).json({ 
                    error: 'Credenciales inválidas' 
                });
            }

            // Verificar contraseña con bcrypt
            const passwordValida = await bcrypt.compare(password, admin.password_hash);

            if (!passwordValida) {
                return res.status(401).json({ 
                    error: 'Credenciales inválidas' 
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                { id: admin.id, username: admin.username },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            res.json({
                message: 'Login exitoso',
                token,
                username: admin.username
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * GET /api/auth/verify
     * Verificar si el token es válido
     */
    verify(req, res) {
        // Si llegó aquí, el middleware ya validó el token
        res.json({ 
            valid: true, 
            username: req.user.username 
        });
    }
};

/**
 * Middleware de autenticación
 * Verifica el token JWT en las peticiones protegidas
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = { AuthController, authMiddleware };
