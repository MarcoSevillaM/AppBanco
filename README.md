# AppBanco v1.5

Sistema de gestión de transacciones bancarias con clasificación automática basada en inteligencia artificial.

## Descripción

AppBanco es una aplicación web para gestionar transacciones bancarias importadas. El sistema clasifica automáticamente cada transacción utilizando:

- Modelo de IA (red neuronal LSTM) para clasificación automática
- Sistema de reglas basado en palabras clave como respaldo

Categorías disponibles:

- Inversión: fondos, acciones, ETFs, brokers  
- Coche: gasolina, parking, peajes, taller  
- Alimentación: supermercados, tiendas de alimentación  
- Gastos recurrentes: alquiler, luz, agua, suscripciones  
- Ocio: restaurantes, viajes, entretenimiento  
- Ingresos: nóminas, transferencias recibidas  
- Otros: transacciones no clasificadas  

## Arquitectura del sistema

```

AppBanco_v.1.5/
├── backend/
│   ├── src/
│   │   ├── core/
│   │   │   └── EcoSis.js
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
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── modelo/
│   ├── ModeloClasificador.js
│   ├── entrenarModelo.js
│   ├── probarModelo.js
│   ├── UtilsModelo.js
│   ├── configurar.js
│   ├── README.md
│   └── .gitignore
├── data/
│   └── banco.db
└── README.md

````

## Modelo de IA

### Arquitectura

- Embedding layer: representación vectorial de palabras (128 dimensiones)  
- Bidirectional LSTM: captura de contexto en ambas direcciones (64 unidades)  
- Dropout: regularización (50% y 30%)  
- Dense layers: clasificación en 7 categorías  

### Ventajas frente a reglas

- Aprende patrones complejos a partir de los datos  
- Se adapta a nuevos conceptos  
- Mayor precisión (en torno al 85% o superior)  
- Tolera variaciones y errores tipográficos  
- Mejora a medida que aumenta el volumen de datos  

## Clase EcoSis

Clase central que coordina el sistema:

```javascript
const ecoSis = new EcoSis();

await ecoSis.crearTransaccion({ fecha, concepto, importe });
ecoSis.obtenerTransacciones(filtros);
ecoSis.actualizarTransaccion(id, datos);
ecoSis.eliminarTransaccion(id);

await ecoSis.importarTransacciones(archivo, 'csv');

await ecoSis.clasificarConcepto('Compra Mercadona');
ecoSis.reclasificarTodas();

ecoSis.obtenerResumenCategorias();
ecoSis.obtenerBalance();
````

## Tecnologías

### Backend

* Node.js
* Express.js
* sql.js (SQLite)
* Multer
* csv-parser
* TensorFlow.js

### Frontend

* HTML5
* CSS3
* JavaScript sin frameworks

### Base de datos

* SQLite

### Modelo

* TensorFlow.js (Node)
* LSTM bidireccional
* Vocabulario aproximado de 5000 palabras

## Instalación

1. Clonar o descargar el proyecto

2. Instalar dependencias:

```bash
cd backend
npm install
```

3. Configurar variables de entorno:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Variables relevantes:

* JWT_SECRET
* JWT_EXPIRATION
* DEFAULT_ADMIN_USERNAME
* DEFAULT_ADMIN_PASSWORD_HASH
* HOST
* PORT

4. Crear carpetas necesarias:

```bash
mkdir data
mkdir backend/uploads
```

5. Entrenamiento opcional del modelo:

```bash
node modelo/entrenarModelo.js
node modelo/configurar.js
```

6. Iniciar servidor:

```bash
npm start
```

7. Acceso:

```
http://localhost:3000
```

## Uso del modelo

### Entrenamiento

```bash
node modelo/entrenarModelo.js
node modelo/probarModelo.js
node modelo/probarModelo.js concepto "MERCADONA SUPERMERCADO"
node modelo/probarModelo.js resumen
node modelo/probarModelo.js comparar
node modelo/configurar.js
```

### Activación

```javascript
clasificadorService.establecerModo('ia');
clasificadorService.umbralConfianza = 0.6;

const estado = clasificadorService.obtenerModoActual();
```

### Modos

* reglas: clasificación basada en palabras clave
* ia: modelo neuronal con fallback a reglas si la confianza es baja

## Rendimiento

* Precisión: superior al 85% en pruebas
* Tiempo de inferencia: inferior a 50 ms
* Consumo de memoria: entre 100 y 200 MB
* Tamaño del modelo: entre 10 y 20 MB

## API REST

### Transacciones

| Método | Endpoint                    | Descripción             |
| ------ | --------------------------- | ----------------------- |
| GET    | /api/transacciones          | Listar transacciones    |
| GET    | /api/transacciones/:id      | Obtener una transacción |
| POST   | /api/transacciones          | Crear transacción       |
| PUT    | /api/transacciones/:id      | Actualizar              |
| DELETE | /api/transacciones/:id      | Eliminar                |
| POST   | /api/transacciones/importar | Importar archivo        |

### Clasificación

| Método | Endpoint          | Descripción         |
| ------ | ----------------- | ------------------- |
| GET    | /api/categorias   | Listar categorías   |
| POST   | /api/clasificar   | Clasificar concepto |
| POST   | /api/reclasificar | Reclasificar todo   |

### Estadísticas

| Método | Endpoint                     | Descripción           |
| ------ | ---------------------------- | --------------------- |
| GET    | /api/estadisticas/categorias | Resumen por categoría |
| GET    | /api/estadisticas/mensual    | Resumen mensual       |
| GET    | /api/estadisticas/balance    | Balance               |

## Formato de importación

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

## Próximas mejoras

### Generales

* Gráficos de estadísticas
* Exportación de datos
* Reglas configurables desde la interfaz
* Soporte para múltiples cuentas
* Autenticación de usuarios
* Modo oscuro

### Modelo

* Transfer learning
* Uso de importe y fecha en la clasificación
* Detección de anomalías
* Sugerencia automática de categorías
* API de predicción
* Panel de métricas
* Reentrenamiento automático

## Documentación adicional

* modelo/README.md

## Licencia

MIT
