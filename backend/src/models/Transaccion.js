/**
 * Transaccion - Modelo de datos para transacciones bancarias
 */

class Transaccion {
    constructor(datos = {}) {
        this.id = datos.id || null;
        this.fecha = this.normalizarFecha(datos.fecha);
        this.concepto = datos.concepto || '';
        this.importe = this.normalizarImporte(datos.importe);
        this.categoria = datos.categoria || 'Otros';
        this.cuenta = datos.cuenta || null;
        this.notas = datos.notas || null;
        this.fechaCreacion = datos.fecha_creacion || new Date().toISOString();
        this.fechaActualizacion = datos.fecha_actualizacion || new Date().toISOString();
    }

    /**
     * Normalizar fecha a formato ISO
     */
    normalizarFecha(fecha) {
        if (!fecha) {
            return new Date().toISOString().split('T')[0];
        }

        // Si ya es formato ISO (YYYY-MM-DD)
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
        const parsed = new Date(fecha);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return new Date().toISOString().split('T')[0];
    }

    /**
     * Normalizar importe a número
     */
    normalizarImporte(importe) {
        if (typeof importe === 'number') {
            return importe;
        }

        if (typeof importe === 'string') {
            // Eliminar símbolos de moneda y espacios
            let limpio = importe.replace(/[€$\s]/g, '');
            
            // Manejar formato europeo (1.234,56) vs americano (1,234.56)
            if (limpio.includes(',') && limpio.includes('.')) {
                // Formato europeo: 1.234,56
                if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
                    limpio = limpio.replace(/\./g, '').replace(',', '.');
                } else {
                    // Formato americano: 1,234.56
                    limpio = limpio.replace(/,/g, '');
                }
            } else if (limpio.includes(',')) {
                // Solo coma: podría ser decimal europeo
                limpio = limpio.replace(',', '.');
            }

            return parseFloat(limpio) || 0;
        }

        return 0;
    }

    /**
     * Verificar si es un ingreso
     */
    esIngreso() {
        return this.importe > 0;
    }

    /**
     * Verificar si es un gasto
     */
    esGasto() {
        return this.importe < 0;
    }

    /**
     * Obtener importe absoluto
     */
    obtenerImporteAbsoluto() {
        return Math.abs(this.importe);
    }

    /**
     * Formatear importe para mostrar
     */
    formatearImporte() {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(this.importe);
    }

    /**
     * Formatear fecha para mostrar
     */
    formatearFecha() {
        const fecha = new Date(this.fecha);
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(fecha);
    }

    /**
     * Convertir a objeto plano
     */
    toJSON() {
        return {
            id: this.id,
            fecha: this.fecha,
            concepto: this.concepto,
            importe: this.importe,
            categoria: this.categoria,
            cuenta: this.cuenta,
            notas: this.notas
        };
    }

    /**
     * Validar transacción
     */
    validar() {
        const errores = [];

        if (!this.fecha) {
            errores.push('La fecha es requerida');
        }

        if (!this.concepto || this.concepto.trim() === '') {
            errores.push('El concepto es requerido');
        }

        if (this.importe === 0) {
            errores.push('El importe no puede ser cero');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }
}

module.exports = Transaccion;
