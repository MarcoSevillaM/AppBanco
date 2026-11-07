# 🚀 Inicio Rápido - Modelo de IA

## Primeros Pasos

### 1️⃣ Instalar dependencias
```bash
cd backend
npm install
```

### 2️⃣ Entrenar el modelo
```bash
node modelo/entrenarModelo.js
```

Esto tomará unos minutos. Verás el progreso del entrenamiento:
```
Época 1/50 - loss: 1.2345 - acc: 0.7500 - val_loss: 1.3456 - val_acc: 0.7200
Época 2/50 - loss: 1.1234 - acc: 0.7800 - val_loss: 1.2345 - val_acc: 0.7500
...
✅ Entrenamiento completado
```

### 3️⃣ Probar el modelo
```bash
node modelo/probarModelo.js
```

### 4️⃣ Activar en el servidor

Edita `backend/src/core/EcoSis.js` o usa la API para cambiar el modo:

```javascript
// Después de inicializar EcoSis
await ecoSis.clasificador.inicializarModeloIA();
ecoSis.clasificador.establecerModo('ia');
```

## Comandos Útiles

### Configuración Interactiva
```bash
node modelo/configurar.js
```

### Probar un concepto específico
```bash
node modelo/probarModelo.js concepto "MERCADONA SUPERMERCADO"
```

### Ver resumen del modelo
```bash
node modelo/probarModelo.js resumen
```

### Comparar métodos
```bash
node modelo/probarModelo.js comparar
```

## Solución de Problemas

### ❌ "Modelo no encontrado"
**Solución**: El modelo aún no está entrenado
```bash
node modelo/entrenarModelo.js
```

### ❌ "Error al cargar TensorFlow"
**Solución**: Reinstala la dependencia
```bash
npm install @tensorflow/tfjs-node
```

En Windows puede requerir Visual C++ Redistributable.

### ⚠️ "Pocas transacciones reales"
**Solución**: El sistema usará datos sintéticos automáticamente. 
Para mejorar la precisión:
1. Importa más transacciones reales
2. Clasifica manualmente algunas transacciones
3. Reentrena el modelo

## Configuración Avanzada

### Cambiar número de épocas
```javascript
// En entrenarModelo.js o al llamar directamente
await entrenador.entrenar({
    epochs: 100,  // Más épocas = más entrenamiento
    batchSize: 32
});
```

### Ajustar umbral de confianza
```javascript
// En ClasificadorService
clasificadorService.umbralConfianza = 0.7; // 70%
```

Si el modelo tiene <70% de confianza, usará reglas como fallback.

### Balancear datos
```javascript
// En entrenarModelo.js, antes del entrenamiento
const UtilsModelo = require('./UtilsModelo');
transacciones = UtilsModelo.balancearDatos(transacciones, 'undersample');
```

## Flujo de Trabajo Recomendado

1. ✅ Importa transacciones reales a la aplicación
2. ✅ Clasifica manualmente algunas si es necesario
3. ✅ Entrena el modelo: `node modelo/entrenarModelo.js`
4. ✅ Prueba el modelo: `node modelo/probarModelo.js`
5. ✅ Si la precisión es buena (>80%), activa el modo IA
6. ✅ Monitorea resultados y reentrena periódicamente

## Métricas de Éxito

- **Accuracy >85%**: ✅ Modelo listo para producción
- **Accuracy 70-85%**: ⚠️ Funcional pero puede mejorar
- **Accuracy <70%**: ❌ Necesita más datos o ajustes

## Reentrenamiento

Se recomienda reentrenar cuando:
- Tienes +1000 nuevas transacciones clasificadas
- Añades nuevas categorías
- La precisión disminuye notablemente

```bash
node modelo/entrenarModelo.js
```

El modelo anterior se sobrescribirá automáticamente.

## Recursos

- [Documentación completa](README.md)
- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Guía de LSTM](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)

---

💡 **Consejo**: Usa el configurador interactivo para una experiencia más guiada:
```bash
node modelo/configurar.js
```
