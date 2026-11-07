# 📦 Instalación de Dependencias - Modelo de IA

## Instalación Completa

```bash
cd backend
npm install
```

Esto instalará todas las dependencias incluyendo **TensorFlow.js Node**.

## Dependencias Nuevas

### @tensorflow/tfjs-node (v4.17.0)
Framework de Machine Learning para Node.js

**Tamaño**: ~100 MB (incluye binarios nativos)

### Requisitos del Sistema

#### Windows
- Node.js 16+ (recomendado 18+)
- Visual C++ Redistributable 2015-2022
  - Descargar: https://aka.ms/vs/17/release/vc_redist.x64.exe

#### Linux
- Node.js 16+
- Paquetes de desarrollo: `build-essential`, `python3`

```bash
sudo apt-get install build-essential python3
```

#### macOS
- Node.js 16+
- Xcode Command Line Tools

```bash
xcode-select --install
```

## Verificación de Instalación

```bash
node -e "const tf = require('@tensorflow/tfjs-node'); console.log('TensorFlow.js version:', tf.version.tfjs);"
```

Si ves la versión, ¡todo está correcto! ✅

## Solución de Problemas

### Error: "Cannot find module '@tensorflow/tfjs-node'"

**Solución 1**: Reinstalar
```bash
npm uninstall @tensorflow/tfjs-node
npm install @tensorflow/tfjs-node
```

**Solución 2**: Limpiar cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Error: "node-gyp rebuild failed"

**Windows**: Instala Visual C++ Redistributable (ver requisitos arriba)

**Linux**: Instala herramientas de desarrollo
```bash
sudo apt-get install build-essential python3
```

**macOS**: Instala Xcode Command Line Tools
```bash
xcode-select --install
```

### Error: "GLIBCXX_3.4.XX not found" (Linux)

Actualiza libstdc++:
```bash
sudo apt-get update
sudo apt-get install libstdc++6
```

### Instalación muy lenta

Es normal. TensorFlow.js incluye binarios nativos compilados (~100 MB).
La primera instalación puede tomar 5-10 minutos dependiendo de tu conexión.

## Alternativa: TensorFlow.js CPU-only

Si tienes problemas con la instalación de `@tensorflow/tfjs-node`, puedes usar la versión CPU:

```bash
npm uninstall @tensorflow/tfjs-node
npm install @tensorflow/tfjs
```

⚠️ **Nota**: La versión CPU pura (`@tensorflow/tfjs`) es más lenta pero no requiere compilación nativa.

Luego modifica `modelo/ModeloClasificador.js`:
```javascript
// Cambiar
const tf = require('@tensorflow/tfjs-node');

// Por
const tf = require('@tensorflow/tfjs');
```

## Verificar Todas las Dependencias

```bash
npm list
```

Deberías ver:
```
appbanco-backend@1.5.0
├── @tensorflow/tfjs-node@4.17.0
├── cors@2.8.5
├── csv-parser@3.0.0
├── express@4.18.2
├── multer@1.4.5-lts.1
└── sql.js@1.10.3
```

## Tamaño Total

- **node_modules**: ~150-200 MB
- **Modelo entrenado**: ~10-20 MB
- **Base de datos**: Variable según datos

Total aproximado: **200-250 MB**

## Optimización de Espacio

Si el espacio es limitado:

1. **No commitear node_modules** (ya está en .gitignore)
2. **No commitear modelo entrenado** (se puede regenerar)
3. **Usar .gitignore** para archivos temporales

```bash
# En .gitignore
node_modules/
modelo/modelo_guardado/
modelo/vocabulario.json
*.log
```

## Próximos Pasos

Una vez instaladas las dependencias:

1. ✅ Verifica la instalación
2. ✅ Entrena el modelo: `node modelo/entrenarModelo.js`
3. ✅ Prueba el modelo: `node modelo/probarModelo.js`
4. ✅ Inicia el servidor: `npm start`

---

💡 **Tip**: Si encuentras problemas, revisa los logs completos:
```bash
npm install --verbose
```
