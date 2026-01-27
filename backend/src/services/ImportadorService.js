/**
 * ImportadorService - Servicio de importación de transacciones
 * Soporta importación desde archivos CSV y otros formatos
 * Compatible con formato Santander original y formato procesado
 */

const fs = require('fs');
const path = require('path');

class ImportadorService {
    constructor(ecoSis) {
        this.ecoSis = ecoSis;
        
        // Configuración de mapeo de columnas para diferentes formatos
        this.mapeosBancos = {
            // Formato procesado (ya limpio con comas)
            'procesado': {
                fecha: ['fecha operación', 'fecha operacion', 'fecha'],
                concepto: ['concepto'],
                importe: ['importe eur', 'importe']
            },
            // Formato Santander original (con punto y coma)
            'santander_raw': {
                fecha: ['fecha operación', 'fecha operacion'],
                concepto: ['concepto'],
                importe: ['importe eur']
            },
            // Formato genérico
            'generico': {
                fecha: ['fecha', 'date', 'f. valor', 'fecha valor'],
                concepto: ['concepto', 'descripcion', 'description', 'movimiento', 'detalle'],
                importe: ['importe', 'amount', 'cantidad', 'monto', 'valor']
            }
        };
    }

    /**
     * Importar transacciones desde archivo
     */
    async importar(rutaArchivo, tipo = 'csv') {
        switch (tipo.toLowerCase()) {
            case 'csv':
                return await this.importarCSV(rutaArchivo);
            case 'json':
                return await this.importarJSON(rutaArchivo);
            default:
                throw new Error(`Formato no soportado: ${tipo}`);
        }
    }

