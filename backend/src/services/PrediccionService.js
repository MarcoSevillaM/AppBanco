/**
 * PrediccionService - Predicción del ahorro del mes
 *
 * Separa los movimientos en tres grupos y predice cada uno a su manera:
 *  - Fijos: el mismo comercio/destinatario aparece casi todos los meses con un
 *    importe parecido (nómina, alquiler, cuotas). Se espera la mediana de las
 *    3 últimas veces.
 *  - Extraordinarios: gastos puntuales muy grandes (reformas, multas, viajes).
 *    No se sabe cuándo llegan, así que se espera su media mensual del último
 *    año; el intervalo recoge el resto del riesgo.
 *  - Variables: todo lo demás (súper, ocio, gasolina...). Se usa la mediana
 *    de los últimos meses, que no se deja arrastrar por un mes raro.
 *
 * Si el mes ya ha empezado, se suma lo ya registrado y solo se proyecta lo
 * que falta, según cómo se reparte habitualmente el gasto a lo largo del mes.
 *
 * El intervalo P10–P90 sale de una prueba hacia atrás: para cada mes pasado
 * se predice usando solo los meses anteriores y se mide el error real.
 *
 * Las Inversiones no cuentan como ingreso ni gasto (igual que en el resto de la app).
 */

const MESES_RECURRENCIA = 4;        // ventana para detectar fijos
const MIN_MESES_RECURRENTE = 3;     // presentes en al menos 3 de esos 4 meses
const MAX_VARIACION_FIJO = 0.2;     // variación robusta máxima del importe mensual
const MAX_VARIACION_RECURRENTE = 0.3;
const MIN_IMPORTE_FIJO_NUEVO = 50;   // fijo nuevo: 2 meses seguidos, importe relevante
const MAX_VARIACION_FIJO_NUEVO = 0.05; //   y casi idéntico
const MIN_IMPORTE_FIJO = 5;         // por debajo no merece la pena listarlo
const MESES_BASE_VARIABLE = 6;      // mediana de los últimos 6 meses
const MESES_HISTORIA = 12;          // ventana para umbrales y reparto diario
const UMBRAL_EXTRA_MINIMO = 300;    // un movimiento extraordinario mide al menos esto
const PERCENTIL_EXTRA = 0.95;
const MIN_MESES_PRUEBA = 6;         // meses previos necesarios para probar un mes
const MIN_MESES_FIABLE = 6;

class PrediccionService {
    /**
     * @param {object} opciones
     * @param {function} [opciones.claveComercio] (concepto, importe) => clave o null
     *        (en la app, la misma del clasificador para el historial de comercios)
     */
    constructor({ claveComercio } = {}) {
        this.claveComercioBase = claveComercio || PrediccionService.claveSimple;
    }

