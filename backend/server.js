/**
 * Servidor principal de AppBanco
 * Punto de entrada de la aplicación
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const EcoSis = require('./src/core/EcoSis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar el sistema principal
const ecoSis = new EcoSis();

// Hacer EcoSis disponible en las rutas
app.set('ecoSis', ecoSis);

// Rutas de la API
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});

// Iniciar servidor después de que EcoSis esté listo
async function iniciarServidor() {
    try {
        await ecoSis.ready();
        const HOST = process.env.HOST || '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log('================================================');
            console.log('  🏦 AppBanco v1.5 - Sistema de Transacciones');
            console.log('================================================');
            console.log(`  📡 Servidor corriendo en: http://${HOST}:${PORT}`);
            console.log(`  📊 API disponible en: http://${HOST}:${PORT}/api`);
            console.log('================================================');
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

iniciarServidor();

module.exports = app;
