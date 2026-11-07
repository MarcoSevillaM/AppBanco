/**
 * Configuración del modelo de IA
 * Script interactivo para gestionar el modelo
 */

const readline = require('readline');
const ModeloClasificador = require('./ModeloClasificador');
const EntrenadorModelo = require('./entrenarModelo');
const PruebaModelo = require('./probarModelo');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(texto) {
    return new Promise(resolve => {
        rl.question(texto, resolve);
    });
}

async function menuPrincipal() {
    console.clear();
    console.log('');
    console.log('================================================');
    console.log('  🤖 CONFIGURACIÓN DEL MODELO DE IA');
    console.log('  AppBanco v1.5');
    console.log('================================================');
    console.log('');
    console.log('Opciones disponibles:');
    console.log('');
    console.log('  1. Entrenar nuevo modelo');
    console.log('  2. Probar modelo existente');
    console.log('  3. Ver resumen del modelo');
    console.log('  4. Probar concepto personalizado');
    console.log('  5. Comparar reglas vs IA');
    console.log('  6. Configurar clasificador en servidor');
    console.log('  0. Salir');
    console.log('');

    const opcion = await pregunta('Selecciona una opción: ');

    switch (opcion.trim()) {
        case '1':
            await opcionEntrenar();
            break;
        case '2':
            await opcionProbar();
            break;
        case '3':
            await opcionResumen();
            break;
        case '4':
            await opcionConceptoPersonalizado();
            break;
        case '5':
            await opcionComparar();
            break;
        case '6':
            await opcionConfigurar();
            break;
        case '0':
            console.log('\n👋 ¡Hasta luego!\n');
            rl.close();
            return;
        default:
            console.log('\n❌ Opción no válida\n');
            await pregunta('Presiona Enter para continuar...');
            await menuPrincipal();
    }
}

async function opcionEntrenar() {
    console.clear();
    console.log('\n🧠 ENTRENAR MODELO\n');
    
    const epochs = await pregunta('Número de épocas (default: 50): ');
    const batchSize = await pregunta('Tamaño del batch (default: 32): ');
    
    console.log('\n⏳ Iniciando entrenamiento...\n');
    
    try {
        const entrenador = new EntrenadorModelo();
        await entrenador.entrenar({
            epochs: parseInt(epochs) || 50,
            batchSize: parseInt(batchSize) || 32
        });
        
        console.log('\n✅ Entrenamiento completado\n');
    } catch (error) {
        console.error('\n❌ Error:', error.message, '\n');
    }
    
    await pregunta('Presiona Enter para continuar...');
    await menuPrincipal();
}

async function opcionProbar() {
    console.clear();
    const prueba = new PruebaModelo();
    await prueba.probarEjemplos();
    
    await pregunta('Presiona Enter para continuar...');
    await menuPrincipal();
}

async function opcionResumen() {
    console.clear();
    const prueba = new PruebaModelo();
    await prueba.mostrarResumen();
    
    await pregunta('Presiona Enter para continuar...');
    await menuPrincipal();
}

async function opcionConceptoPersonalizado() {
    console.clear();
    console.log('\n🔍 PROBAR CONCEPTO PERSONALIZADO\n');
    
    const concepto = await pregunta('Ingresa el concepto a clasificar: ');
    
    if (concepto.trim()) {
        const prueba = new PruebaModelo();
        await prueba.probarConcepto(concepto);
    } else {
        console.log('\n❌ Concepto vacío\n');
    }
    
    await pregunta('Presiona Enter para continuar...');
    await menuPrincipal();
}

async function opcionComparar() {
    console.clear();
    console.log('\n🔄 COMPARAR MÉTODOS\n');
    console.log('Ingresa conceptos a comparar (uno por línea, línea vacía para terminar):\n');
    
    const conceptos = [];
    while (true) {
        const concepto = await pregunta(`Concepto ${conceptos.length + 1}: `);
        if (!concepto.trim()) break;
        conceptos.push(concepto);
    }
    
    if (conceptos.length > 0) {
        const prueba = new PruebaModelo();
        await prueba.compararMetodos(conceptos);
    } else {
        console.log('\n❌ No se ingresaron conceptos\n');
    }
    
    await pregunta('Presiona Enter para continuar...');
    await menuPrincipal();
}

async function opcionConfigurar() {
    console.clear();
    console.log('\n⚙️ CONFIGURACIÓN DEL CLASIFICADOR\n');
    console.log('Para activar el modelo de IA en el servidor:\n');
    console.log('1. Asegúrate de que el modelo esté entrenado');
    console.log('2. En el archivo donde usas ClasificadorService, llama:\n');
    console.log('   clasificadorService.establecerModo("ia");\n');
    console.log('3. Para volver a reglas:\n');
    console.log('   clasificadorService.establecerModo("reglas");\n');
    console.log('4. Configurar umbral de confianza:\n');
    console.log('   clasificadorService.umbralConfianza = 0.7; // 70%\n');
    
    const verEstado = await pregunta('¿Verificar estado actual? (s/n): ');
    
    if (verEstado.toLowerCase() === 's') {
        console.log('\n📊 Estado actual:\n');
        const ClasificadorService = require('../src/services/ClasificadorService');
        const clasificador = new ClasificadorService();
        
        // Esperar a que se inicialice
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const estado = clasificador.obtenerModoActual();
        console.log(`   Modo: ${estado.modo}`);
        console.log(`   Modelo IA disponible: ${estado.modeloIADisponible ? '✅' : '❌'}`);
        console.log(`   Umbral de confianza: ${(estado.umbralConfianza * 100).toFixed(0)}%`);
        console.log('');
    }
    
    await pregunta('Presiona Enter para continuar...');
    await menuPrincipal();
}

// Iniciar menú
(async () => {
    try {
        await menuPrincipal();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
})();
