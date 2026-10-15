/**
 * ClasificadorService - Servicio de clasificación automática de transacciones
 * Clasifica conceptos en categorías basándose en palabras clave o IA (Python)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClasificadorService {
    constructor() {
        // Categorías disponibles (mismos nombres que en la BD y el frontend)
        this.categorias = [
            'Inversiones',
            'Coche',
            'Alimentación',
            'Gastos recurrentes',
            'Ocio',
            'Ingresos',
            'Vivienda',
            'Otros'
        ];

        // Nombres antiguos que todavía devuelve el modelo de IA -> nombre canónico
        this.aliasCategorias = {
            'Inversión': 'Inversiones',
            'Inversion': 'Inversiones',
            'Gastos Recurrentes': 'Gastos recurrentes'
        };

        // Reglas que se aplican antes que la IA (el modelo no conoce estas categorías).
        // Se comparan contra el concepto en minúsculas y sin tildes.
        this.reglasPrioritarias = {
            'amortizacion prestamo mama': 'Vivienda',
            'reforma piso': 'Vivienda',
            'notaria': 'Vivienda',
            'tasiberica': 'Vivienda'
        };

        // Modo de clasificación: 'reglas' o 'ia'
        this.modoClasificacion = 'ia'; // Por defecto usa reglas
        
        // Umbral de confianza para clasificación por IA
        this.umbralConfianza = 0.6; // Si la confianza es menor, usar 'Otros'

        // Modelo de IA (se cargará si está disponible)
        this.modeloIA = null;
        this.modeloIACargado = false;

        // Reglas de clasificación por defecto (palabras clave -> categoría)
        this.reglas = {
            // Inversiones
            'inversión': 'Inversiones',
            'inversion': 'Inversiones',
            'fondos': 'Inversiones',
            'acciones': 'Inversiones',
            'etf': 'Inversiones',
            'broker': 'Inversiones',
            'degiro': 'Inversiones',
            'trading': 'Inversiones',
            'bolsa': 'Inversiones',
            'cripto': 'Inversiones',
            'bitcoin': 'Inversiones',
            'indexa': 'Inversiones',
            'myinvestor': 'Inversiones',

            // Coche
            'gasolina': 'Coche',
            'gasolinera': 'Coche',
            'combustible': 'Coche',
            'diesel': 'Coche',
            'parking': 'Coche',
            'aparcamiento': 'Coche',
            'peaje': 'Coche',
            'autopista': 'Coche',
            'taller': 'Coche',
            'itv': 'Coche',
            'seguro coche': 'Coche',
            'repsol': 'Coche',
            'cepsa': 'Coche',
            'bp': 'Coche',
            'shell': 'Coche',

            // Alimentación
            'mercadona': 'Alimentación',
            'carrefour': 'Alimentación',
            'lidl': 'Alimentación',
            'aldi': 'Alimentación',
            'dia': 'Alimentación',
            'supermercado': 'Alimentación',
            'alimentacion': 'Alimentación',
            'alimentación': 'Alimentación',
            'hipercor': 'Alimentación',
            'eroski': 'Alimentación',
            'alcampo': 'Alimentación',
            'consum': 'Alimentación',
            'ahorramas': 'Alimentación',
            'fruteria': 'Alimentación',
            'carniceria': 'Alimentación',
            'panaderia': 'Alimentación',

            // Gastos recurrentes
            'alquiler': 'Gastos recurrentes',
            'hipoteca': 'Gastos recurrentes',
            'luz': 'Gastos recurrentes',
            'electricidad': 'Gastos recurrentes',
            'iberdrola': 'Gastos recurrentes',
            'endesa': 'Gastos recurrentes',
            'naturgy': 'Gastos recurrentes',
            'gas': 'Gastos recurrentes',
            'agua': 'Gastos recurrentes',
            'telefono': 'Gastos recurrentes',
            'móvil': 'Gastos recurrentes',
            'movil': 'Gastos recurrentes',
            'internet': 'Gastos recurrentes',
            'fibra': 'Gastos recurrentes',
            'movistar': 'Gastos recurrentes',
            'vodafone': 'Gastos recurrentes',
            'orange': 'Gastos recurrentes',
            'netflix': 'Gastos recurrentes',
            'spotify': 'Gastos recurrentes',
            'hbo': 'Gastos recurrentes',
            'amazon prime': 'Gastos recurrentes',
            'gimnasio': 'Gastos recurrentes',
            'gym': 'Gastos recurrentes',
            'seguro': 'Gastos recurrentes',
            'comunidad': 'Gastos recurrentes',

            // Ocio
            'restaurante': 'Ocio',
            'bar': 'Ocio',
            'cafeteria': 'Ocio',
            'cafe': 'Ocio',
            'cine': 'Ocio',
            'teatro': 'Ocio',
            'concierto': 'Ocio',
            'hotel': 'Ocio',
            'viaje': 'Ocio',
            'vuelo': 'Ocio',
            'avion': 'Ocio',
            'booking': 'Ocio',
            'airbnb': 'Ocio',
            'renfe': 'Ocio',
            'tren': 'Ocio',
            'zara': 'Ocio',
            'mango': 'Ocio',
            'ropa': 'Ocio',
            'amazon': 'Ocio',
            'juego': 'Ocio',
            'steam': 'Ocio',
            'playstation': 'Ocio',
            'xbox': 'Ocio',

            // Ingresos
            'nomina': 'Ingresos',
            'nómina': 'Ingresos',
            'salario': 'Ingresos',
            'sueldo': 'Ingresos',
            'transferencia recibida': 'Ingresos',
            'ingreso': 'Ingresos',
            'devolucion': 'Ingresos',
            'devolución': 'Ingresos',
            'reembolso': 'Ingresos',
            'dividendo': 'Ingresos',
            'intereses': 'Ingresos',
            'alquiler recibido': 'Ingresos'
        };

        // Reglas personalizadas (se cargarán desde la base de datos)
        this.reglasPersonalizadas = {};

        // Ruta al script Python y al intérprete que lo ejecuta
        this.pythonScript = path.join(__dirname, '../../../modelo/modelo_clasificador.py');
        this.pythonBin = this.resolverPython();
        
        // Inicializar modelo de IA de forma asíncrona
        this.inicializarModeloIA();
    }

    /**
     * Elegir el intérprete de Python: PYTHON_PATH del .env, si no el .venv del
     * proyecto y, como último recurso, el "python" del sistema.
     * El del sistema no suele tener las dependencias del modelo (unidecode, sklearn).
     */
    resolverPython() {
        if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;

        const raiz = path.join(__dirname, '../../..');
        const candidatos = [
            path.join(raiz, '.venv', 'Scripts', 'python.exe'),
            path.join(raiz, '.venv', 'bin', 'python')
        ];
        return candidatos.find(c => fs.existsSync(c)) || 'python';
    }

    /**
     * Comprobar que el intérprete puede importar las dependencias del modelo
     */
    comprobarDependenciasPython() {
        return new Promise(resolve => {
            const proceso = spawn(this.pythonBin, ['-c', 'import unidecode, sklearn, numpy']);
            let stderr = '';
            proceso.stderr.on('data', d => { stderr += d.toString(); });
            proceso.on('close', code => resolve({ ok: code === 0, error: stderr.trim().split('\n').pop() }));
            proceso.on('error', error => resolve({ ok: false, error: error.message }));
        });
    }

    /**
     * Inicializar modelo de IA (verifica si existe el modelo Python)
     */
    async inicializarModeloIA() {
        try {
            const fs = require('fs').promises;
            const modeloPath = path.join(__dirname, '../../../modelo/modelo_guardado.pkl');
            
            const existe = await fs.access(modeloPath)
                .then(() => true)
                .catch(() => false);
            
            if (existe) {
                const dependencias = await this.comprobarDependenciasPython();
                if (dependencias.ok) {
                    this.modeloIACargado = true;
                    console.log(`🤖 Modelo de IA (Python) disponible con ${this.pythonBin}`);
                } else {
                    console.log(`⚠️ Modelo de IA no disponible: ${this.pythonBin} no puede cargarlo (${dependencias.error}).`);
                    console.log('   Usando clasificación por reglas. Define PYTHON_PATH en backend/.env o crea .venv.');
                }
            } else {
                console.log('📋 Modelo de IA no disponible. Usando clasificación por reglas.');
                console.log('   Para entrenar: python modelo/entrenar_modelo.py');
            }
        } catch (error) {
            console.log('⚠️ Error al verificar modelo:', error.message);
            console.log('   Usando clasificación por reglas.');
        }
    }

    /**
     * Cambiar modo de clasificación
     */
    establecerModo(modo) {
        if (!['reglas', 'ia'].includes(modo)) {
            throw new Error('Modo debe ser "reglas" o "ia"');
        }

        if (modo === 'ia' && !this.modeloIACargado) {
            throw new Error('Modelo de IA no está cargado. Entrena el modelo primero.');
        }

        this.modoClasificacion = modo;
        console.log(`🔧 Modo de clasificación cambiado a: ${modo}`);
    }

    /**
     * Obtener información del modo actual
     */
    obtenerModoActual() {
        return {
            modo: this.modoClasificacion,
            modeloIADisponible: this.modeloIACargado,
            umbralConfianza: this.umbralConfianza
        };
    }

    /**
     * Clasificar un concepto en una categoría
     */
    async clasificar(concepto) {
        if (!concepto) return 'Otros';

        const categoriaPrioritaria = this.buscarReglaPrioritaria(concepto);
        if (categoriaPrioritaria) return categoriaPrioritaria;

        // Clasificar según el modo configurado
        if (this.modoClasificacion === 'ia' && this.modeloIACargado) {
            return await this.clasificarConIA(concepto);
        } else {
            console.log('⚙️ Usando clasificación por reglas para concepto:', concepto);
            return this.clasificarConReglas(concepto);
        }
    }

    /**
     * Pasar a minúsculas y quitar tildes para comparar textos
     */
    normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Comprobar si la palabra clave aparece como palabra completa
     * ("dia" no debe coincidir con "Mediador", ni "bar" con "Salvador").
     * Admite plural: "nomina" coincide con "Nominas".
     */
    contienePalabra(textoNormalizado, palabraClave) {
        const palabra = this.normalizarTexto(palabraClave)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${palabra}(e?s)?($|[^a-z0-9])`).test(textoNormalizado);
    }

    /**
     * Traducir un nombre de categoría a su forma canónica
     */
    normalizarCategoria(categoria) {
        return this.aliasCategorias[categoria] || categoria;
    }

    /**
     * Buscar coincidencia en las reglas prioritarias (ignora mayúsculas y tildes)
     */
    buscarReglaPrioritaria(concepto) {
        const conceptoNormalizado = this.normalizarTexto(concepto);

        for (const [palabra, categoria] of Object.entries(this.reglasPrioritarias)) {
            if (this.contienePalabra(conceptoNormalizado, palabra)) {
                return categoria;
            }
        }
        return null;
    }

    /**
     * Clasificar usando reglas (método original)
     */
    clasificarConReglas(concepto) {
        const categoriaPrioritaria = this.buscarReglaPrioritaria(concepto);
        if (categoriaPrioritaria) return categoriaPrioritaria;

        // Quitar los prefijos de Santander: "Pago Movil En ..." y "Compra Internet En ..."
        // describen el medio de pago, no el comercio, y activaban las reglas "movil" e "internet"
        const conceptoNormalizado = this.normalizarTexto(concepto)
            .replace(/\b(pago movil|compra internet) en\b/g, ' ');

        // Primero buscar en reglas personalizadas (tienen prioridad)
        for (const [palabra, categoria] of Object.entries(this.reglasPersonalizadas)) {
            if (this.contienePalabra(conceptoNormalizado, palabra)) {
                return this.normalizarCategoria(categoria);
            }
        }

        // Luego buscar en reglas por defecto
        for (const [palabra, categoria] of Object.entries(this.reglas)) {
            if (this.contienePalabra(conceptoNormalizado, palabra)) {
                return categoria;
            }
        }

        // Si no se encuentra coincidencia, retornar 'Otros'
        return 'Otros';
    }

    /**
     * Clasificar usando modelo de IA (Python)
     */
    async clasificarConIA(concepto) {
        try {
            const prediccion = await this.llamarModeloPython('predecir', concepto);
            
            // Si la confianza es baja, usar clasificación por reglas como fallback
            if (prediccion.confianza < this.umbralConfianza) {
                console.log(prediccion.categoria)
                const categoriaReglas = this.clasificarConReglas(concepto);
                console.log(`⚠️ Baja confianza (${(prediccion.confianza * 100).toFixed(1)}%) para "${concepto}". Usando reglas: ${categoriaReglas}`);
                return categoriaReglas;
            }

            return this.normalizarCategoria(prediccion.categoria);

        } catch (error) {
            console.error('Error en clasificación por IA:', error.message);
            // Fallback a reglas en caso de error
            return this.clasificarConReglas(concepto);
        }
    }

    /**
     * Llamar al script Python para predicción
     */
    llamarModeloPython(comando, ...args) {
        return new Promise((resolve, reject) => {
            // Forzar UTF-8: en Windows Python escribe en cp1252 y "Alimentación" llegaba corrupta
            const python = spawn(this.pythonBin, [this.pythonScript, comando, ...args], {
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            });
            
            let stdout = '';
            let stderr = '';
            
            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python error: ${stderr}`));
                    return;
                }
                
                try {
                    const resultado = JSON.parse(stdout);
                    resolve(resultado);
                } catch (error) {
                    reject(new Error(`Error parseando JSON: ${stdout}`));
                }
            });
            
            python.on('error', (error) => {
                reject(new Error(`Error ejecutando Python: ${error.message}`));
            });
        });
    }

    /**
     * Clasificar múltiples conceptos (batch)
     */
    async clasificarLote(conceptos) {
        const categorias = [];
        for (const concepto of conceptos) {
            categorias.push(await this.clasificar(concepto));
        }
        return categorias;
    }

    /**
     * Obtener predicción detallada con probabilidades
     */
    async obtenerPrediccionDetallada(concepto) {
        if (!this.modeloIACargado) {
            return {
                categoria: this.clasificarConReglas(concepto),
                confianza: 1.0,
                metodo: 'reglas',
                probabilidades: null
            };
        }

        try {
            const prediccion = await this.modeloIA.predecir(concepto);
            return {
                ...prediccion,
                metodo: 'ia'
            };
        } catch (error) {
            return {
                categoria: this.clasificarConReglas(concepto),
                confianza: 1.0,
                metodo: 'reglas',
                error: error.message
            };
        }
    }

    /**
     * Obtener lista de categorías disponibles
     */
    obtenerCategorias() {
        return [...this.categorias];
    }

    /**
     * Agregar regla de clasificación personalizada
     */
    agregarRegla(palabraClave, categoria) {
        categoria = this.normalizarCategoria(categoria);
        if (!this.categorias.includes(categoria)) {
            throw new Error(`Categoría no válida: ${categoria}`);
        }

        const palabraLower = palabraClave.toLowerCase().trim();
        this.reglasPersonalizadas[palabraLower] = categoria;

        return { palabraClave: palabraLower, categoria };
    }

    /**
     * Eliminar regla personalizada
     */
    eliminarRegla(palabraClave) {
        const palabraLower = palabraClave.toLowerCase().trim();
        delete this.reglasPersonalizadas[palabraLower];
    }

    /**
     * Cargar reglas personalizadas desde la base de datos
     */
    cargarReglasDesdeDB(reglas) {
        for (const regla of reglas) {
            this.reglasPersonalizadas[regla.palabra_clave] = this.normalizarCategoria(regla.categoria);
        }
        console.log(`📋 Cargadas ${reglas.length} reglas personalizadas`);
    }

    /**
     * Obtener todas las reglas (por defecto + personalizadas)
     */
    obtenerReglas() {
        return {
            prioritarias: { ...this.reglasPrioritarias },
            default: { ...this.reglas },
            personalizadas: { ...this.reglasPersonalizadas }
        };
    }

    /**
     * Sugerir categoría basándose en el importe
     * (Complemento a la clasificación por concepto)
     */
    sugerirPorImporte(importe) {
        if (importe > 0) {
            return 'Ingresos';
        }
        return null; // No se puede determinar solo por importe negativo
    }

    /**
     * Obtener estadísticas de clasificación
     */
    obtenerEstadisticas() {
        return {
            totalCategorias: this.categorias.length,
            totalReglasDefault: Object.keys(this.reglas).length,
            totalReglasPersonalizadas: Object.keys(this.reglasPersonalizadas).length
        };
    }
}

module.exports = ClasificadorService;
