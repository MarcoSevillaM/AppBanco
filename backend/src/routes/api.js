/**
 * API Routes - Definición de rutas REST
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const TransaccionController = require('../controllers/TransaccionController');
const { AuthController, authMiddleware } = require('../controllers/AuthController');

const router = express.Router();

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.json'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Use CSV o JSON.'));
        }
    }
});

// ==========================================
// RUTAS DE AUTENTICACIÓN (públicas)
// ==========================================

// Login
router.post('/auth/login', AuthController.login);

// Verificar token
router.get('/auth/verify', authMiddleware, AuthController.verify);

// ==========================================
// RUTAS DEL SISTEMA
// ==========================================

// Estado del sistema
router.get('/estado', TransaccionController.obtenerEstado);

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==========================================
// PROTEGER TODAS LAS RUTAS SIGUIENTES
// ==========================================
router.use(authMiddleware);

// ==========================================
// RUTAS DE TRANSACCIONES
// ==========================================

// Listar todas las transacciones
router.get('/transacciones', TransaccionController.obtenerTodas);

// Obtener una transacción por ID
router.get('/transacciones/:id', TransaccionController.obtenerPorId);

// Crear nueva transacción
router.post('/transacciones', TransaccionController.crear);

// Actualizar transacción
router.put('/transacciones/:id', TransaccionController.actualizar);

// Eliminar transacción
router.delete('/transacciones/:id', TransaccionController.eliminar);

// ==========================================
// RUTAS DE IMPORTACIÓN/EXPORTACIÓN
// ==========================================

// Importar transacciones desde archivo
router.post('/transacciones/importar', upload.single('archivo'), TransaccionController.importar);

// ==========================================
// RUTAS DE CLASIFICACIÓN
// ==========================================

// Clasificar un concepto
router.post('/clasificar', TransaccionController.clasificar);

// Reclasificar todas las transacciones
router.post('/reclasificar', TransaccionController.reclasificar);

// Obtener categorías disponibles
router.get('/categorias', TransaccionController.obtenerCategorias);

// ==========================================
// RUTAS DE ESTADÍSTICAS
// ==========================================

// Resumen por categorías
router.get('/estadisticas/categorias', TransaccionController.obtenerResumenCategorias);

// Resumen mensual
router.get('/estadisticas/mensual', TransaccionController.obtenerResumenMensual);

// Balance general
router.get('/estadisticas/balance', TransaccionController.obtenerBalance);



module.exports = router;
