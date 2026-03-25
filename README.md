# 🏦 AppBanco v1.5

Sistema de Gestión de Transacciones Bancarias con **clasificación automática inteligente** mediante IA.

## 📋 Descripción

AppBanco es una aplicación web completa para gestionar transacciones bancarias importadas. El sistema clasifica automáticamente cada transacción utilizando:

- 🤖 **Modelo de IA (Neural Network)** - Red neuronal LSTM para clasificación inteligente (Por defecto, **pendiente de mejora**)
- 📋 **Sistema de Reglas** - Palabras clave tradicional como fallback

Categorías disponibles:

- 💹 **Inversión** - Fondos, acciones, ETFs, brokers
- 🚗 **Coche** - Gasolina, parking, peajes, taller
- 🛒 **Alimentación** - Supermercados, tiendas de alimentación
- 🏠 **Gastos Recurrentes** - Alquiler, luz, agua, suscripciones
- 🎮 **Ocio** - Restaurantes, viajes, entretenimiento
- 💰 **Ingresos** - Nóminas, transferencias recibidas
- 📦 **Otros** - Transacciones no clasificadas

## 🏗️ Arquitectura del Sistema

```
AppBanco_v.1.5/
├── backend/                    # Servidor Node.js + Express
│   ├── src/
│   │   ├── core/
│   │   │   └── EcoSis.js      # 🎯 Clase principal - Orquestador del sistema
│   │   ├── controllers/
│   │   │   └── TransaccionController.js
│   │   ├── models/
│   │   │   └── Transaccion.js
│   │   ├── services/
│   │   │   ├── ClasificadorService.js  # 🧠 Clasificador con IA
│   │   │   └── ImportadorService.js
│   │   ├── database/
│   │   │   └── Database.js
│   │   └── routes/
│   │       └── api.js
│   ├── server.js
│   └── package.json
├── frontend/                   # Interfaz web HTML/CSS/JS
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── modelo/                     # 🤖 Modelo de IA (NUEVO)
│   ├── ModeloClasificador.js  # Red neuronal TensorFlow.js
│   ├── entrenarModelo.js      # Script de entrenamiento
│   ├── probarModelo.js        # Testing y evaluación
│   ├── UtilsModelo.js         # Utilidades de preprocesamiento
│   ├── configurar.js          # Configuración interactiva
│   ├── README.md              # Documentación del modelo
│   └── .gitignore
├── data/                       # Base de datos SQLite
│   └── banco.db
└── README.md
```

## 🤖 Modelo de IA - Características

### Arquitectura del Modelo
- **Embedding Layer**: Convierte palabras en vectores densos (128 dimensiones)
- **Bidirectional LSTM**: Captura contexto en ambas direcciones (64 unidades)
- **Dropout Layers**: Previene overfitting (50% y 30%)
- **Dense Layers**: Clasificación final (7 categorías)

### Ventajas sobre Reglas
- ✅ Aprende patrones complejos de los datos
- ✅ Se adapta a nuevos conceptos
- ✅ Mayor precisión (>85% accuracy)
- ✅ Maneja variaciones y errores tipográficos
- ✅ Mejora con más datos

## 🎯 Clase EcoSis

`EcoSis` es la clase central que orquesta todo el sistema:

```javascript
const ecoSis = new EcoSis();

// Gestión de transacciones (ahora con IA)
await ecoSis.crearTransaccion({ fecha, concepto, importe });
ecoSis.obtenerTransacciones(filtros);
ecoSis.actualizarTransaccion(id, datos);
ecoSis.eliminarTransaccion(id);

// Importación
await ecoSis.importarTransacciones(archivo, 'csv');

// Clasificación (IA o Reglas)
await ecoSis.clasificarConcepto('Compra Mercadona'); // -> 'Alimentación'
ecoSis.reclasificarTodas();

// Estadísticas
ecoSis.obtenerResumenCategorias();
ecoSis.obtenerBalance();
```

## 🛠️ Tecnologías

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **sql.js** - Base de datos SQLite
- **Multer** - Gestión de archivos
- **csv-parser** - Parseo de CSV
- **TensorFlow.js** - 🤖 Machine Learning (NUEVO)

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos (Variables CSS, Flexbox, Grid)
- **JavaScript Vanilla** - Sin frameworks

### Base de Datos
- **SQLite** - Base de datos embebida, ligera y portable

### Modelo de IA
- **TensorFlow.js Node** - Framework de ML
- **LSTM** - Red neuronal recurrente bidireccional
- **Vocabulario de 5000 palabras** - Preprocesamiento de texto