    /**
     * Detectar si es formato Santander con cabeceras extra
     * y encontrar la línea donde empiezan los datos reales
     */
    detectarFormatoSantander(lineas) {
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].toLowerCase();
            // Buscar la línea de cabecera de movimientos
            if (linea.includes('fecha operación') || linea.includes('fecha operacion')) {
                // Verificar que también tenga concepto e importe
                if (linea.includes('concepto') && (linea.includes('importe') || linea.includes('importe eur'))) {
                    return i; // Retorna el índice de la línea de cabecera
                }
            }
        }
        return 0; // Si no encuentra formato Santander, asume que la cabecera está en la línea 0
    }

    /**
     * Importar desde archivo CSV
     */
    async importarCSV(rutaArchivo) {
        return new Promise((resolve, reject) => {
            const transacciones = [];
            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            let lineas = contenido.split('\n').filter(l => l.trim());

            if (lineas.length < 2) {
                return resolve([]);
            }

            // Detectar si es formato Santander con cabeceras extra
            const lineaCabecera = this.detectarFormatoSantander(lineas);
            console.log(`📋 Cabecera detectada en línea: ${lineaCabecera + 1}`);

            // Reajustar líneas desde la cabecera real
            lineas = lineas.slice(lineaCabecera);

            if (lineas.length < 2) {
                return resolve([]);
            }

            // Detectar delimitador de la cabecera
            const delimitador = this.detectarDelimitador(lineas[0]);
            console.log(`📋 Delimitador detectado: "${delimitador}"`);
            
            // Parsear cabecera
            const cabecera = this.parsearLineaCSV(lineas[0], delimitador);
            console.log('📋 Cabecera:', cabecera);
            
            const mapeo = this.detectarMapeoColumnas(cabecera);
            console.log('📋 Mapeo detectado:', mapeo);

            if (!mapeo) {
                return reject(new Error('No se pudo detectar el formato del CSV. Asegúrate de que tiene columnas: FECHA OPERACIÓN, CONCEPTO, IMPORTE EUR'));
            }

            // Parsear datos (desde línea 1 porque línea 0 es la cabecera)
            for (let i = 1; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;

                // Saltar líneas que parecen vacías o son separadores
                if (linea.replace(/;/g, '').replace(/,/g, '').trim() === '') continue;

                try {
                    const valores = this.parsearLineaCSV(linea, delimitador);
                    const transaccion = this.crearTransaccionDesdeCSV(valores, mapeo, cabecera);
                    
                    if (transaccion && transaccion.concepto && transaccion.fecha && transaccion.concepto.trim() !== '') {
                        transacciones.push(transaccion);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error en línea ${lineaCabecera + i + 1}:`, error.message);
                }
            }

            console.log(`📥 Importadas ${transacciones.length} transacciones desde CSV`);
            resolve(transacciones);
        });
    }

    /**
     * Detectar delimitador del CSV
     */
    detectarDelimitador(linea) {
        // Priorizar ; y , que son los más comunes en archivos bancarios
        const delimitadores = [';', ',', '\t'];
        let mejor = ',';
        let maxCount = 0;

        for (const del of delimitadores) {
            // Escapar caracteres especiales para regex
            const escaped = del.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const count = (linea.match(new RegExp(escaped, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                mejor = del;
            }
        }

        return mejor;
    }

    /**
     * Parsear línea CSV respetando comillas
     */
    parsearLineaCSV(linea, delimitador = ',') {
        const resultado = [];
        let actual = '';
        let dentroComillas = false;

        for (let i = 0; i < linea.length; i++) {
            const char = linea[i];

            if (char === '"') {
                dentroComillas = !dentroComillas;
            } else if (char === delimitador && !dentroComillas) {
                resultado.push(actual.trim());
                actual = '';
            } else {
                actual += char;
            }
        }

        resultado.push(actual.trim());
        return resultado;
    }

    /**
     * Detectar mapeo de columnas basándose en la cabecera
     */
    detectarMapeoColumnas(cabecera) {
        const cabeceraLower = cabecera.map(c => c.toLowerCase().trim());
        const mapeo = { fecha: -1, concepto: -1, importe: -1, categoria: -1 };

        // Buscar columnas específicas
        for (let i = 0; i < cabeceraLower.length; i++) {
            const col = cabeceraLower[i];
            
            // Detectar fecha
            if (mapeo.fecha === -1) {
                if (col.includes('fecha operación') || col.includes('fecha operacion') || col === 'fecha') {
                    mapeo.fecha = i;
                }
            }
            
            // Detectar concepto
            if (mapeo.concepto === -1) {
                if (col === 'concepto' || col.includes('descripcion') || col.includes('descripción')) {
                    mapeo.concepto = i;
                }
            }
            
            // Detectar importe
            if (mapeo.importe === -1) {
                if (col.includes('importe eur') || col === 'importe' || col.includes('amount')) {
                    mapeo.importe = i;
                }
            }

            // Detectar categoria
            if (mapeo.categoria === -1) {
                if (col === 'categoria' || col === 'categoría' || col === 'category') {
                    mapeo.categoria = i;
                }
            }
        }

        // Verificar que se encontraron todas las columnas necesarias
        if (mapeo.fecha !== -1 && mapeo.concepto !== -1 && mapeo.importe !== -1) {
            console.log(`📊 Formato detectado correctamente`);
            return mapeo;
        }

        // Fallback: si no se detectó, intentar con posiciones por defecto
        if (cabecera.length >= 3) {
            console.log(`📊 Usando mapeo por posición por defecto`);
            return { fecha: 0, concepto: 1, importe: 2 };
        }

        return null;
    }

    /**
     * Crear objeto transacción desde línea CSV
     */
    crearTransaccionDesdeCSV(valores, mapeo, cabecera) {
        let fecha = valores[mapeo.fecha] || '';
        let concepto = valores[mapeo.concepto] || '';
        let importe = valores[mapeo.importe] || '0';

        // Limpiar valores
        fecha = fecha.replace(/"/g, '').trim();
        concepto = concepto.replace(/"/g, '').trim();
        importe = importe.replace(/"/g, '').trim();

        // Normalizar fecha (DD/MM/YYYY -> YYYY-MM-DD)
        fecha = this.normalizarFecha(fecha);

        // Normalizar importe (formato europeo 1.234,56 -> 1234.56)
        importe = this.normalizarImporte(importe);

        // Extraer categoría si existe en el CSV
        let categoria = null;
        if (mapeo.categoria !== -1 && valores[mapeo.categoria]) {
            categoria = valores[mapeo.categoria].replace(/"/g, '').trim();
            if (categoria) {
                console.log(`📌 Categoría importada del CSV: ${categoria}`);
            }
        }

        const transaccion = {
            fecha,
            concepto,
            importe
        };

        // Solo agregar categoría si existe y no está vacía
        if (categoria && categoria.length > 0) {
            transaccion.categoria = categoria;
        }

        return transaccion;
    }

    /**
     * Normalizar fecha a formato ISO (YYYY-MM-DD)
     */
    normalizarFecha(fecha) {
        if (!fecha) return null;

        // Ya está en formato ISO (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
        }

        // Formato DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
            const [dia, mes, año] = fecha.split('/');
            return `${año}-${mes}-${dia}`;
        }

        // Formato DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
            const [dia, mes, año] = fecha.split('-');
            return `${año}-${mes}-${dia}`;
        }

        // Intentar parsear como fecha
        try {
            const parsed = new Date(fecha);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
        } catch (e) {}

        return fecha;
    }

    /**
     * Normalizar importe (manejar formato europeo e internacional)
     */
    normalizarImporte(importe) {
        if (typeof importe === 'number') return importe;
        if (!importe || importe.trim() === '') return 0;

        let valor = importe.toString().trim();
        
        // Eliminar símbolos de moneda y espacios
        valor = valor.replace(/[€$\s]/g, '');
        
        // Detectar formato europeo (1.234,56) vs americano (1,234.56)
        const tienePunto = valor.includes('.');
        const tieneComa = valor.includes(',');
        
        if (tieneComa && tienePunto) {
            // Ambos presentes: determinar cuál es el decimal
            const ultimoPunto = valor.lastIndexOf('.');
            const ultimaComa = valor.lastIndexOf(',');
            
            if (ultimaComa > ultimoPunto) {
                // Formato europeo: 1.234,56 -> la coma es decimal
                valor = valor.replace(/\./g, '').replace(',', '.');
            } else {
                // Formato americano: 1,234.56 -> el punto es decimal
                valor = valor.replace(/,/g, '');
            }
        } else if (tieneComa && !tienePunto) {
            // Solo coma: formato europeo, la coma es decimal
            valor = valor.replace(',', '.');
        }
        // Si solo tiene punto, ya está bien

        const numero = parseFloat(valor);
        return isNaN(numero) ? 0 : numero;
    }

    /**
     * Importar desde archivo JSON
     */
    async importarJSON(rutaArchivo) {
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const datos = JSON.parse(contenido);

        const transacciones = Array.isArray(datos) ? datos : datos.transacciones || [];
        
        console.log(`📥 Importadas ${transacciones.length} transacciones desde JSON`);
        return transacciones;
    }

    /**
     * Exportar transacciones a CSV
     */
    exportarCSV(transacciones, rutaArchivo) {
        const cabecera = 'Fecha;Concepto;Importe;Categoría;Cuenta;Notas\n';
        const lineas = transacciones.map(t => 
            `"${t.fecha}";"${t.concepto}";"${t.importe}";"${t.categoria}";"${t.cuenta || ''}";"${t.notas || ''}"`
        );

        const contenido = cabecera + lineas.join('\n');
        fs.writeFileSync(rutaArchivo, contenido, 'utf-8');

        console.log(`📤 Exportadas ${transacciones.length} transacciones a CSV`);
        return rutaArchivo;
    }

    /**
     * Exportar transacciones a JSON
     */
    exportarJSON(transacciones, rutaArchivo) {
        const contenido = JSON.stringify({ transacciones }, null, 2);
        fs.writeFileSync(rutaArchivo, contenido, 'utf-8');

        console.log(`📤 Exportadas ${transacciones.length} transacciones a JSON`);
        return rutaArchivo;
    }
}

module.exports = ImportadorService;
