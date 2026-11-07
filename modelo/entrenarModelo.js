/**
 * Script de entrenamiento del modelo de IA
 * Entrena el modelo con datos de la base de datos
 */

const path = require('path');
const Database = require('../backend/src/database/Database');
const ModeloClasificador = require('./ModeloClasificador');

class EntrenadorModelo {
    constructor() {
        this.database = new Database();
        this.modelo = new ModeloClasificador();
    }

    /**
     * Obtener transacciones de la base de datos para entrenamiento
     */
    async obtenerDatosEntrenamiento() {
        await this.database.ready();
        
        console.log('📊 Obteniendo transacciones de la base de datos...');
        const transacciones = this.database.obtenerTransacciones();

        // Filtrar transacciones que tengan categoría asignada
        const transaccionesValidas = transacciones.filter(t => 
            t.concepto && 
            t.categoria && 
            t.categoria !== 'Otros'
        );

        console.log(`   Total transacciones: ${transacciones.length}`);
        console.log(`   Transacciones válidas para entrenamiento: ${transaccionesValidas.length}`);

        return transaccionesValidas;
    }

    /**
     * Generar datos sintéticos para complementar el entrenamiento
     * (útil si no hay suficientes datos reales)
     */
    generarDatosSinteticos() {
        console.log('🔧 Generando datos sintéticos...');
        
        const datosSinteticos = [
            // Inversión
            { concepto: 'DEGIRO TRANSFER', categoria: 'Inversión' },
            { concepto: 'MYINVESTOR COMPRA ETF', categoria: 'Inversión' },
            { concepto: 'INDEXA CAPITAL APORTACION', categoria: 'Inversión' },
            { concepto: 'TRADING 212 DEPOSIT', categoria: 'Inversión' },
            { concepto: 'BROKER XTB INVERSION', categoria: 'Inversión' },
            { concepto: 'COMPRA ACCIONES TESLA', categoria: 'Inversión' },
            { concepto: 'FONDOS INDEXADOS VANGUARD', categoria: 'Inversión' },
            { concepto: 'BITCOIN EXCHANGE', categoria: 'Inversión' },
            { concepto: 'DIVIDENDOS COCA COLA', categoria: 'Inversión' },
            { concepto: 'REINVERSION AUTOMATICA', categoria: 'Inversión' },

            // Coche
            { concepto: 'REPSOL GASOLINERA MADRID', categoria: 'Coche' },
            { concepto: 'CEPSA COMBUSTIBLE', categoria: 'Coche' },
            { concepto: 'BP DIESEL', categoria: 'Coche' },
            { concepto: 'SHELL GASOLINA 95', categoria: 'Coche' },
            { concepto: 'PARKING CENTRO COMERCIAL', categoria: 'Coche' },
            { concepto: 'APARCAMIENTO AEROPUERTO', categoria: 'Coche' },
            { concepto: 'PEAJE AUTOPISTA AP7', categoria: 'Coche' },
            { concepto: 'TALLER MECANICO REVISION', categoria: 'Coche' },
            { concepto: 'ITV VEHICULO', categoria: 'Coche' },
            { concepto: 'SEGURO COCHE MAPFRE', categoria: 'Coche' },

            // Alimentación
            { concepto: 'MERCADONA SUPERMERCADO', categoria: 'Alimentación' },
            { concepto: 'CARREFOUR COMPRA', categoria: 'Alimentación' },
            { concepto: 'LIDL ALIMENTACION', categoria: 'Alimentación' },
            { concepto: 'ALDI SUPERMERCADO', categoria: 'Alimentación' },
            { concepto: 'DIA MARKET', categoria: 'Alimentación' },
            { concepto: 'HIPERCOR COMPRA SEMANAL', categoria: 'Alimentación' },
            { concepto: 'EROSKI SUPERMERCADO', categoria: 'Alimentación' },
            { concepto: 'ALCAMPO HIPERMERCADO', categoria: 'Alimentación' },
            { concepto: 'CONSUM COMPRA', categoria: 'Alimentación' },
            { concepto: 'FRUTERIA MANOLO', categoria: 'Alimentación' },
            { concepto: 'CARNICERIA CENTRAL', categoria: 'Alimentación' },
            { concepto: 'PANADERIA ARTESANAL', categoria: 'Alimentación' },

            // Gastos Recurrentes
            { concepto: 'ALQUILER VIVIENDA ENERO', categoria: 'Gastos Recurrentes' },
            { concepto: 'HIPOTECA BANCO SANTANDER', categoria: 'Gastos Recurrentes' },
            { concepto: 'IBERDROLA LUZ', categoria: 'Gastos Recurrentes' },
            { concepto: 'ENDESA ELECTRICIDAD', categoria: 'Gastos Recurrentes' },
            { concepto: 'NATURGY GAS NATURAL', categoria: 'Gastos Recurrentes' },
            { concepto: 'CANAL ISABEL II AGUA', categoria: 'Gastos Recurrentes' },
            { concepto: 'MOVISTAR FIBRA INTERNET', categoria: 'Gastos Recurrentes' },
            { concepto: 'VODAFONE MOVIL', categoria: 'Gastos Recurrentes' },
            { concepto: 'ORANGE TELEFONIA', categoria: 'Gastos Recurrentes' },
            { concepto: 'NETFLIX SUSCRIPCION', categoria: 'Gastos Recurrentes' },
            { concepto: 'SPOTIFY PREMIUM', categoria: 'Gastos Recurrentes' },
            { concepto: 'HBO MAX STREAMING', categoria: 'Gastos Recurrentes' },
            { concepto: 'AMAZON PRIME', categoria: 'Gastos Recurrentes' },
            { concepto: 'GIMNASIO MENSUALIDAD', categoria: 'Gastos Recurrentes' },
            { concepto: 'SEGURO HOGAR MAPFRE', categoria: 'Gastos Recurrentes' },
            { concepto: 'COMUNIDAD PROPIETARIOS', categoria: 'Gastos Recurrentes' },

            // Ocio
            { concepto: 'RESTAURANTE LA TASCA', categoria: 'Ocio' },
            { concepto: 'BAR CERVECERIA', categoria: 'Ocio' },
            { concepto: 'STARBUCKS COFFEE', categoria: 'Ocio' },
            { concepto: 'MCDONALDS COMIDA', categoria: 'Ocio' },
            { concepto: 'CINES YELMO', categoria: 'Ocio' },
            { concepto: 'TEATRO ENTRADAS', categoria: 'Ocio' },
            { concepto: 'CONCIERTO WIZINK CENTER', categoria: 'Ocio' },
            { concepto: 'BOOKING HOTEL', categoria: 'Ocio' },
            { concepto: 'AIRBNB ALOJAMIENTO', categoria: 'Ocio' },
            { concepto: 'RYANAIR VUELO', categoria: 'Ocio' },
            { concepto: 'RENFE AVE MADRID', categoria: 'Ocio' },
            { concepto: 'ZARA ROPA', categoria: 'Ocio' },
            { concepto: 'MANGO COMPRA', categoria: 'Ocio' },
            { concepto: 'AMAZON PEDIDO', categoria: 'Ocio' },
            { concepto: 'FNAC LIBROS', categoria: 'Ocio' },
            { concepto: 'STEAM JUEGOS', categoria: 'Ocio' },
            { concepto: 'PLAYSTATION STORE', categoria: 'Ocio' },

            // Ingresos
            { concepto: 'NOMINA EMPRESA SL', categoria: 'Ingresos' },
            { concepto: 'SALARIO MENSUAL', categoria: 'Ingresos' },
            { concepto: 'TRANSFERENCIA RECIBIDA', categoria: 'Ingresos' },
            { concepto: 'DEVOLUCION HACIENDA', categoria: 'Ingresos' },
            { concepto: 'REEMBOLSO COMPRA', categoria: 'Ingresos' },
            { concepto: 'DIVIDENDOS ACCIONES', categoria: 'Ingresos' },
            { concepto: 'INTERESES CUENTA', categoria: 'Ingresos' },
            { concepto: 'FREELANCE TRABAJO', categoria: 'Ingresos' },
            { concepto: 'VENTA ARTICULO', categoria: 'Ingresos' },
            { concepto: 'INGRESO ALQUILER', categoria: 'Ingresos' }
        ];

        console.log(`   Datos sintéticos generados: ${datosSinteticos.length}`);
        return datosSinteticos;
    }

