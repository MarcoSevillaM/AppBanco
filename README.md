# 🏦 AppBanco v1.5

Sistema de Gestión de Transacciones Bancarias con clasificación automática por categorías.

## 📋 Descripción

AppBanco es una aplicación web completa para gestionar transacciones bancarias importadas. El sistema clasifica automáticamente cada transacción en una de las siguientes categorías basándose en el concepto:

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
│   │   │   ├── ClasificadorService.js
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
├── data/                       # Base de datos SQLite
│   └── banco.db
└── README.md
```

## 🎯 Clase EcoSis

`EcoSis` es la clase central que orquesta todo el sistema:

```javascript
const ecoSis = new EcoSis();

// Gestión de transacciones
ecoSis.crearTransaccion({ fecha, concepto, importe });
ecoSis.obtenerTransacciones(filtros);
ecoSis.actualizarTransaccion(id, datos);
ecoSis.eliminarTransaccion(id);

// Importación
await ecoSis.importarTransacciones(archivo, 'csv');

// Clasificación
ecoSis.clasificarConcepto('Compra Mercadona'); // -> 'Alimentación'
ecoSis.reclasificarTodas();

// Estadísticas
ecoSis.obtenerResumenCategorias();
ecoSis.obtenerBalance();
```

## 🛠️ Tecnologías

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **better-sqlite3** - Base de datos SQLite
- **Multer** - Gestión de archivos
- **csv-parser** - Parseo de CSV

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos (Variables CSS, Flexbox, Grid)
- **JavaScript Vanilla** - Sin frameworks

### Base de Datos
- **SQLite** - Base de datos embebida, ligera y portable

## 🚀 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias del backend**
```bash
cd backend
npm install
```

3. **Crear carpetas necesarias**
```bash
mkdir data
mkdir backend/uploads
```

4. **Iniciar el servidor**
```bash
npm start
```

5. **Abrir en el navegador**
```
http://localhost:3000
```

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

- [ ] Gráficos de estadísticas con Chart.js
- [ ] Exportación de datos
- [ ] Reglas de clasificación personalizables desde UI
- [ ] Múltiples cuentas bancarias
- [ ] Autenticación de usuarios
- [ ] Modo oscuro

## 📄 Licencia

MIT License - Uso libre

---

Desarrollado con ❤️ para la gestión de finanzas personales
