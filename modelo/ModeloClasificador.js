/**
 * ModeloClasificador - Modelo de IA para clasificación de transacciones
 * Utiliza TensorFlow.js para clasificar transacciones en categorías
 */

const tf = require('@tensorflow/tfjs');
//const tf = require('@tensorflow/tfjs-node-gpu');
const path = require('path');
const fs = require('fs').promises;

class ModeloClasificador {
    constructor() {
        this.modelo = null;
        this.vocabulario = null;
        this.categorias = [
            'Inversión',
            'Coche',
            'Alimentación',
            'Gastos Recurrentes',
            'Ocio',
            'Ingresos',
            'Otros'
        ];
        this.maxLen = 50; // Longitud máxima del texto procesado
        this.modeloPath = path.join(__dirname, 'modelo_guardado');
        this.vocabularioPath = path.join(__dirname, 'vocabulario.json');
        this.cargado = false;
    }

    /**
     * Crear el modelo de red neuronal
     */
    crearModelo() {
        const modelo = tf.sequential();

        modelo.add(tf.layers.embedding({
            inputDim: 2000,
            outputDim: 64,
            inputLength: this.maxLen
        }));

        modelo.add(tf.layers.globalAveragePooling1d());

        modelo.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));

        modelo.add(tf.layers.dropout({ rate: 0.3 }));

        modelo.add(tf.layers.dense({
            units: this.categorias.length,
            activation: 'softmax'
        }));

        modelo.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return modelo;
    }

    /**
     * Construir vocabulario desde textos
     */
    construirVocabulario(textos) {
        const palabras = new Set();
        
        textos.forEach(texto => {
            const tokens = this.tokenizar(texto);
            tokens.forEach(token => palabras.add(token));
        });

        // Crear mapeo palabra -> índice
        const vocabulario = {
            '<PAD>': 0,
            '<UNK>': 1
        };

        let idx = 2;
        Array.from(palabras)
            .sort()
            .slice(0, 1998) // Dejar espacio para PAD y UNK
            .forEach(palabra => {
                vocabulario[palabra] = idx++;
            });

        return vocabulario;
    }

    /**
     * Tokenizar texto (dividir en palabras)
     */
    tokenizar(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/[^a-z0-9\s]/g, ' ') // Solo letras, números y espacios
            .split(/\s+/)
            .filter(palabra => palabra.length > 0);
    }

    /**
     * Convertir texto a secuencia de índices
     */
    textoASecuencia(texto) {
        const tokens = this.tokenizar(texto);
        const secuencia = tokens.map(token => 
            this.vocabulario[token] || this.vocabulario['<UNK>']
        );

        // Padding o truncado a maxLen
        if (secuencia.length < this.maxLen) {
            // Padding
            return [...secuencia, ...Array(this.maxLen - secuencia.length).fill(0)];
        } else {
            // Truncar
            return secuencia.slice(0, this.maxLen);
        }
    }

    /**
     * Preparar datos para entrenamiento
     */
    prepararDatos(transacciones) {
        const textos = transacciones.map(t => t.concepto);
        
        // Construir vocabulario si no existe
        if (!this.vocabulario) {
            this.vocabulario = this.construirVocabulario(textos);
        }

        // Convertir textos a secuencias
        const X = textos.map(texto => this.textoASecuencia(texto));

        // Convertir categorías a one-hot encoding
        const y = transacciones.map(t => {
            const idx = this.categorias.indexOf(t.categoria);
            const oneHot = Array(this.categorias.length).fill(0);
            oneHot[idx >= 0 ? idx : this.categorias.indexOf('Otros')] = 1;
            return oneHot;
        });

        return {
            X: tf.tensor2d(X),
            y: tf.tensor2d(y)
        };
    }

    /**
     * Entrenar el modelo
     */
    async entrenar(transacciones, opciones = {}) {
        console.log('🧠 Iniciando entrenamiento del modelo...');
        console.log(`📊 Datos de entrenamiento: ${transacciones.length} transacciones`);

        const {
            epochs = 50,
            batchSize = 32,
            validationSplit = 0.2
        } = opciones;

        // Preparar datos
        const { X, y } = this.prepararDatos(transacciones);

        // Crear modelo si no existe
        if (!this.modelo) {
            this.modelo = this.crearModelo();
        }

        // Entrenar
        const history = await this.modelo.fit(X, y, {
            epochs,
            batchSize,
            validationSplit,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(
                        `Época ${epoch + 1}/${epochs} - ` +
                        `loss: ${logs.loss.toFixed(4)} - ` +
                        `acc: ${logs.acc.toFixed(4)} - ` +
                        `val_loss: ${logs.val_loss.toFixed(4)} - ` +
                        `val_acc: ${logs.val_acc.toFixed(4)}`
                    );
                }
            }
        });

        // Limpiar tensores
        X.dispose();
        y.dispose();

        console.log('✅ Entrenamiento completado');
        this.cargado = true;

        return history;
    }

    /**
     * Predecir categoría para un concepto
     */
    async predecir(concepto) {
        if (!this.modelo || !this.vocabulario) {
            throw new Error('Modelo no cargado. Entrena o carga un modelo primero.');
        }

        // Preparar entrada
        const secuencia = this.textoASecuencia(concepto);
        const input = tf.tensor2d([secuencia]);

        // Predecir
        const prediccion = this.modelo.predict(input);
        const probabilidades = await prediccion.data();

        // Limpiar tensores
        input.dispose();
        prediccion.dispose();

        // Obtener categoría con mayor probabilidad
        const maxIdx = probabilidades.indexOf(Math.max(...probabilidades));
        const categoria = this.categorias[maxIdx];
        const confianza = probabilidades[maxIdx];

        return {
            categoria,
            confianza,
            probabilidades: this.categorias.map((cat, idx) => ({
                categoria: cat,
                probabilidad: probabilidades[idx]
            }))
        };
    }

    /**
     * Predecir en lote (batch)
     */
    async predecirLote(conceptos) {
        if (!this.modelo || !this.vocabulario) {
            throw new Error('Modelo no cargado. Entrena o carga un modelo primero.');
        }

        // Preparar entradas
        const secuencias = conceptos.map(c => this.textoASecuencia(c));
        const input = tf.tensor2d(secuencias);

        // Predecir
        const predicciones = this.modelo.predict(input);
        const probabilidades = await predicciones.array();

        // Limpiar tensores
        input.dispose();
        predicciones.dispose();

        // Procesar resultados
        return probabilidades.map(probs => {
            const maxIdx = probs.indexOf(Math.max(...probs));
            return {
                categoria: this.categorias[maxIdx],
                confianza: probs[maxIdx]
            };
        });
    }

    /**
     * Guardar modelo y vocabulario
     */
    async guardar() {
        if (!this.modelo || !this.vocabulario) {
            throw new Error('No hay modelo para guardar');
        }

        console.log('💾 Guardando modelo...');

        // Guardar modelo de TensorFlow
        await this.modelo.save(`file://${this.modeloPath}`);

        // Guardar vocabulario
        await fs.writeFile(
            this.vocabularioPath,
            JSON.stringify(this.vocabulario, null, 2)
        );

        console.log('✅ Modelo guardado exitosamente');
    }

    /**
     * Cargar modelo y vocabulario guardados
     */
    async cargar() {
        try {
            console.log('📂 Cargando modelo...');

            // Verificar que existan los archivos
            const modeloExiste = await fs.access(path.join(this.modeloPath, 'model.json'))
                .then(() => true)
                .catch(() => false);

            const vocabularioExiste = await fs.access(this.vocabularioPath)
                .then(() => true)
                .catch(() => false);

            if (!modeloExiste || !vocabularioExiste) {
                console.log('⚠️ Modelo no encontrado. Necesita entrenamiento.');
                return false;
            }

            // Cargar modelo
            this.modelo = await tf.loadLayersModel(`file://${this.modeloPath}/model.json`);

            // Cargar vocabulario
            const vocabularioData = await fs.readFile(this.vocabularioPath, 'utf-8');
            this.vocabulario = JSON.parse(vocabularioData);

            this.cargado = true;
            console.log('✅ Modelo cargado exitosamente');
            return true;

        } catch (error) {
            console.error('❌ Error al cargar modelo:', error.message);
            return false;
        }
    }

    /**
     * Verificar si el modelo está listo
     */
    estaListo() {
        return this.cargado && this.modelo !== null && this.vocabulario !== null;
    }

    /**
     * Obtener resumen del modelo
     */
    obtenerResumen() {
        if (!this.modelo) {
            return 'Modelo no inicializado';
        }

        return {
            categorias: this.categorias,
            vocabularioSize: this.vocabulario ? Object.keys(this.vocabulario).length : 0,
            maxLen: this.maxLen,
            cargado: this.cargado,
            arquitectura: this.modelo.layers.map(layer => ({
                nombre: layer.name,
                tipo: layer.getClassName(),
                parametros: layer.countParams()
            }))
        };
    }

    /**
     * Evaluar modelo con datos de prueba
     */
    async evaluar(transacciones) {
        if (!this.modelo || !this.vocabulario) {
            throw new Error('Modelo no cargado');
        }

        const { X, y } = this.prepararDatos(transacciones);
        const resultado = await this.modelo.evaluate(X, y);
        
        const loss = await resultado[0].data();
        const accuracy = await resultado[1].data();

        X.dispose();
        y.dispose();
        resultado[0].dispose();
        resultado[1].dispose();

        return {
            loss: loss[0],
            accuracy: accuracy[0]
        };
    }
}

module.exports = ModeloClasificador;