    /**
     * Dividir datos en entrenamiento y prueba
     */
    dividirDatos(datos, porcentajeTest = 0.2) {
        // Mezclar datos aleatoriamente
        const datosMezclados = [...datos].sort(() => Math.random() - 0.5);
        
        const numTest = Math.floor(datos.length * porcentajeTest);
        const numTrain = datos.length - numTest;

        return {
            entrenamiento: datosMezclados.slice(0, numTrain),
            prueba: datosMezclados.slice(numTrain)
        };
    }

    /**
     * Entrenar el modelo
     */
    async entrenar(opciones = {}) {
        try {
            console.log('');
            console.log('================================================');
            console.log('  🧠 ENTRENAMIENTO DEL MODELO DE IA');
            console.log('================================================');
            console.log('');

            // Obtener datos
            let transacciones = await this.obtenerDatosEntrenamiento();

            // Si hay pocas transacciones, agregar datos sintéticos
            if (transacciones.length < 100) {
                console.log('⚠️ Pocas transacciones reales. Agregando datos sintéticos...');
                const sinteticos = this.generarDatosSinteticos();
                transacciones = [...transacciones, ...sinteticos];
            }

            // Dividir en entrenamiento y prueba
            const { entrenamiento, prueba } = this.dividirDatos(transacciones);
            
            console.log('');
            console.log('📈 Distribución de datos:');
            console.log(`   Entrenamiento: ${entrenamiento.length}`);
            console.log(`   Prueba: ${prueba.length}`);
            console.log('');

            // Entrenar modelo
            await this.modelo.entrenar(entrenamiento, {
                epochs: opciones.epochs || 50,
                batchSize: opciones.batchSize || 32,
                validationSplit: 0.2
            });

            // Evaluar con datos de prueba
            console.log('');
            console.log('🧪 Evaluando modelo con datos de prueba...');
            const evaluacion = await this.modelo.evaluar(prueba);
            
            console.log(`   Loss: ${evaluacion.loss.toFixed(4)}`);
            console.log(`   Accuracy: ${(evaluacion.accuracy * 100).toFixed(2)}%`);

            // Guardar modelo
            await this.modelo.guardar();

            console.log('');
            console.log('================================================');
            console.log('  ✅ ENTRENAMIENTO COMPLETADO');
            console.log('================================================');
            console.log('');

            return {
                transaccionesTotales: transacciones.length,
                entrenamiento: entrenamiento.length,
                prueba: prueba.length,
                evaluacion
            };

        } catch (error) {
            console.error('❌ Error durante el entrenamiento:', error);
            throw error;
        }
    }

    /**
     * Probar predicciones con ejemplos
     */
    async probarPredicciones() {
        console.log('');
        console.log('🧪 Probando predicciones...');
        console.log('');

        const ejemplos = [
            'MERCADONA SUPERMERCADO',
            'REPSOL GASOLINA',
            'NOMINA EMPRESA',
            'NETFLIX SUSCRIPCION',
            'RESTAURANTE ITALIANO',
            'MYINVESTOR FONDOS',
            'PARKING CENTRO'
        ];

        for (const concepto of ejemplos) {
            const resultado = await this.modelo.predecir(concepto);
            console.log(`   "${concepto}"`);
            console.log(`   → ${resultado.categoria} (${(resultado.confianza * 100).toFixed(1)}%)`);
            console.log('');
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    (async () => {
        const entrenador = new EntrenadorModelo();
        
        try {
            // Entrenar modelo
            await entrenador.entrenar({
                epochs: 50,
                batchSize: 32
            });

            // Probar predicciones
            await entrenador.probarPredicciones();

        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}

module.exports = EntrenadorModelo;