## 🚀 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias del backend**
```bash
cd backend
npm install
```

3. **Configurar variables de entorno**
```bash
# Desde la carpeta backend
cp .env.example .env
```

En Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Variables clave en `.env`:

- `JWT_SECRET`: clave para firmar tokens.
- `JWT_EXPIRATION`: duración del token (ejemplo: `8h`).
- `DEFAULT_ADMIN_USERNAME`: usuario admin inicial.
- `DEFAULT_ADMIN_PASSWORD_HASH`: hash bcrypt del admin inicial.
- `HOST` y `PORT`: host y puerto del servidor.

4. **Crear carpetas necesarias**
```bash
mkdir data
mkdir backend/uploads
```

5. **🤖 (Opcional) Entrenar el modelo de IA**
```bash
# Entrenar modelo con datos existentes
node modelo/entrenarModelo.js

# O usar el configurador interactivo
node modelo/configurar.js
```

6. **Iniciar el servidor**
```bash
npm start
```

7. **Abrir en el navegador**
```
http://localhost:3000
```

## 🧠 Uso del Modelo de IA

### Entrenamiento

```bash
# Entrenar modelo con configuración por defecto
node modelo/entrenarModelo.js

# Probar el modelo
node modelo/probarModelo.js

# Probar un concepto específico
node modelo/probarModelo.js concepto "MERCADONA SUPERMERCADO"

# Ver resumen del modelo
node modelo/probarModelo.js resumen

# Comparar reglas vs IA
node modelo/probarModelo.js comparar

# Configuración interactiva
node modelo/configurar.js
```

### Activar IA en el Servidor

El modelo se carga automáticamente al iniciar el servidor. Para activarlo:

```javascript
// En el código o vía API
clasificadorService.establecerModo('ia');

// Configurar umbral de confianza
clasificadorService.umbralConfianza = 0.6; // 60%

// Ver estado actual
const estado = clasificadorService.obtenerModoActual();
```

### Modos de Clasificación

- **`reglas`**: Sistema tradicional basado en palabras clave (por defecto)
- **`ia`**: Red neuronal con fallback a reglas si confianza < umbral

## 📊 Rendimiento del Modelo

Con datos de entrenamiento típicos:
- **Accuracy**: >85% en datos de prueba
- **Velocidad**: <50ms por predicción
- **Memoria**: ~100-200 MB en ejecución
- **Tamaño del modelo**: ~10-20 MB

## 📡 API REST

### Transacciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/transacciones` | Listar transacciones |
| GET | `/api/transacciones/:id` | Obtener una transacción |
| POST | `/api/transacciones` | Crear transacción |
| PUT | `/api/transacciones/:id` | Actualizar transacción |
| DELETE | `/api/transacciones/:id` | Eliminar transacción |
| POST | `/api/transacciones/importar` | Importar desde archivo |

### Clasificación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/categorias` | Listar categorías |
| POST | `/api/clasificar` | Clasificar un concepto |
| POST | `/api/reclasificar` | Reclasificar todas |

### Estadísticas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/estadisticas/categorias` | Resumen por categoría |
| GET | `/api/estadisticas/mensual` | Resumen mensual |
| GET | `/api/estadisticas/balance` | Balance general |

## 📥 Formato de Importación

### CSV
```csv
Fecha;Concepto;Importe
2024-01-15;Compra Mercadona;-45.50
2024-01-16;Nómina Enero;1500.00
```

### JSON
```json
{
  "transacciones": [
    {
      "fecha": "2024-01-15",
      "concepto": "Compra Mercadona",
      "importe": -45.50
    }
  ]
}
```

## 🔮 Próximas Mejoras

### Funcionalidades Generales
- [ ] Gráficos de estadísticas con Chart.js
- [ ] Exportación de datos
- [ ] Reglas de clasificación personalizables desde UI
- [ ] Múltiples cuentas bancarias
- [ ] Autenticación de usuarios
- [ ] Modo oscuro

### Modelo de IA
- [ ] Transfer learning con modelos preentrenados
- [ ] Atención a importes y fechas en la clasificación
- [ ] Detección de anomalías (gastos inusuales)
- [ ] Sugerencias de nuevas categorías automáticas
- [ ] API REST para predicciones
- [ ] Dashboard de métricas del modelo
- [ ] Auto-reentrenamiento periódico

## 📚 Documentación Adicional

- **[Modelo de IA](modelo/README.md)** - Documentación completa del modelo
- **API REST** - Documentación de endpoints (ver sección API abajo)

## 📄 Licencia

MIT License - Uso libre

---

Desarrollado con ❤️ y 🤖 para la gestión de finanzas personales
