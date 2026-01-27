/**
 * ClasificadorService - Servicio de clasificación automática de transacciones
 * Clasifica conceptos en categorías basándose en palabras clave
 */

class ClasificadorService {
    constructor() {
        // Categorías disponibles
        this.categorias = [
            'Inversión',
            'Coche',
            'Alimentación',
            'Gastos Recurrentes',
            'Ocio',
            'Ingresos',
            'Otros'
        ];

        // Reglas de clasificación por defecto (palabras clave -> categoría)
        this.reglas = {
            // Inversión
            'inversión': 'Inversión',
            'inversion': 'Inversión',
            'fondos': 'Inversión',
            'acciones': 'Inversión',
            'etf': 'Inversión',
            'broker': 'Inversión',
            'degiro': 'Inversión',
            'trading': 'Inversión',
            'bolsa': 'Inversión',
            'cripto': 'Inversión',
            'bitcoin': 'Inversión',
            'indexa': 'Inversión',
            'myinvestor': 'Inversión',

            // Coche
            'gasolina': 'Coche',
            'gasolinera': 'Coche',
            'combustible': 'Coche',
            'diesel': 'Coche',
            'parking': 'Coche',
            'aparcamiento': 'Coche',
            'peaje': 'Coche',
            'autopista': 'Coche',
            'taller': 'Coche',
            'itv': 'Coche',
            'seguro coche': 'Coche',
            'repsol': 'Coche',
            'cepsa': 'Coche',
            'bp': 'Coche',
            'shell': 'Coche',

            // Alimentación
            'mercadona': 'Alimentación',
            'carrefour': 'Alimentación',
            'lidl': 'Alimentación',
            'aldi': 'Alimentación',
            'dia': 'Alimentación',
            'supermercado': 'Alimentación',
            'alimentacion': 'Alimentación',
            'alimentación': 'Alimentación',
            'hipercor': 'Alimentación',
            'eroski': 'Alimentación',
            'alcampo': 'Alimentación',
            'consum': 'Alimentación',
            'ahorramas': 'Alimentación',
            'fruteria': 'Alimentación',
            'carniceria': 'Alimentación',
            'panaderia': 'Alimentación',

            // Gastos Recurrentes
            'alquiler': 'Gastos Recurrentes',
            'hipoteca': 'Gastos Recurrentes',
            'luz': 'Gastos Recurrentes',
            'electricidad': 'Gastos Recurrentes',
            'iberdrola': 'Gastos Recurrentes',
            'endesa': 'Gastos Recurrentes',
            'naturgy': 'Gastos Recurrentes',
            'gas': 'Gastos Recurrentes',
            'agua': 'Gastos Recurrentes',
            'telefono': 'Gastos Recurrentes',
            'móvil': 'Gastos Recurrentes',
            'movil': 'Gastos Recurrentes',
            'internet': 'Gastos Recurrentes',
            'fibra': 'Gastos Recurrentes',
            'movistar': 'Gastos Recurrentes',
            'vodafone': 'Gastos Recurrentes',
            'orange': 'Gastos Recurrentes',
            'netflix': 'Gastos Recurrentes',
            'spotify': 'Gastos Recurrentes',
            'hbo': 'Gastos Recurrentes',
            'amazon prime': 'Gastos Recurrentes',
            'gimnasio': 'Gastos Recurrentes',
            'gym': 'Gastos Recurrentes',
            'seguro': 'Gastos Recurrentes',
            'comunidad': 'Gastos Recurrentes',

            // Ocio
            'restaurante': 'Ocio',
            'bar': 'Ocio',
            'cafeteria': 'Ocio',
            'cafe': 'Ocio',
            'cine': 'Ocio',
            'teatro': 'Ocio',
            'concierto': 'Ocio',
            'hotel': 'Ocio',
            'viaje': 'Ocio',
            'vuelo': 'Ocio',
            'avion': 'Ocio',
            'booking': 'Ocio',
            'airbnb': 'Ocio',
            'renfe': 'Ocio',
            'tren': 'Ocio',
            'zara': 'Ocio',
            'mango': 'Ocio',
            'ropa': 'Ocio',
            'amazon': 'Ocio',
            'juego': 'Ocio',
            'steam': 'Ocio',
            'playstation': 'Ocio',
            'xbox': 'Ocio',

            // Ingresos
            'nomina': 'Ingresos',
            'nómina': 'Ingresos',
            'salario': 'Ingresos',
            'sueldo': 'Ingresos',
            'transferencia recibida': 'Ingresos',
            'ingreso': 'Ingresos',
            'devolucion': 'Ingresos',
            'devolución': 'Ingresos',
            'reembolso': 'Ingresos',
            'dividendo': 'Ingresos',
            'intereses': 'Ingresos',
            'alquiler recibido': 'Ingresos'
        };

        // Reglas personalizadas (se cargarán desde la base de datos)
        this.reglasPersonalizadas = {};
    }

    /**
     * Clasificar un concepto en una categoría
     */
    clasificar(concepto) {
        if (!concepto) return 'Otros';

        const conceptoLower = concepto.toLowerCase().trim();

        // Primero buscar en reglas personalizadas (tienen prioridad)
        for (const [palabra, categoria] of Object.entries(this.reglasPersonalizadas)) {
            if (conceptoLower.includes(palabra)) {
                return categoria;
            }
        }

        // Luego buscar en reglas por defecto
        for (const [palabra, categoria] of Object.entries(this.reglas)) {
            if (conceptoLower.includes(palabra)) {
                return categoria;
            }
        }

        // Si no se encuentra coincidencia, retornar 'Otros'
        return 'Otros';
    }

    /**
     * Obtener lista de categorías disponibles
     */
    obtenerCategorias() {
        return [...this.categorias];
    }

    /**
     * Agregar regla de clasificación personalizada
     */
    agregarRegla(palabraClave, categoria) {
        if (!this.categorias.includes(categoria)) {
            throw new Error(`Categoría no válida: ${categoria}`);
        }

        const palabraLower = palabraClave.toLowerCase().trim();
        this.reglasPersonalizadas[palabraLower] = categoria;

        return { palabraClave: palabraLower, categoria };
    }

    /**
     * Eliminar regla personalizada
     */
    eliminarRegla(palabraClave) {
        const palabraLower = palabraClave.toLowerCase().trim();
        delete this.reglasPersonalizadas[palabraLower];
    }

    /**
     * Cargar reglas personalizadas desde la base de datos
     */
    cargarReglasDesdeDB(reglas) {
        for (const regla of reglas) {
            this.reglasPersonalizadas[regla.palabra_clave] = regla.categoria;
        }
        console.log(`📋 Cargadas ${reglas.length} reglas personalizadas`);
    }

    /**
     * Obtener todas las reglas (por defecto + personalizadas)
     */
    obtenerReglas() {
        return {
            default: { ...this.reglas },
            personalizadas: { ...this.reglasPersonalizadas }
        };
    }

    /**
     * Sugerir categoría basándose en el importe
     * (Complemento a la clasificación por concepto)
     */
    sugerirPorImporte(importe) {
        if (importe > 0) {
            return 'Ingresos';
        }
        return null; // No se puede determinar solo por importe negativo
    }

    /**
     * Obtener estadísticas de clasificación
     */
    obtenerEstadisticas() {
        return {
            totalCategorias: this.categorias.length,
            totalReglasDefault: Object.keys(this.reglas).length,
            totalReglasPersonalizadas: Object.keys(this.reglasPersonalizadas).length
        };
    }
}

module.exports = ClasificadorService;
