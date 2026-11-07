/**
 * Script de prueba del modelo de IA
 * Permite probar el modelo con conceptos personalizados
 */

const ModeloClasificador = require('./ModeloClasificador');
const UtilsModelo = require('./UtilsModelo');

class PruebaModelo {
    constructor() {
        this.modelo = new ModeloClasificador();
    }

    /**
     * Probar modelo con conceptos de ejemplo
     */
    async probarEjemplos() {
        console.log('');
        console.log('================================================');
        console.log('  🧪 PRUEBA DEL MODELO DE CLASIFICACIÓN');
        console.log('================================================');
        console.log('');

        // Cargar modelo
        console.log('📂 Cargando modelo...');
        const cargado = await this.modelo.cargar();

        if (!cargado) {
            console.log('❌ Modelo no encontrado.');
            console.log('   Entrena el modelo primero: node modelo/entrenarModelo.js');
            return;
        }

        console.log('✅ Modelo cargado exitosamente');
        console.log('');

        // Ejemplos de prueba
        const ejemplos = [
            // Alimentación
            'MERCADONA SUPERMERCADO MADRID',
            'CARREFOUR COMPRA SEMANAL',
            'LIDL ALIMENTACION',
            'PANADERIA ARTESANAL',
            
            // Coche
            'REPSOL GASOLINERA',
            'PARKING CENTRO COMERCIAL',
            'TALLER REVISION ITV',
            'PEAJE AUTOPISTA',
            
            // Gastos Recurrentes
            'NETFLIX SUSCRIPCION MENSUAL',
            'IBERDROLA ELECTRICIDAD',
            'ALQUILER PISO ENERO',
            'GIMNASIO CUOTA',
            
            // Ocio
            'RESTAURANTE LA TASCA',
            'CINES YELMO ENTRADAS',
            'ZARA ROPA',
            'BOOKING HOTEL BARCELONA',
            
            // Inversión
            'DEGIRO COMPRA ACCIONES',
            'MYINVESTOR FONDOS',
            'INDEXA CAPITAL',
            
            // Ingresos
            'NOMINA EMPRESA SL',
            'TRANSFERENCIA RECIBIDA',
            'DEVOLUCION HACIENDA',
            
            // Casos ambiguos
            'AMAZON COMPRA',
            'TRANSFERENCIA',
            'PAGO TARJETA'
        ];

        console.log('📊 Probando clasificaciones...');
        console.log('');

        const resultados = [];

        for (const concepto of ejemplos) {
            const prediccion = await this.modelo.predecir(concepto);
            resultados.push({ concepto, ...prediccion });

            // Mostrar resultado
            const emoji = this.obtenerEmojiCategoria(prediccion.categoria);
            const confianzaColor = prediccion.confianza > 0.8 ? '🟢' : 
                                   prediccion.confianza > 0.6 ? '🟡' : '🔴';
            
            console.log(`${emoji} "${concepto}"`);
            console.log(`   → ${prediccion.categoria} ${confianzaColor} ${(prediccion.confianza * 100).toFixed(1)}%`);
            console.log('');
        }

        // Estadísticas
        this.mostrarEstadisticas(resultados);
    }

    /**
     * Obtener emoji para cada categoría
     */
    obtenerEmojiCategoria(categoria) {
        const emojis = {
            'Alimentación': '🛒',
            'Coche': '🚗',
            'Gastos Recurrentes': '🔁',
            'Ocio': '🎉',
            'Inversión': '📈',
            'Ingresos': '💰',
            'Otros': '📦'
        };
        return emojis[categoria] || '📦';
    }

