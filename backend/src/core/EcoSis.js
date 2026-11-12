/**
 * EcoSis - Clase Principal del Sistema
 * Gestiona todos los componentes: Base de datos, Clasificador, Importador
 * Actúa como orquestador central de la aplicación
 */

const Database = require('../database/Database');
const ClasificadorService = require('../services/ClasificadorService');
const ImportadorService = require('../services/ImportadorService');
const PrediccionService = require('../services/PrediccionService');
const Transaccion = require('../models/Transaccion');

class EcoSis {
    constructor() {
        console.log('🚀 Inicializando EcoSis...');
        
        // Inicializar componentes del sistema
        this.database = new Database();
        this.clasificador = new ClasificadorService();
        this.importador = new ImportadorService(this);
        this.prediccion = new PrediccionService({
            claveComercio: (concepto, importe) => this.clasificador.claveComercio(concepto, importe)
        });
        
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
        this.clasificador.cargarReglasDesdeDB(this.database.obtenerReglasClasificacion());
        this.clasificador.cargarHistorial(this.database.obtenerClasificacionesManuales());
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
    async crearTransaccion(datos, clasificacion = null) {
        if (datos.categoria) {
            // Categoría elegida en el formulario o traída en el CSV
            datos.categoria = this.clasificador.normalizarCategoria(datos.categoria);
            datos.categoria_origen = datos.categoria_origen || 'manual';
        } else {
            clasificacion = clasificacion
                || await this.clasificador.clasificarDetallado(datos.concepto, Number(datos.importe));
            datos.categoria = clasificacion.categoria;
            datos.categoria_origen = clasificacion.origen;
            datos.categoria_confianza = clasificacion.confianza;
        }

        const transaccion = new Transaccion(datos);
        const creada = this.database.insertarTransaccion(transaccion);
        if (datos.categoria_origen === 'manual') {
            this.clasificador.registrarClasificacionManual(transaccion.concepto, transaccion.importe, transaccion.categoria);
        }
        return creada;
    }

    /**
     * Actualizar una transacción desde la interfaz.
     * Guardar la categoría desde el formulario cuenta como revisión manual.
     */
    actualizarTransaccion(id, datos) {
        const cambios = { ...datos };
        if (cambios.categoria) {
            cambios.categoria = this.clasificador.normalizarCategoria(cambios.categoria);
            cambios.categoria_origen = 'manual';
            cambios.categoria_confianza = null;
        }

        const actualizada = this.database.actualizarTransaccion(id, cambios);
        if (actualizada && cambios.categoria) {
            this.clasificador.registrarClasificacionManual(actualizada.concepto, actualizada.importe, actualizada.categoria);
        }
        return actualizada;
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

        // Clasificar de una vez todas las que no traen categoría (una sola llamada al modelo)
        const sinCategoria = transacciones.filter(t => !t.categoria);
        const clasificaciones = await this.clasificador.clasificarLote(
            sinCategoria.map(t => ({ concepto: t.concepto, importe: Number(t.importe) }))
        );
        const clasificacionDe = new Map(sinCategoria.map((t, i) => [t, clasificaciones[i]]));

        for (const datos of transacciones) {
            try {
                if (datos.categoria && !datos.categoria_origen) datos.categoria_origen = 'csv';
                await this.crearTransaccion(datos, clasificacionDe.get(datos));
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
    clasificarConcepto(concepto, importe = null) {
        return this.clasificador.clasificarDetallado(concepto, importe);
    }

    /**
     * Reclasificar las transacciones que no se han clasificado a mano
     * (categoria_origen = 'manual' se respeta para no pisar correcciones).
     * Con simular = true solo devuelve los cambios propuestos, sin aplicarlos.
     */
    async reclasificarTodas({ simular = false } = {}) {
        const transacciones = this.database.obtenerTransacciones();
        const candidatas = transacciones.filter(t => t.categoria_origen !== 'manual');
        const protegidas = transacciones.length - candidatas.length;

        const clasificaciones = await this.clasificador.clasificarLote(
            candidatas.map(t => ({ concepto: t.concepto, importe: t.importe }))
        );

        const cambios = [];
        candidatas.forEach((trans, i) => {
            if (clasificaciones[i].categoria !== trans.categoria) {
                cambios.push({
                    id: trans.id,
                    concepto: trans.concepto,
                    categoriaAnterior: trans.categoria,
                    categoriaNueva: clasificaciones[i].categoria
                });
            }
        });

        // También se guardan origen y confianza de las que no cambian de categoría
        if (!simular) {
            this.database.actualizarClasificaciones(candidatas.map((t, i) => ({
                id: t.id,
                categoria: clasificaciones[i].categoria,
                categoria_origen: clasificaciones[i].origen,
                categoria_confianza: clasificaciones[i].confianza
            })));
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
     * Predicción del ahorro de un mes (por defecto el actual)
     * @param {object} opciones - { mes: 'YYYY-MM', corte: 'YYYY-MM-DD' }
     */
    obtenerPrediccion(opciones = {}) {
        const transacciones = this.database.obtenerTransacciones({ orden: 'ASC' });
        return this.prediccion.calcular(transacciones, opciones);
    }

    /**
     * Comercios/destinatarios donde más se gasta en un periodo.
     * Agrupa con la misma clave que la predicción (sin la parte que cambia cada mes).
     * Inversiones y Vivienda no cuentan como gasto, igual que en el resto de Gráficas.
     */
    obtenerTopComercios({ desde = null, hasta = null, limite = 10 } = {}) {
        const filtros = { orden: 'ASC' };
        if (desde) filtros.fechaInicio = desde;
        if (hasta) filtros.fechaFin = hasta;
        const transacciones = this.database.obtenerTransacciones(filtros);

        const grupos = new Map();
        let totalGasto = 0;
        for (const t of transacciones) {
            if (t.importe >= 0 || t.categoria === 'Inversiones' || t.categoria === 'Vivienda') continue;
            const gasto = -t.importe;
            totalGasto += gasto;
            const clave = this.prediccion.claveComercio(t);
            if (!clave) continue;
            if (!grupos.has(clave)) grupos.set(clave, { clave, total: 0, movimientos: 0, categorias: {}, ultimaFecha: null, concepto: '' });
            const g = grupos.get(clave);
            g.total += gasto;
            g.movimientos += 1;
            g.categorias[t.categoria] = (g.categorias[t.categoria] || 0) + gasto;
            g.ultimaFecha = String(t.fecha).slice(0, 10);
            // El concepto más reciente con tildes bien escritas sirve para el nombre visible
            if (!g.concepto || !String(t.concepto).includes('�')) g.concepto = String(t.concepto || '');
        }

        // La clave va sin tildes (para agrupar); el nombre se saca del concepto original
        const mayusculas = texto => texto.replace(/(^|\s)(\S)/g, (m, sep, c) => sep + c.toUpperCase());
        const nombre = (g) => {
            if (g.clave.startsWith('bizum')) return mayusculas(g.clave.replace(/ \+$/, ''));
            const limpio = g.concepto
                .replace(/^(Pago Movil En|Compra Internet En|Compra De|Compra)\s+/i, '')
                .replace(/^Transferencia (Inmediata )?A Favor De\s+/i, 'Transferencia a ')
                .replace(/\s+Concepto\b.*$/i, '')
                .replace(/[,\s]*Tarj(eta)?\b.*$/i, '')
                .split(',')[0]
                .trim();
            return limpio || mayusculas(g.clave);
        };
        const redondear = v => Math.round(v * 100) / 100;

        const comercios = [...grupos.values()]
            .sort((a, b) => b.total - a.total)
            .slice(0, limite)
            .map(g => ({
                nombre: nombre(g),
                total: redondear(g.total),
                movimientos: g.movimientos,
                media: redondear(g.total / g.movimientos),
                categoria: Object.entries(g.categorias).sort((a, b) => b[1] - a[1])[0][0],
                ultimaFecha: g.ultimaFecha
            }));

        return { desde, hasta, totalGasto: redondear(totalGasto), comercios };
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