    static claveSimple(concepto, importe) {
        const texto = String(concepto || '').toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .split(',')[0].replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!texto) return null;
        return importe > 0 ? `${texto} +` : texto;
    }

    // ==========================================
    // UTILIDADES DE FECHAS
    // ==========================================

    static claveMes(fecha) {
        return String(fecha).slice(0, 7);
    }

    static desplazarMes(claveMes, n) {
        const [a, m] = claveMes.split('-').map(Number);
        const fecha = new Date(Date.UTC(a, m - 1 + n, 1));
        return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    static diasDelMes(claveMes) {
        const [a, m] = claveMes.split('-').map(Number);
        return new Date(Date.UTC(a, m, 0)).getUTCDate();
    }

    static mesActual(hoy = new Date()) {
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    }

    // ==========================================
    // ESTADÍSTICA
    // ==========================================

    static mediana(valores) {
        if (valores.length === 0) return 0;
        const v = [...valores].sort((a, b) => a - b);
        const mitad = Math.floor(v.length / 2);
        return v.length % 2 ? v[mitad] : (v[mitad - 1] + v[mitad]) / 2;
    }

    static percentil(valores, p) {
        if (valores.length === 0) return 0;
        const v = [...valores].sort((a, b) => a - b);
        const pos = (v.length - 1) * p;
        const base = Math.floor(pos);
        const resto = pos - base;
        return v[base + 1] !== undefined ? v[base] + resto * (v[base + 1] - v[base]) : v[base];
    }

    /**
     * Variación robusta: desviación absoluta mediana / |mediana|.
     * Un finiquito o una paga extra sueltos no la disparan.
     */
    static variacion(valores) {
        if (valores.length < 2) return 0;
        const med = PrediccionService.mediana(valores);
        if (med === 0) return Infinity;
        return PrediccionService.mediana(valores.map(x => Math.abs(x - med))) / Math.abs(med);
    }

    static redondear(x) {
        return Math.round(x * 100) / 100;
    }

    // ==========================================
    // PREPARACIÓN
    // ==========================================

    claveComercio(t) {
        // Los extractos traen a veces las tildes rotas ("Mart�n" / "Martín"): se quitan
        // todos los caracteres no ASCII para que ambas versiones den la misma clave
        const concepto = String(t.concepto || '').replace(/[^\x00-\x7F]/g, '');
        const clave = this.claveComercioBase(concepto, t.importe);
        if (!clave) return null;
        // "Transferencia [inmediata] a favor de X concepto ..." -> lo que importa es X;
        // el texto del concepto cambia cada mes ("pago octubre", "piso noviembre"...)
        return clave
            .replace(/\binmediata\s+/g, '')
            .replace(/^(transferencia .*?) concepto\b.*?( \+)?$/, '$1$2');
    }

    /**
     * Movimientos que cuentan para el ahorro (sin Inversiones), agrupados por mes
     */
    prepararMovimientos(transacciones) {
        const porMes = new Map();
        for (const t of transacciones) {
            if (!t || t.categoria === 'Inversiones' || !t.importe) continue;
            const mov = {
                fecha: String(t.fecha).slice(0, 10),
                dia: Number(String(t.fecha).slice(8, 10)),
                concepto: t.concepto || '',
                importe: Number(t.importe),
                categoria: t.categoria || 'Otros',
                clave: this.claveComercio(t)
            };
            const mes = PrediccionService.claveMes(mov.fecha);
            if (!porMes.has(mes)) porMes.set(mes, []);
            porMes.get(mes).push(mov);
        }
        return porMes;
    }

    /**
     * Inversión neta por mes (para la gráfica de ahorro absoluto)
     */
    static inversionPorMes(transacciones) {
        const porMes = {};
        for (const t of transacciones) {
            if (t.categoria !== 'Inversiones') continue;
            const mes = PrediccionService.claveMes(t.fecha);
            porMes[mes] = (porMes[mes] || 0) + Number(t.importe);
        }
        return porMes;
    }

    // ==========================================
    // MODELO
    // ==========================================

    /**
     * Ajustar el modelo con los meses completos anteriores a `mesObjetivo`
     */
    ajustar(porMes, mesObjetivo) {
        const mesesHistoria = [];
        for (let i = MESES_HISTORIA; i >= 1; i--) {
            mesesHistoria.push(PrediccionService.desplazarMes(mesObjetivo, -i));
        }
        const conDatos = mesesHistoria.filter(m => (porMes.get(m) || []).length > 0);
        const ventanaRecurrencia = mesesHistoria.slice(-MESES_RECURRENCIA);

        // 1. Fijos: comercios que se repiten casi todos los meses con importe estable
        const totalesPorClave = new Map();   // clave -> { mes -> total }
        const infoClave = new Map();
        for (const mes of mesesHistoria) {
            for (const mov of porMes.get(mes) || []) {
                if (!mov.clave) continue;
                if (!totalesPorClave.has(mov.clave)) totalesPorClave.set(mov.clave, {});
                const totales = totalesPorClave.get(mov.clave);
                totales[mes] = (totales[mes] || 0) + mov.importe;
                infoClave.set(mov.clave, { concepto: mov.concepto, categoria: mov.categoria, dia: mov.dia });
            }
        }

        const fijos = new Map();
        for (const [clave, totales] of totalesPorClave) {
            const presentes = ventanaRecurrencia.filter(m => totales[m] !== undefined);
            const importes = mesesHistoria.filter(m => totales[m] !== undefined).slice(-6).map(m => totales[m]);
            if (importes.some(x => Math.sign(x) !== Math.sign(importes[0]))) continue;

            // Habitual: 3 de los últimos 4 meses con importe estable. Nuevo: los 2 últimos meses con el mismo importe
            // (una nómina nueva, un alquiler nuevo).
            const maxVariacion = MAX_VARIACION_FIJO;
            const habitual = presentes.length >= MIN_MESES_RECURRENTE
                && PrediccionService.variacion(importes) <= maxVariacion;
            const ultimos2 = ventanaRecurrencia.slice(-2).map(m => totales[m]);
            const nuevo = ultimos2.every(x => x !== undefined)
                && Math.abs(PrediccionService.mediana(ultimos2)) >= MIN_IMPORTE_FIJO_NUEVO
                && PrediccionService.variacion(ultimos2) <= MAX_VARIACION_FIJO_NUEVO;
            if (!habitual && !nuevo) continue;

            // Si la última vez fue mucho menor de lo normal (un finiquito, una baja),
            // se da por terminado
            const ultimo = importes[importes.length - 1];
            if (Math.abs(ultimo) < Math.abs(PrediccionService.mediana(importes)) * 0.5) continue;

            // Mediana de las 3 últimas veces: una paga extra no cambia lo esperado
            const esperado = PrediccionService.mediana(importes.slice(-3));
            if (Math.abs(esperado) < MIN_IMPORTE_FIJO) continue;

            fijos.set(clave, { clave, esperado, ...infoClave.get(clave) });
        }

        // Recurrentes del último año aunque ya no estén activos (una nómina anterior,
        // un alquiler que se dejó): no son gasto/ingreso variable, aunque ya no se esperen
        const recurrentes = new Set(fijos.keys());
        for (const [clave, totales] of totalesPorClave) {
            const importes = Object.values(totales);
            if (importes.length < MIN_MESES_RECURRENTE) continue;
            if (importes.some(x => Math.sign(x) !== Math.sign(importes[0]))) continue;
            if (PrediccionService.variacion(importes) > MAX_VARIACION_RECURRENTE) continue;
            if (Math.abs(PrediccionService.mediana(importes)) < MIN_IMPORTE_FIJO) continue;
            recurrentes.add(clave);
        }

        // 2. Umbral de extraordinarios con los movimientos no recurrentes del último año
        const importesNoFijos = [];
        for (const mes of mesesHistoria) {
            for (const mov of porMes.get(mes) || []) {
                if (mov.importe < 0 && !recurrentes.has(mov.clave)) importesNoFijos.push(-mov.importe);
            }
        }
        const umbralExtra = Math.max(
            UMBRAL_EXTRA_MINIMO,
            PrediccionService.percentil(importesNoFijos, PERCENTIL_EXTRA)
        );

        // 3. Desglose de cada mes histórico con esa clasificación
        const resumenMes = (mes) => this.desglosar(porMes.get(mes) || [], recurrentes, umbralExtra);
        const desgloses = new Map(mesesHistoria.map(m => [m, resumenMes(m)]));

        // 4. Base variable: mediana de los últimos meses con datos
        const mesesBase = conDatos.slice(-MESES_BASE_VARIABLE);
        const baseGastoVariable = PrediccionService.mediana(mesesBase.map(m => desgloses.get(m).gastos.variables));
        const baseIngresoVariable = PrediccionService.mediana(mesesBase.map(m => desgloses.get(m).ingresos.variables));

        // Ingreso habitual: red de seguridad para cambios de nómina, cuando la nueva
        // todavía no se reconoce como fija y la anterior ya terminó
        const ingresoHabitual = PrediccionService.mediana(conDatos.slice(-3).map(m => {
            const d = desgloses.get(m).ingresos;
            return d.fijos + d.variables + d.extraordinarios;
        }));

        // Extraordinarios: no se sabe cuándo llegan, pero sí cuánto suman de media al año
        const extrasMes = conDatos.map(m => desgloses.get(m).gastos.extraordinarios);
        const extraEsperado = extrasMes.length
            ? extrasMes.reduce((a, b) => a + b, 0) / extrasMes.length
            : 0;

        // Reparto por categoría del gasto variable (medianas reescaladas a la base)
        const categorias = new Set();
        mesesBase.forEach(m => Object.keys(desgloses.get(m).categoriasVariables).forEach(c => categorias.add(c)));
        const medianasCat = {};
        for (const cat of categorias) {
            medianasCat[cat] = PrediccionService.mediana(
                mesesBase.map(m => desgloses.get(m).categoriasVariables[cat] || 0)
            );
        }
        const sumaMedianas = Object.values(medianasCat).reduce((a, b) => a + b, 0);
        const escala = sumaMedianas > 0 ? baseGastoVariable / sumaMedianas : 0;
        const variablePorCategoria = {};
        for (const [cat, v] of Object.entries(medianasCat)) variablePorCategoria[cat] = v * escala;

        // 5. Cómo se reparten a lo largo del mes el gasto y el ingreso variables
        const listas = conDatos.map(m => porMes.get(m));
        const esVariable = mov => !recurrentes.has(mov.clave) && Math.abs(mov.importe) < umbralExtra;
        const curvaGasto = this.curvaDiaria(listas, mov => mov.importe < 0 && esVariable(mov));
        const curvaIngreso = this.curvaDiaria(listas, mov => mov.importe > 0 && !recurrentes.has(mov.clave));

        return {
            fijos,
            recurrentes,
            umbralExtra,
            baseGastoVariable,
            baseIngresoVariable,
            ingresoHabitual,
            extraEsperado,
            variablePorCategoria,
            curvaGasto,
            curvaIngreso,
            mesesConDatos: conDatos,
            desgloses
        };
    }

    /**
     * Dividir los movimientos de un mes en fijos / variables / extraordinarios
     * @param {Set} fijos - claves que se consideran fijas
     */
    desglosar(movimientos, fijos, umbralExtra) {
        const vacio = () => ({ fijos: 0, variables: 0, extraordinarios: 0 });
        const r = { ingresos: vacio(), gastos: vacio(), categoriasVariables: {}, extraordinarios: [] };

        for (const mov of movimientos) {
            const lado = mov.importe > 0 ? r.ingresos : r.gastos;
            const valor = Math.abs(mov.importe);
            if (fijos.has(mov.clave)) {
                lado.fijos += valor;
            } else if (mov.importe < 0 && valor >= umbralExtra) {
                lado.extraordinarios += valor;
                r.extraordinarios.push(mov);
            } else {
                lado.variables += valor;
                if (mov.importe < 0) {
                    r.categoriasVariables[mov.categoria] = (r.categoriasVariables[mov.categoria] || 0) + valor;
                }
            }
        }
        return r;
    }

    /**
     * Fracción media de lo que cumple `filtro` registrada hasta cada día del mes (índice 0..31)
     */
    curvaDiaria(listasMes, filtro) {
        const acumulado = new Array(32).fill(0);
        let meses = 0;
        for (const movs of listasMes) {
            const porDia = new Array(32).fill(0);
            let total = 0;
            for (const mov of movs || []) {
                if (!filtro(mov)) continue;
                porDia[mov.dia] += Math.abs(mov.importe);
                total += Math.abs(mov.importe);
            }
            if (total <= 0) continue;
            let suma = 0;
            for (let d = 0; d <= 31; d++) {
                suma += porDia[d];
                acumulado[d] += suma / total;
            }
            meses++;
        }
        if (meses === 0) return null;
        return acumulado.map(x => x / meses);
    }

    /**
     * Qué parte del mes ya ha pasado al llegar a `diaCorte`, según una curva
     * (o según los días si no hay curva)
     */
    fraccionMes(curva, mes, diaCorte) {
        const dias = PrediccionService.diasDelMes(mes);
        if (diaCorte <= 0) return 0;
        if (diaCorte >= dias) return 1;
        if (curva) return Math.min(1, Math.max(0, curva[diaCorte]));
        return diaCorte / dias;
    }

    /**
     * Predicción de un mes con lo registrado hasta `diaCorte` (0 = mes sin empezar)
     */
    predecirMes(porMes, mes, diaCorte = 0, modelo = null) {
        modelo = modelo || this.ajustar(porMes, mes);
        const movimientos = (porMes.get(mes) || []).filter(m => m.dia <= diaCorte);
        const real = this.desglosar(movimientos, modelo.recurrentes, modelo.umbralExtra);
        const fGasto = this.fraccionMes(modelo.curvaGasto, mes, diaCorte);
        const fIngreso = this.fraccionMes(modelo.curvaIngreso, mes, diaCorte);
        const fDias = this.fraccionMes(null, mes, diaCorte);

        // Fijos: lo ya cobrado/pagado + lo que falta por llegar
        const clavesVistas = new Set(movimientos.map(m => m.clave));
        const fijos = [...modelo.fijos.values()].map(fijo => {
            const registrado = movimientos
                .filter(m => m.clave === fijo.clave)
                .reduce((s, m) => s + m.importe, 0);
            return {
                concepto: fijo.concepto,
                categoria: fijo.categoria,
                tipo: fijo.esperado > 0 ? 'ingreso' : 'gasto',
                esperado: PrediccionService.redondear(Math.abs(fijo.esperado)),
                registrado: PrediccionService.redondear(Math.abs(registrado)),
                pendiente: !clavesVistas.has(fijo.clave),
                diaHabitual: fijo.dia
            };
        }).sort((a, b) => b.esperado - a.esperado);

        const pendienteFijo = (tipo) => fijos
            .filter(x => x.tipo === tipo && x.pendiente)
            .reduce((s, x) => s + x.esperado, 0);

        // Si lo identificado se queda muy por debajo de lo que se cobra normalmente
        // (cambio de trabajo), se espera la diferencia como ingreso sin identificar
        const ingresoIdentificado = [...modelo.fijos.values()]
            .filter(x => x.esperado > 0).reduce((s, x) => s + x.esperado, 0) + modelo.baseIngresoVariable;
        const faltaPorIdentificar = ingresoIdentificado < modelo.ingresoHabitual * 0.6
            ? Math.max(0, modelo.ingresoHabitual - ingresoIdentificado - real.ingresos.variables)
            : 0;

        const restante = 1 - fGasto;
        const ingresos = {
            fijos: real.ingresos.fijos + pendienteFijo('ingreso'),
            variables: real.ingresos.variables + modelo.baseIngresoVariable * (1 - fIngreso) + faltaPorIdentificar,
            extraordinarios: real.ingresos.extraordinarios
        };
        const gastos = {
            fijos: real.gastos.fijos + pendienteFijo('gasto'),
            variables: real.gastos.variables + modelo.baseGastoVariable * restante,
            extraordinarios: real.gastos.extraordinarios + modelo.extraEsperado * (1 - fDias)
        };
        const totalIngresos = ingresos.fijos + ingresos.variables + ingresos.extraordinarios;
        const totalGastos = gastos.fijos + gastos.variables + gastos.extraordinarios;

        // Categorías de gasto: fijos esperados + variable esperado + extraordinarios reales
        const categorias = {};
        const sumar = (cat, campo, valor) => {
            if (!categorias[cat]) categorias[cat] = { categoria: cat, prediccion: 0, real: 0 };
            categorias[cat][campo] += valor;
        };
        for (const fijo of fijos.filter(x => x.tipo === 'gasto')) {
            sumar(fijo.categoria, 'prediccion', fijo.pendiente ? fijo.esperado : fijo.registrado);
        }
        for (const [cat, base] of Object.entries(modelo.variablePorCategoria)) {
            sumar(cat, 'prediccion', (real.categoriasVariables[cat] || 0) + base * restante);
        }
        for (const [cat, valor] of Object.entries(real.categoriasVariables)) {
            if (!modelo.variablePorCategoria[cat]) sumar(cat, 'prediccion', valor);
        }
        for (const mov of real.extraordinarios.filter(m => m.importe < 0)) {
            sumar(mov.categoria, 'prediccion', Math.abs(mov.importe));
        }
        for (const mov of movimientos.filter(m => m.importe < 0)) {
            sumar(mov.categoria, 'real', Math.abs(mov.importe));
        }

        return {
            modelo,
            fraccion: fDias,
            real,
            fijos,
            ingresos,
            gastos,
            totalIngresos,
            totalGastos,
            ahorro: totalIngresos - totalGastos,
            categorias: Object.values(categorias)
                .map(c => ({
                    categoria: c.categoria,
                    prediccion: PrediccionService.redondear(c.prediccion),
                    real: PrediccionService.redondear(c.real)
                }))
                .filter(c => c.prediccion > 0.5 || c.real > 0.5)
                .sort((a, b) => b.prediccion - a.prediccion)
        };
    }

    /**
     * Ahorro real de un mes completo
     */
    static ahorroReal(movimientos) {
        let ingresos = 0, gastos = 0;
        for (const m of movimientos || []) {
            if (m.importe > 0) ingresos += m.importe; else gastos += -m.importe;
        }
        return { ingresos, gastos, ahorro: ingresos - gastos };
    }

    /**
     * Prueba hacia atrás: predecir cada mes pasado solo con los anteriores
     */
    probarHaciaAtras(porMes, mesObjetivo) {
        const meses = [...porMes.keys()].filter(m => m < mesObjetivo).sort();
        const resultados = [];
        for (let i = 0; i < meses.length; i++) {
            const mes = meses[i];
            const real = PrediccionService.ahorroReal(porMes.get(mes));
            const fila = { mes, ...real, prediccion: null, error: null };
            if (i >= MIN_MESES_PRUEBA) {
                const pred = this.predecirMes(porMes, mes, 0);
                fila.prediccion = pred.ahorro;
                fila.prediccionIngresos = pred.totalIngresos;
                fila.prediccionGastos = pred.totalGastos;
                fila.error = real.ahorro - pred.ahorro;
            }
            resultados.push(fila);
        }
        return resultados;
    }

    // ==========================================
    // API PÚBLICA
    // ==========================================

    /**
     * @param {Array} transacciones - todas las transacciones
     * @param {object} [opciones]
     * @param {string} [opciones.mes]   - 'YYYY-MM', por defecto el mes actual
     * @param {string} [opciones.corte] - 'YYYY-MM-DD' hasta donde contar lo registrado
     * @param {Date}   [opciones.hoy]
     */
    calcular(transacciones, { mes = null, corte = null, hoy = new Date() } = {}) {
        const R = PrediccionService.redondear;
        const mesObjetivo = mes || PrediccionService.mesActual(hoy);
        const porMes = this.prepararMovimientos(transacciones);
        const diasMes = PrediccionService.diasDelMes(mesObjetivo);
        const avisos = [];

        const fechas = transacciones.map(t => String(t.fecha).slice(0, 10)).sort();
        const ultimaFecha = fechas[fechas.length - 1] || null;
        const delMes = (porMes.get(mesObjetivo) || []).map(m => m.fecha).sort();

        // Hasta qué día tenemos datos del mes objetivo
        let diaCorte;
        if (corte) {
            diaCorte = PrediccionService.claveMes(corte) === mesObjetivo ? Number(corte.slice(8, 10))
                : (corte > mesObjetivo ? diasMes : 0);
        } else if (mesObjetivo < PrediccionService.mesActual(hoy)) {
            diaCorte = diasMes;
        } else {
            diaCorte = delMes.length ? Number(delMes[delMes.length - 1].slice(8, 10)) : 0;
        }

        const modelo = this.ajustar(porMes, mesObjetivo);
        const pred = this.predecirMes(porMes, mesObjetivo, diaCorte, modelo);
        const historico = this.probarHaciaAtras(porMes, mesObjetivo);
        const inversion = PrediccionService.inversionPorMes(transacciones);

        // Intervalo a partir de los errores pasados, más estrecho cuanto más avanzado el mes
        const errores = historico.filter(h => h.error !== null).map(h => h.error);
        let intervalo = null;
        let precision = null;
        if (errores.length >= 4) {
            const restante = 1 - pred.fraccion;
            const p10 = PrediccionService.percentil(errores, 0.1) * restante;
            const p90 = PrediccionService.percentil(errores, 0.9) * restante;
            intervalo = { p10: R(pred.ahorro + p10), p90: R(pred.ahorro + p90) };

            const pIni10 = PrediccionService.percentil(errores, 0.1);
            const pIni90 = PrediccionService.percentil(errores, 0.9);
            const probados = historico.filter(h => h.error !== null);
            const dentro = probados.filter(h => h.error >= pIni10 && h.error <= pIni90).length;
            const mae = errores.reduce((s, e) => s + Math.abs(e), 0) / errores.length;
            const medianaError = PrediccionService.mediana(errores.map(Math.abs));
            precision = {
                mesesProbados: errores.length,
                errorMedio: R(mae),
                errorMediano: R(medianaError),
                sesgo: R(errores.reduce((a, b) => a + b, 0) / errores.length),
                dentroIntervalo: R((dentro / errores.length) * 100)
            };
        } else {
            avisos.push('Todavía no hay meses suficientes para medir el error de la predicción; no se muestra intervalo.');
        }

        // Avisos sobre la calidad de los datos
        if (modelo.mesesConDatos.length < MIN_MESES_FIABLE) {
            avisos.push(`Solo hay ${modelo.mesesConDatos.length} meses de historia en el último año; la predicción es poco fiable.`);
        }
        if (mesObjetivo >= PrediccionService.mesActual(hoy) && delMes.length === 0) {
            avisos.push(`No hay movimientos de este mes todavía${ultimaFecha ? ` (el último es del ${ultimaFecha})` : ''}. Importa el extracto para afinar la predicción.`);
        }
        const mesAnterior = PrediccionService.desplazarMes(mesObjetivo, -1);
        const ultimoDelAnterior = (porMes.get(mesAnterior) || []).map(m => m.dia).sort((a, b) => b - a)[0];
        if (ultimoDelAnterior !== undefined && ultimoDelAnterior < PrediccionService.diasDelMes(mesAnterior) - 7
            && delMes.length === 0) {
            avisos.push(`El mes anterior parece incompleto: el último movimiento es del día ${ultimoDelAnterior}.`);
        }
        const recuentos = modelo.mesesConDatos.map(m => (porMes.get(m) || []).length);
        const medianaRecuento = PrediccionService.mediana(recuentos);
        const mesesFlojos = modelo.mesesConDatos.filter(m => (porMes.get(m) || []).length < medianaRecuento * 0.5);
        if (mesesFlojos.length) {
            avisos.push(`Meses con muy pocos movimientos (¿falta algún extracto?): ${mesesFlojos.join(', ')}.`);
        }

        const extraordinariosMes = pred.real.extraordinarios.map(m => ({
            fecha: m.fecha, concepto: m.concepto, importe: R(m.importe), categoria: m.categoria
        }));

        return {
            mes: mesObjetivo,
            diaCorte,
            diasMes,
            fraccionMes: R(pred.fraccion),
            prediccion: {
                ingresos: R(pred.totalIngresos),
                gastos: R(pred.totalGastos),
                ahorro: R(pred.ahorro),
                intervalo
            },
            real: {
                ingresos: R(pred.real.ingresos.fijos + pred.real.ingresos.variables + pred.real.ingresos.extraordinarios),
                gastos: R(pred.real.gastos.fijos + pred.real.gastos.variables + pred.real.gastos.extraordinarios),
                inversion: R(inversion[mesObjetivo] || 0)
            },
            desglose: {
                ingresos: { fijos: R(pred.ingresos.fijos), variables: R(pred.ingresos.variables), extraordinarios: R(pred.ingresos.extraordinarios) },
                gastos: { fijos: R(pred.gastos.fijos), variables: R(pred.gastos.variables), extraordinarios: R(pred.gastos.extraordinarios) }
            },
            fijos: pred.fijos,
            extraordinarios: extraordinariosMes,
            umbralExtraordinario: R(modelo.umbralExtra),
            categorias: pred.categorias,
            historico: historico.map(h => ({
                mes: h.mes,
                ingresos: R(h.ingresos),
                gastos: R(h.gastos),
                ahorro: R(h.ahorro),
                inversion: R(inversion[h.mes] || 0),
                prediccion: h.prediccion === null ? null : R(h.prediccion),
                error: h.error === null ? null : R(h.error)
            })),
            precision,
            mesesAnalizados: modelo.mesesConDatos.length,
            avisos,
            metodo: 'Fijos detectados + mediana del gasto variable + proyección del mes en curso'
        };
    }
}

module.exports = PrediccionService;
