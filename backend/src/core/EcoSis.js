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
    async crearTransaccion(datos) {
        // Clasificar automáticamente si no tiene categoría
        if (!datos.categoria) {
            datos.categoria = await this.clasificador.clasificar(datos.concepto);
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
                await this.crearTransaccion(datos);
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
     * Reclasificar las transacciones que no se han editado a mano.
     * Una transacción editada tiene fecha_actualizacion posterior a fecha_creacion;
     * esas se respetan para no pisar correcciones manuales.
     * Con simular = true solo devuelve los cambios propuestos, sin aplicarlos.
     */
    async reclasificarTodas({ simular = false } = {}) {
        const transacciones = this.database.obtenerTransacciones();
        const cambios = [];
        let protegidas = 0;

        for (const trans of transacciones) {
            if (trans.fecha_actualizacion > trans.fecha_creacion) {
                protegidas++;
                continue;
            }

            const nuevaCategoria = await this.clasificador.clasificar(trans.concepto);
            if (nuevaCategoria !== trans.categoria) {
                cambios.push({
                    id: trans.id,
                    concepto: trans.concepto,
                    categoriaAnterior: trans.categoria,
                    categoriaNueva: nuevaCategoria
                });
            }
        }

        if (!simular) {
            for (const cambio of cambios) {
                this.database.actualizarTransaccion(cambio.id, { categoria: cambio.categoriaNueva });
            }
        }

        return {
            total: transacciones.length,
            protegidas,
            actualizadas: simular ? 0 : cambios.length,
            simulado: simular,
            cambios
        };
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
    // PATRIMONIO
    // ==========================================

    /**
     * Obtener configuración de patrimonio
     */
    obtenerConfiguracion() {
        return this.database.obtenerConfiguracion();
    }

    /**
     * Actualizar configuración de patrimonio (solo claves conocidas)
     */
    actualizarConfiguracion(datos = {}) {
        const numericas = ['saldo_inicial', 'valor_inversiones'];
        const permitidas = [...numericas, 'fecha_saldo_inicial', 'cuenta_inversiones'];

        for (const [clave, valor] of Object.entries(datos)) {
            if (!permitidas.includes(clave) || valor === undefined || valor === null) continue;
            if (numericas.includes(clave) && isNaN(parseFloat(valor))) {
                throw new Error(`Valor no numérico para ${clave}`);
            }
            this.database.guardarConfiguracion(clave, valor);
        }

        return this.obtenerConfiguracion();
    }

    /**
     * Calcular dinero líquido y patrimonio total hasta una fecha.
     * Líquido = saldo inicial + movimientos (salvo los internos de la cuenta de inversiones).
     * Patrimonio = líquido + valor actual de las inversiones.
     */
    obtenerPatrimonio(fechaFin = null) {
        const config = this.obtenerConfiguracion();
        const saldoInicial = parseFloat(config.saldo_inicial) || 0;
        const valorInversiones = parseFloat(config.valor_inversiones) || 0;
        const movimientos = this.database.sumarMovimientosLiquidos(fechaFin, config.cuenta_inversiones || null);
        const liquido = saldoInicial + movimientos;

        return {
            fechaFin: fechaFin || null,
            saldoInicial,
            fechaSaldoInicial: config.fecha_saldo_inicial || null,
            movimientos,
            liquido,
            valorInversiones,
            total: liquido + valorInversiones
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
