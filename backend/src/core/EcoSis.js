/**
 * EcoSis - Clase Principal del Sistema
 * Gestiona todos los componentes: Base de datos, Clasificador, Importador
 * Actúa como orquestador central de la aplicación
 */

const Database = require('../database/Database');
const ClasificadorService = require('../services/ClasificadorService');
const ImportadorService = require('../services/ImportadorService');
const Transaccion = require('../models/Transaccion');

class EcoSis {
    constructor() {
        console.log('🚀 Inicializando EcoSis...');
        
        // Inicializar componentes del sistema
        this.database = new Database();
        this.clasificador = new ClasificadorService();
        this.importador = new ImportadorService(this);
        
        // Estado del sistema
        this.estado = {
            inicializado: false,
            fechaInicio: new Date(),
            version: '1.5.0'
        };
        
        // Inicializar de forma asíncrona
        this.initPromise = this.inicializar();
    }

    async inicializar() {
        await this.database.ready();
        this.estado.inicializado = true;
        console.log('✅ EcoSis inicializado correctamente');
    }

    async ready() {
        await this.initPromise;
        return this;
    }

    // ==========================================
    // GESTIÓN DE TRANSACCIONES
    // ==========================================

    /**
     * Obtener todas las transacciones
     */
    obtenerTransacciones(filtros = {}) {
        return this.database.obtenerTransacciones(filtros);
    }

    /**
     * Obtener una transacción por ID
     */
    obtenerTransaccionPorId(id) {
        return this.database.obtenerTransaccionPorId(id);
    }

    /**
     * Crear una nueva transacción
     */
    crearTransaccion(datos) {
        // Clasificar automáticamente si no tiene categoría
        if (!datos.categoria) {
            datos.categoria = this.clasificador.clasificar(datos.concepto);
        }
        const transaccion = new Transaccion(datos);
        return this.database.insertarTransaccion(transaccion);
    }

    /**
     * Actualizar una transacción existente
     */
    actualizarTransaccion(id, datos) {
        return this.database.actualizarTransaccion(id, datos);
    }

    /**
     * Eliminar una transacción
     */
    eliminarTransaccion(id) {
        return this.database.eliminarTransaccion(id);
    }

    /**
     * Importar transacciones desde archivo
     */
    async importarTransacciones(archivo, tipo = 'csv') {
        const transacciones = await this.importador.importar(archivo, tipo);
        
        const resultados = {
            total: transacciones.length,
            exitosas: 0,
            fallidas: 0,
            errores: []
        };

        for (const datos of transacciones) {
            try {
                this.crearTransaccion(datos);
                resultados.exitosas++;
            } catch (error) {
                resultados.fallidas++;
                resultados.errores.push({ datos, error: error.message });
            }
        }

        return resultados;
    }

    // ==========================================
    // CLASIFICACIÓN
    // ==========================================

    /**
     * Clasificar un concepto
     */
    clasificarConcepto(concepto) {
        return this.clasificador.clasificar(concepto);
    }

    /**
     * Reclasificar todas las transacciones
     */
    reclasificarTodas() {
        const transacciones = this.database.obtenerTransacciones();
        let actualizadas = 0;

        for (const trans of transacciones) {
            const nuevaCategoria = this.clasificador.clasificar(trans.concepto);
            if (nuevaCategoria !== trans.categoria) {
                this.database.actualizarTransaccion(trans.id, { categoria: nuevaCategoria });
                actualizadas++;
            }
        }

        return { total: transacciones.length, actualizadas };
    }

    /**
     * Agregar regla de clasificación personalizada
     */
    agregarReglaClasificacion(palabraClave, categoria) {
        return this.clasificador.agregarRegla(palabraClave, categoria);
    }

    // ==========================================
    // ESTADÍSTICAS Y REPORTES
    // ==========================================

    /**
     * Obtener resumen por categorías
     */
    obtenerResumenCategorias(fechaInicio = null, fechaFin = null) {
        return this.database.obtenerResumenPorCategoria(fechaInicio, fechaFin);
    }

    /**
     * Obtener resumen mensual
     */
    obtenerResumenMensual(año = null) {
        return this.database.obtenerResumenMensual(año);
    }

    /**
     * Obtener balance general
     */
    obtenerBalance(fechaInicio = null, fechaFin = null) {
        const resumen = this.database.obtenerResumenPorCategoria(fechaInicio, fechaFin);
        
        let ingresos = 0;
        let gastos = 0;

        for (const cat of resumen) {
            if (cat.categoria === 'Ingresos') {
                ingresos += cat.total;
            } else {
                gastos += Math.abs(cat.total);
            }
        }

        return {
            ingresos,
            gastos,
            balance: ingresos - gastos
        };
    }

    // ==========================================
    // UTILIDADES DEL SISTEMA
    // ==========================================

    /**
     * Obtener estado del sistema
     */
    obtenerEstado() {
        return {
            ...this.estado,
            estadisticas: {
                totalTransacciones: this.database.contarTransacciones(),
                categorias: this.clasificador.obtenerCategorias()
            }
        };
    }

    /**
     * Obtener lista de categorías disponibles
     */
    obtenerCategorias() {
        return this.clasificador.obtenerCategorias();
    }

    /**
     * Cerrar conexiones y limpiar recursos
     */
    cerrar() {
        console.log('🔄 Cerrando EcoSis...');
        this.database.cerrar();
        console.log('✅ EcoSis cerrado correctamente');
    }
}

module.exports = EcoSis;