    /**
     * Mostrar estadísticas de las predicciones
     */
    mostrarEstadisticas(resultados) {
        console.log('================================================');
        console.log('  📈 ESTADÍSTICAS');
        console.log('================================================');
        console.log('');

        // Distribución por categoría
        const distribucion = {};
        resultados.forEach(r => {
            distribucion[r.categoria] = (distribucion[r.categoria] || 0) + 1;
        });

        console.log('Distribución de categorías:');
        Object.entries(distribucion)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                const porcentaje = (count / resultados.length * 100).toFixed(1);
                const emoji = this.obtenerEmojiCategoria(cat);
                console.log(`   ${emoji} ${cat}: ${count} (${porcentaje}%)`);
            });

        console.log('');

        // Confianza promedio
        const confianzaPromedio = resultados.reduce((sum, r) => sum + r.confianza, 0) / resultados.length;
        console.log(`Confianza promedio: ${(confianzaPromedio * 100).toFixed(1)}%`);

        // Predicciones con baja confianza
        const bajaConfianza = resultados.filter(r => r.confianza < 0.6);
        if (bajaConfianza.length > 0) {
            console.log('');
            console.log('⚠️ Predicciones con baja confianza (<60%):');
            bajaConfianza.forEach(r => {
                console.log(`   "${r.concepto}" → ${r.categoria} (${(r.confianza * 100).toFixed(1)}%)`);
            });
        }

        console.log('');
    }

    /**
     * Probar con concepto personalizado
     */
    async probarConcepto(concepto) {
        const cargado = await this.modelo.cargar();
        
        if (!cargado) {
            console.log('❌ Modelo no encontrado. Entrena el modelo primero.');
            return;
        }

        console.log('');
        console.log(`🔍 Analizando: "${concepto}"`);
        console.log('');

        const prediccion = await this.modelo.predecir(concepto);

        console.log(`📊 Resultado: ${prediccion.categoria}`);
        console.log(`🎯 Confianza: ${(prediccion.confianza * 100).toFixed(1)}%`);
        console.log('');
        console.log('Probabilidades por categoría:');
        
        prediccion.probabilidades
            .sort((a, b) => b.probabilidad - a.probabilidad)
            .forEach(p => {
                const barra = '█'.repeat(Math.round(p.probabilidad * 20));
                const porcentaje = (p.probabilidad * 100).toFixed(1);
                const emoji = this.obtenerEmojiCategoria(p.categoria);
                console.log(`   ${emoji} ${p.categoria.padEnd(20)} ${barra} ${porcentaje}%`);
            });
        
        console.log('');
    }

    /**
     * Comparar clasificación por reglas vs IA
     */
    async compararMetodos(conceptos) {
        const ClasificadorService = require('../backend/src/services/ClasificadorService');
        const clasificador = new ClasificadorService();

        console.log('');
        console.log('================================================');
        console.log('  🔄 COMPARACIÓN: REGLAS vs IA');
        console.log('================================================');
        console.log('');

        // Cargar modelo
        await this.modelo.cargar();

        for (const concepto of conceptos) {
            const categoriaReglas = clasificador.clasificarConReglas(concepto);
            const prediccionIA = await this.modelo.predecir(concepto);

            console.log(`📝 "${concepto}"`);
            console.log(`   Reglas: ${categoriaReglas}`);
            console.log(`   IA: ${prediccionIA.categoria} (${(prediccionIA.confianza * 100).toFixed(1)}%)`);
            
            if (categoriaReglas !== prediccionIA.categoria) {
                console.log(`   ⚠️ DIFERENCIA DETECTADA`);
            } else {
                console.log(`   ✅ Coinciden`);
            }
            console.log('');
        }
    }

    /**
     * Mostrar resumen del modelo
     */
    async mostrarResumen() {
        const cargado = await this.modelo.cargar();
        
        if (!cargado) {
            console.log('❌ Modelo no encontrado.');
            return;
        }

        console.log('');
        console.log('================================================');
        console.log('  📋 RESUMEN DEL MODELO');
        console.log('================================================');
        console.log('');

        const resumen = this.modelo.obtenerResumen();

        console.log('📌 Información General:');
        console.log(`   Categorías: ${resumen.categorias.length}`);
        console.log(`   Vocabulario: ${resumen.vocabularioSize} palabras`);
        console.log(`   Longitud máxima: ${resumen.maxLen} tokens`);
        console.log(`   Estado: ${resumen.cargado ? '✅ Cargado' : '❌ No cargado'}`);
        console.log('');

        console.log('🏗️ Arquitectura:');
        resumen.arquitectura.forEach(layer => {
            console.log(`   ${layer.nombre} (${layer.tipo})`);
            console.log(`      Parámetros: ${layer.parametros.toLocaleString()}`);
        });
        console.log('');

        const totalParams = resumen.arquitectura.reduce((sum, l) => sum + l.parametros, 0);
        console.log(`📊 Total de parámetros: ${totalParams.toLocaleString()}`);
        console.log('');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const prueba = new PruebaModelo();
    
    // Obtener comando de línea
    const comando = process.argv[2];
    const argumento = process.argv[3];

    (async () => {
        try {
            if (comando === 'concepto' && argumento) {
                await prueba.probarConcepto(argumento);
            } else if (comando === 'resumen') {
                await prueba.mostrarResumen();
            } else if (comando === 'comparar') {
                const ejemplos = [
                    'MERCADONA SUPERMERCADO',
                    'REPSOL GASOLINA',
                    'NETFLIX',
                    'NOMINA EMPRESA'
                ];
                await prueba.compararMetodos(ejemplos);
            } else {
                await prueba.probarEjemplos();
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = PruebaModelo;
