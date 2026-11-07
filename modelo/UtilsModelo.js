/**
 * Utilidades para preprocesamiento y análisis de datos
 */

class UtilsModelo {
    /**
     * Limpiar y normalizar texto
     */
    static limpiarTexto(texto) {
        if (!texto) return '';
        
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/[^a-z0-9\s]/g, ' ') // Solo letras, números y espacios
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
    }

    /**
     * Extraer características numéricas del importe
     */
    static extraerCaracteristicasImporte(importe) {
        const abs = Math.abs(importe);
        
        return {
            esPositivo: importe > 0 ? 1 : 0,
            esNegativo: importe < 0 ? 1 : 0,
            esPequeno: abs < 10 ? 1 : 0,      // < 10€
            esMedio: abs >= 10 && abs < 100 ? 1 : 0,  // 10-100€
            esGrande: abs >= 100 && abs < 1000 ? 1 : 0, // 100-1000€
            esMuyGrande: abs >= 1000 ? 1 : 0  // > 1000€
        };
    }

    /**
     * Analizar distribución de categorías
     */
    static analizarDistribucion(transacciones) {
        const conteo = {};
        
        transacciones.forEach(t => {
            const cat = t.categoria || 'Otros';
            conteo[cat] = (conteo[cat] || 0) + 1;
        });

        const total = transacciones.length;
        const distribucion = Object.entries(conteo).map(([categoria, cantidad]) => ({
            categoria,
            cantidad,
            porcentaje: (cantidad / total * 100).toFixed(2)
        }));

        distribucion.sort((a, b) => b.cantidad - a.cantidad);

        return {
            total,
            distribucion,
            categorias: Object.keys(conteo).length
        };
    }

    /**
     * Obtener palabras más frecuentes por categoría
     */
    static palabrasFrecuentesPorCategoria(transacciones, topN = 10) {
        const palabrasPorCategoria = {};

        transacciones.forEach(t => {
            const categoria = t.categoria || 'Otros';
            if (!palabrasPorCategoria[categoria]) {
                palabrasPorCategoria[categoria] = {};
            }

            const palabras = this.limpiarTexto(t.concepto).split(' ');
            palabras.forEach(palabra => {
                if (palabra.length > 2) { // Ignorar palabras muy cortas
                    palabrasPorCategoria[categoria][palabra] = 
                        (palabrasPorCategoria[categoria][palabra] || 0) + 1;
                }
            });
        });

        // Ordenar y obtener top N
        const resultado = {};
        for (const [categoria, palabras] of Object.entries(palabrasPorCategoria)) {
            resultado[categoria] = Object.entries(palabras)
                .sort((a, b) => b[1] - a[1])
                .slice(0, topN)
                .map(([palabra, frecuencia]) => ({ palabra, frecuencia }));
        }

        return resultado;
    }

    /**
     * Validar conjunto de datos
     */
    static validarDatos(transacciones) {
        const errores = [];
        const advertencias = [];

        // Verificar que hay datos
        if (!transacciones || transacciones.length === 0) {
            errores.push('No hay transacciones para procesar');
            return { valido: false, errores, advertencias };
        }

        // Verificar campos requeridos
        let sinConcepto = 0;
        let sinCategoria = 0;
        let conceptosVacios = 0;

        transacciones.forEach((t, idx) => {
            if (!t.concepto) {
                sinConcepto++;
            } else if (t.concepto.trim().length === 0) {
                conceptosVacios++;
            }

            if (!t.categoria) {
                sinCategoria++;
            }
        });

        if (sinConcepto > 0) {
            advertencias.push(`${sinConcepto} transacciones sin campo concepto`);
        }

        if (conceptosVacios > 0) {
            advertencias.push(`${conceptosVacios} transacciones con concepto vacío`);
        }

        if (sinCategoria > 0) {
            advertencias.push(`${sinCategoria} transacciones sin categoría`);
        }

        // Verificar distribución mínima
        const distribucion = this.analizarDistribucion(transacciones);
        if (distribucion.categorias < 2) {
            errores.push('Se necesitan al menos 2 categorías diferentes');
        }

        // Verificar cantidad mínima por categoría
        distribucion.distribucion.forEach(d => {
            if (d.cantidad < 3) {
                advertencias.push(`Categoría "${d.categoria}" tiene solo ${d.cantidad} ejemplos`);
            }
        });

        return {
            valido: errores.length === 0,
            errores,
            advertencias,
            estadisticas: {
                total: transacciones.length,
                categorias: distribucion.categorias,
                distribucion: distribucion.distribucion
            }
        };
    }

    /**
     * Balancear dataset (útil si hay categorías desbalanceadas)
     */
    static balancearDatos(transacciones, metodo = 'undersample') {
        // Agrupar por categoría
        const porCategoria = {};
        transacciones.forEach(t => {
            const cat = t.categoria || 'Otros';
            if (!porCategoria[cat]) {
                porCategoria[cat] = [];
            }
            porCategoria[cat].push(t);
        });

        if (metodo === 'undersample') {
            // Reducir todas las categorías al tamaño de la más pequeña
            const minSize = Math.min(...Object.values(porCategoria).map(arr => arr.length));
            
            const balanceado = [];
            for (const [categoria, items] of Object.entries(porCategoria)) {
                // Seleccionar aleatoriamente minSize items
                const shuffled = items.sort(() => Math.random() - 0.5);
                balanceado.push(...shuffled.slice(0, minSize));
            }

            return balanceado;

        } else if (metodo === 'oversample') {
            // Aumentar todas las categorías al tamaño de la más grande
            const maxSize = Math.max(...Object.values(porCategoria).map(arr => arr.length));
            
            const balanceado = [];
            for (const [categoria, items] of Object.entries(porCategoria)) {
                balanceado.push(...items);
                
                // Duplicar items hasta alcanzar maxSize
                while (balanceado.filter(t => t.categoria === categoria).length < maxSize) {
                    const randomItem = items[Math.floor(Math.random() * items.length)];
                    balanceado.push({ ...randomItem });
                }
            }

            return balanceado;
        }

        return transacciones;
    }

    /**
     * Calcular métricas de evaluación
     */
    static calcularMetricas(predicciones, reales) {
        const categorias = [...new Set([...predicciones, ...reales])];
        
        // Matriz de confusión
        const matrizConfusion = {};
        categorias.forEach(cat => {
            matrizConfusion[cat] = {};
            categorias.forEach(cat2 => {
                matrizConfusion[cat][cat2] = 0;
            });
        });

        predicciones.forEach((pred, idx) => {
            const real = reales[idx];
            matrizConfusion[real][pred]++;
        });

        // Calcular precision, recall, f1-score por categoría
        const metricasPorCategoria = {};
        let correctos = 0;
        const total = predicciones.length;

        categorias.forEach(cat => {
            const vp = matrizConfusion[cat][cat]; // Verdaderos positivos
            const fp = categorias.reduce((sum, c) => 
                c !== cat ? sum + matrizConfusion[c][cat] : sum, 0); // Falsos positivos
            const fn = categorias.reduce((sum, c) => 
                c !== cat ? sum + matrizConfusion[cat][c] : sum, 0); // Falsos negativos

            correctos += vp;

            const precision = vp + fp > 0 ? vp / (vp + fp) : 0;
            const recall = vp + fn > 0 ? vp / (vp + fn) : 0;
            const f1Score = precision + recall > 0 ? 
                2 * (precision * recall) / (precision + recall) : 0;

            metricasPorCategoria[cat] = {
                precision: precision.toFixed(3),
                recall: recall.toFixed(3),
                f1Score: f1Score.toFixed(3),
                soporte: vp + fn
            };
        });

        const accuracy = correctos / total;

        return {
            accuracy: accuracy.toFixed(3),
            matrizConfusion,
            metricasPorCategoria
        };
    }

    /**
     * Generar reporte de análisis
     */
    static generarReporte(transacciones) {
        const validacion = this.validarDatos(transacciones);
        const distribucion = this.analizarDistribucion(transacciones);
        const palabrasFrecuentes = this.palabrasFrecuentesPorCategoria(transacciones, 5);

        return {
            validacion,
            distribucion,
            palabrasFrecuentes
        };
    }
}

module.exports = UtilsModelo;
