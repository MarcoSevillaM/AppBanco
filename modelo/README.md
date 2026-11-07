# Modelo de IA para Clasificación de Transacciones

Este directorio contiene el modelo de inteligencia artificial para clasificar transacciones bancarias automáticamente.

## 📁 Estructura

```
modelo/
├── ModeloClasificador.js     # Clase principal del modelo de IA
├── entrenarModelo.js          # Script para entrenar el modelo
├── UtilsModelo.js            # Utilidades para preprocesamiento
├── modelo_guardado/           # Modelo entrenado (generado)
│   ├── model.json
│   └── weights.bin
└── vocabulario.json          # Vocabulario del modelo (generado)
```

## 🚀 Uso Rápido

### 1. Instalar Dependencias

```bash
cd backend
npm install
```

### 2. Entrenar el Modelo

```bash
node modelo/entrenarModelo.js
```

Este comando:
- Extrae transacciones de la base de datos
- Genera datos sintéticos si es necesario
- Entrena el modelo de red neuronal
- Guarda el modelo entrenado
- Muestra ejemplos de predicciones

### 3. Usar el Modelo en la Aplicación

El modelo se carga automáticamente al iniciar el servidor. Para activarlo:

```javascript
// En el código del servidor
clasificadorService.establecerModo('ia');
```

## 🧠 Arquitectura del Modelo

El modelo utiliza una red neuronal con las siguientes capas:

1. **Embedding Layer**: Convierte palabras en vectores (dim=128)
2. **Bidirectional LSTM**: Captura contexto (64 unidades)
3. **Dropout**: Previene overfitting (50%)
4. **Dense Layer**: Capa intermedia (32 unidades, ReLU)
5. **Dropout**: Regularización adicional (30%)
6. **Output Layer**: Clasificación en 7 categorías (Softmax)

### Categorías

- Inversión
- Coche
- Alimentación
- Gastos Recurrentes
- Ocio
- Ingresos
- Otros

## 📊 Características

### Preprocesamiento

- Normalización de texto (minúsculas, sin acentos)
- Tokenización inteligente
- Padding/truncado a longitud fija (50 tokens)
- Vocabulario de 5000 palabras más frecuentes

### Clasificación

- **Modo Reglas**: Sistema basado en palabras clave (predeterminado)
- **Modo IA**: Red neuronal entrenada
- **Híbrido**: IA con fallback a reglas si la confianza es baja

### Umbral de Confianza

Por defecto: 60%. Si la predicción del modelo tiene confianza inferior, se usa clasificación por reglas.

## 💻 API del Modelo

### Clasificar un concepto

```javascript
const resultado = await modeloClasificador.predecir('MERCADONA SUPERMERCADO');
console.log(resultado);
// {
//   categoria: 'Alimentación',
//   confianza: 0.95,
//   probabilidades: [...]
// }
```

### Clasificar múltiples conceptos

```javascript
const conceptos = ['REPSOL GASOLINA', 'NETFLIX', 'NOMINA'];
const resultados = await modeloClasificador.predecirLote(conceptos);
```

### Entrenar el modelo

```javascript
const entrenador = new EntrenadorModelo();
await entrenador.entrenar({
    epochs: 50,
    batchSize: 32
});
```

## 🔧 Configuración

### Cambiar Modo de Clasificación

```javascript
// Usar IA
clasificadorService.establecerModo('ia');

// Volver a reglas
clasificadorService.establecerModo('reglas');

// Verificar modo actual
const info = clasificadorService.obtenerModoActual();
```

### Ajustar Umbral de Confianza

```javascript
clasificadorService.umbralConfianza = 0.7; // 70%
```

## 📈 Entrenamiento

### Requisitos Mínimos

- Al menos 50 transacciones por categoría (recomendado)
- Mínimo 2 categorías diferentes
- Conceptos descriptivos

### Proceso de Entrenamiento

1. **Recolección de datos**: Base de datos + datos sintéticos
2. **Validación**: Verifica calidad de datos
3. **División**: 80% entrenamiento, 20% validación
4. **Entrenamiento**: 50 épocas (configurable)
5. **Evaluación**: Métricas de precisión
6. **Guardado**: Modelo y vocabulario

### Monitoreo

Durante el entrenamiento verás:

```
Época 1/50 - loss: 1.2345 - acc: 0.7500 - val_loss: 1.3456 - val_acc: 0.7200
Época 2/50 - loss: 1.1234 - acc: 0.7800 - val_loss: 1.2345 - val_acc: 0.7500
...
```

## 🔍 Utilidades

### Analizar Datos

```javascript
const UtilsModelo = require('./UtilsModelo');

// Generar reporte
const reporte = UtilsModelo.generarReporte(transacciones);

// Validar datos
const validacion = UtilsModelo.validarDatos(transacciones);

// Palabras frecuentes por categoría
const palabras = UtilsModelo.palabrasFrecuentesPorCategoria(transacciones);
```

### Balancear Dataset

```javascript
// Undersample: reduce todas a la categoría más pequeña
const balanceado = UtilsModelo.balancearDatos(transacciones, 'undersample');

// Oversample: aumenta todas a la categoría más grande
const balanceado = UtilsModelo.balancearDatos(transacciones, 'oversample');
```

## ⚠️ Notas Importantes

### Rendimiento

- Primera carga del modelo: ~1-2 segundos
- Predicción individual: <50ms
- Predicción por lote (100 items): ~200ms

### Memoria

- Modelo entrenado: ~10-20 MB
- Memoria en ejecución: ~100-200 MB

### Reentrenamiento

Se recomienda reentrenar el modelo:
- Cada 1000 nuevas transacciones clasificadas
- Cuando se añaden nuevas categorías
- Si la precisión disminuye

```bash
node modelo/entrenarModelo.js
```

## 🐛 Troubleshooting

### "Modelo no encontrado"

El modelo aún no ha sido entrenado. Ejecuta:

```bash
node modelo/entrenarModelo.js
```

### "Pocas transacciones reales"

El sistema usará datos sintéticos automáticamente. Para mejorar:
1. Importa más transacciones reales
2. Clasifica manualmente algunas transacciones
3. Reentrena el modelo

### Error al cargar TensorFlow

Verifica la instalación:

```bash
npm install @tensorflow/tfjs-node
```

En Windows, puede requerir Visual C++ Redistributable.

## 📚 Recursos

- [TensorFlow.js](https://www.tensorflow.org/js)
- [Documentación LSTM](https://www.tensorflow.org/api_docs/python/tf/keras/layers/LSTM)
- [Clasificación de Texto](https://www.tensorflow.org/tutorials/text/text_classification_rnn)

## 🔄 Próximas Mejoras

- [ ] Transfer learning con modelos preentrenados
- [ ] Atención a importes y fechas
- [ ] Detección de anomalías
- [ ] Sugerencias de nuevas categorías
- [ ] API REST para predicciones
- [ ] Dashboard de métricas del modelo
