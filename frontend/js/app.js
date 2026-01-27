/**
 * AppBanco v1.5 - Frontend JavaScript
 * Gestión de la interfaz de usuario
 */

// URL base de la API
const API_URL = '/api';

// Estado de la aplicación
const AppState = {
    transacciones: [],
    categorias: [],
    archivoSeleccionado: null,
    ordenFecha: 'DESC' // 'DESC' = más recientes primero, 'ASC' = más antiguas primero
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AppBanco v1.5 iniciado');
    
    inicializarTabs();
    inicializarEventos();
    cargarDatosIniciales();
});

/**
 * Cargar datos iniciales
 */
async function cargarDatosIniciales() {
    try {
        await Promise.all([
            cargarTransacciones(),
            cargarCategorias(),
            cargarEstadisticas()
        ]);
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
    }
}

// ==========================================
// GESTIÓN DE TABS
// ==========================================

function inicializarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todos los tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Activar tab seleccionado
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
            
            // Recargar datos si es necesario
            if (targetId === 'dashboard') {
                cargarEstadisticas();
            } else if (targetId === 'transacciones') {
                cargarTransacciones();
            } else if (targetId === 'graficas') {
                cargarGraficas();
            }
        });
    });
}

// ==========================================
// INICIALIZAR EVENTOS
// ==========================================

function inicializarEventos() {
    // Filtros
    document.getElementById('btn-filtrar').addEventListener('click', aplicarFiltros);
    document.getElementById('btn-limpiar').addEventListener('click', limpiarFiltros);
    
    // Ordenación por fecha - click en cabecera
    document.querySelector('th.sortable[data-sort="fecha"]')?.addEventListener('click', toggleOrdenFecha);
    
    // Ordenación por fecha - selector dropdown
    document.getElementById('filtro-orden').addEventListener('change', (e) => {
        AppState.ordenFecha = e.target.value;
        aplicarFiltros();
    });
    
    // Formulario nueva transacción
    document.getElementById('form-transaccion').addEventListener('submit', crearTransaccion);
    
    // Importación
    document.getElementById('btn-seleccionar').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', manejarSeleccionArchivo);
    document.getElementById('btn-cancelar-archivo').addEventListener('click', cancelarArchivo);
    document.getElementById('btn-importar').addEventListener('click', importarTransacciones);
    
    // Drag & Drop
    const uploadArea = document.getElementById('upload-area');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', manejarDrop);
    
    // Modal
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-edicion').addEventListener('click', cerrarModal);
    document.getElementById('form-editar').addEventListener('submit', guardarEdicion);
    
    // Clasificación automática en tiempo real
    document.getElementById('input-concepto').addEventListener('blur', async (e) => {
        const concepto = e.target.value;
        const selectCategoria = document.getElementById('input-categoria');
        
        if (concepto && !selectCategoria.value) {
            try {
                const response = await fetch(`${API_URL}/clasificar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ concepto })
                });
                const data = await response.json();
                if (data.success) {
                    selectCategoria.value = data.data.categoria;
                }
            } catch (error) {
                console.error('Error al clasificar:', error);
            }
        }
    });

    // Establecer fecha actual por defecto
    document.getElementById('input-fecha').valueAsDate = new Date();
}

// ==========================================
// API - TRANSACCIONES
// ==========================================

async function cargarTransacciones(filtros = {}) {
    try {
        const params = new URLSearchParams();
        if (filtros.categoria) params.append('categoria', filtros.categoria);
        if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
        if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
        if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
        
        // Añadir ordenación
        const orden = filtros.orden || AppState.ordenFecha;
        params.append('orden', orden);
        
        const response = await fetch(`${API_URL}/transacciones?${params}`);
        const data = await response.json();
        
        if (data.success) {
            AppState.transacciones = data.data;
            renderizarTransacciones(data.data);
            actualizarIndicadorOrden();
        }
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
    }
}

async function crearTransaccion(e) {
    e.preventDefault();
    
    const datos = {
        fecha: document.getElementById('input-fecha').value,
        concepto: document.getElementById('input-concepto').value,
        importe: parseFloat(document.getElementById('input-importe').value),
        categoria: document.getElementById('input-categoria').value || undefined,
        notas: document.getElementById('input-notas').value || undefined
    };
    
    try {
        const response = await fetch(`${API_URL}/transacciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('✅ Transacción creada correctamente');
            e.target.reset();
            document.getElementById('input-fecha').valueAsDate = new Date();
            cargarTransacciones();
            cargarEstadisticas();
        } else {
            mostrarNotificacion('❌ Error: ' + data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al crear transacción', 'error');
    }
}

async function eliminarTransaccion(id) {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;
    
    try {
        const response = await fetch(`${API_URL}/transacciones/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('✅ Transacción eliminada');
            cargarTransacciones();
            cargarEstadisticas();
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al eliminar', 'error');
    }
}

async function guardarEdicion(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const datos = {
        fecha: document.getElementById('edit-fecha').value,
        concepto: document.getElementById('edit-concepto').value,
        importe: parseFloat(document.getElementById('edit-importe').value),
        categoria: document.getElementById('edit-categoria').value
    };
    
    try {
        const response = await fetch(`${API_URL}/transacciones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('✅ Transacción actualizada');
            cerrarModal();
            cargarTransacciones();
            cargarEstadisticas();
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al actualizar', 'error');
    }
}

// ==========================================
// API - ESTADÍSTICAS
// ==========================================

async function cargarEstadisticas() {
    try {
        const [balanceRes, categoriasRes, estadoRes] = await Promise.all([
            fetch(`${API_URL}/estadisticas/balance`),
            fetch(`${API_URL}/estadisticas/categorias`),
            fetch(`${API_URL}/estado`)
        ]);
        
        const balance = await balanceRes.json();
        const categorias = await categoriasRes.json();
        const estado = await estadoRes.json();
        
        if (balance.success) {
            document.getElementById('total-ingresos').textContent = formatearMoneda(balance.data.ingresos);
            document.getElementById('total-gastos').textContent = formatearMoneda(balance.data.gastos);
            document.getElementById('balance-total').textContent = formatearMoneda(balance.data.balance);
        }
        
        if (categorias.success) {
            renderizarCategorias(categorias.data);
        }
        
        if (estado.success) {
            document.getElementById('total-transacciones').textContent = estado.data.estadisticas.totalTransacciones;
            document.getElementById('categorias-count').textContent = estado.data.estadisticas.categorias.length;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

async function cargarCategorias() {
    try {
        const response = await fetch(`${API_URL}/categorias`);
        const data = await response.json();
        
        if (data.success) {
            AppState.categorias = data.data;
        }
    } catch (error) {
        console.error('Error al cargar categorías:', error);
    }
}

// ==========================================
// IMPORTACIÓN
// ==========================================

function manejarSeleccionArchivo(e) {
    const archivo = e.target.files[0];
    if (archivo) {
        seleccionarArchivo(archivo);
    }
}

function manejarDrop(e) {
    e.preventDefault();
    document.getElementById('upload-area').classList.remove('dragover');
    
    const archivo = e.dataTransfer.files[0];
    if (archivo) {
        seleccionarArchivo(archivo);
    }
}

function seleccionarArchivo(archivo) {
    const extensionesValidas = ['.csv', '.json'];
    const extension = archivo.name.substring(archivo.name.lastIndexOf('.')).toLowerCase();
    
    if (!extensionesValidas.includes(extension)) {
        mostrarNotificacion('❌ Formato no válido. Use CSV o JSON', 'error');
        return;
    }
    
    AppState.archivoSeleccionado = archivo;
    document.getElementById('file-name').textContent = archivo.name;
    document.getElementById('file-info').classList.remove('hidden');
    document.getElementById('btn-importar').disabled = false;
}

function cancelarArchivo() {
    AppState.archivoSeleccionado = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-info').classList.add('hidden');
    document.getElementById('btn-importar').disabled = true;
}

async function importarTransacciones() {
    if (!AppState.archivoSeleccionado) return;
    
    const formData = new FormData();
    formData.append('archivo', AppState.archivoSeleccionado);
    
    const resultadoDiv = document.getElementById('resultado-importacion');
    resultadoDiv.classList.remove('hidden', 'success', 'error');
    resultadoDiv.textContent = '⏳ Importando...';
    
    try {
        const response = await fetch(`${API_URL}/transacciones/importar`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultadoDiv.classList.add('success');
            resultadoDiv.innerHTML = `
                ✅ <strong>Importación completada</strong><br>
                Total: ${data.data.total} | Exitosas: ${data.data.exitosas} | Fallidas: ${data.data.fallidas}
            `;
            cancelarArchivo();
            cargarTransacciones();
            cargarEstadisticas();
        } else {
            resultadoDiv.classList.add('error');
            resultadoDiv.textContent = '❌ Error: ' + data.error;
        }
    } catch (error) {
        resultadoDiv.classList.add('error');
        resultadoDiv.textContent = '❌ Error al importar archivo';
    }
}

// ==========================================
// FILTROS
// ==========================================

function aplicarFiltros() {
    const filtros = {
        busqueda: document.getElementById('filtro-busqueda').value,
        categoria: document.getElementById('filtro-categoria').value,
        fechaInicio: document.getElementById('filtro-fecha-inicio').value,
        fechaFin: document.getElementById('filtro-fecha-fin').value,
        orden: document.getElementById('filtro-orden').value
    };
    
    // Actualizar estado global del orden
    AppState.ordenFecha = filtros.orden;
    
    cargarTransacciones(filtros);
}

function limpiarFiltros() {
    document.getElementById('filtro-busqueda').value = '';
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-fecha-inicio').value = '';
    document.getElementById('filtro-fecha-fin').value = '';
    document.getElementById('filtro-orden').value = 'DESC';
    AppState.ordenFecha = 'DESC';
    
    cargarTransacciones();
}

/**
 * Cambiar orden de fecha (toggle)
 */
function toggleOrdenFecha() {
    AppState.ordenFecha = AppState.ordenFecha === 'DESC' ? 'ASC' : 'DESC';
    document.getElementById('filtro-orden').value = AppState.ordenFecha;
    aplicarFiltros();
}

/**
 * Actualizar indicador visual del orden
 */
function actualizarIndicadorOrden() {
    const indicator = document.getElementById('sort-indicator');
    if (indicator) {
        indicator.textContent = AppState.ordenFecha === 'DESC' ? '▼' : '▲';
    }
}

// ==========================================
// RENDERIZADO
// ==========================================

function renderizarTransacciones(transacciones) {
    const tbody = document.getElementById('tabla-body');
    
    if (transacciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No hay transacciones para mostrar
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transacciones.map(t => `
        <tr>
            <td>${formatearFecha(t.fecha)}</td>
            <td>${escapeHtml(t.concepto)}</td>
            <td>
                <span class="categoria-badge" data-cat="${t.categoria}">${t.categoria}</span>
            </td>
            <td class="importe ${t.importe >= 0 ? 'positivo' : 'negativo'}">
                ${formatearMoneda(t.importe)}
            </td>
            <td>
                <button class="btn btn-icon" onclick="abrirModalEditar(${t.id})" title="Editar">✏️</button>
                <button class="btn btn-icon" onclick="eliminarTransaccion(${t.id})" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderizarCategorias(categorias) {
    const container = document.getElementById('categorias-resumen');
    
    if (categorias.length === 0) {
        container.innerHTML = '<p class="info-text">No hay datos de categorías</p>';
        return;
    }
    
    container.innerHTML = categorias.map(cat => `
        <div class="categoria-item">
            <span class="nombre">${cat.categoria}</span>
            <span class="total ${cat.total >= 0 ? 'positivo' : 'negativo'}">
                ${formatearMoneda(cat.total)} (${cat.cantidad})
            </span>
        </div>
    `).join('');
}

// ==========================================
// MODAL
// ==========================================

async function abrirModalEditar(id) {
    try {
        const response = await fetch(`${API_URL}/transacciones/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const t = data.data;
            document.getElementById('edit-id').value = t.id;
            document.getElementById('edit-fecha').value = t.fecha;
            document.getElementById('edit-concepto').value = t.concepto;
            document.getElementById('edit-importe').value = t.importe;
            document.getElementById('edit-categoria').value = t.categoria;
            
            document.getElementById('modal-editar').classList.remove('hidden');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al cargar transacción', 'error');
    }
}

function cerrarModal() {
    document.getElementById('modal-editar').classList.add('hidden');
}

// ==========================================
// UTILIDADES
// ==========================================

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(valor || 0);
}

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    // Notificación simple con alert (se puede mejorar con un toast)
    console.log(mensaje);
    
    // Crear toast temporal
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${tipo === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Estilos de animación para toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==========================================
// GRÁFICAS
// ==========================================

// Estado de las gráficas
const GraficasState = {
    charts: {},
    datosGraficas: null,
    añoSeleccionado: null
};

// Colores para categorías - todos distintos y bien diferenciados
const COLORES_CATEGORIAS = {
    'Inversiones': { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },       // Azul
    'Coche': { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },           // Naranja/Ámbar
    'Alimentación': { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },    // Verde esmeralda
    'Gastos recurrentes': { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' }, // Púrpura
    'Ocio': { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' },            // Rosa/Fucsia
    'Ingresos': { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },          // Verde claro
    'Otros': { bg: 'rgba(107, 114, 128, 0.7)', border: 'rgb(107, 114, 128)' }          // Gris
};

const NOMBRES_MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Inicializar eventos de gráficas
 */
function inicializarEventosGraficas() {
    document.getElementById('btn-actualizar-graficas')?.addEventListener('click', cargarGraficas);
    document.getElementById('graficas-año')?.addEventListener('change', (e) => {
        GraficasState.añoSeleccionado = e.target.value;
        cargarGraficas();
    });
}

// Llamar al inicializar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarEventosGraficas, 100);
});

/**
 * Cargar todos los datos y renderizar gráficas
 */
async function cargarGraficas() {
    try {
        // Obtener todas las transacciones
        const response = await fetch(`${API_URL}/transacciones`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Error al cargar transacciones para gráficas');
            return;
        }
        
        const transacciones = data.data;
        
        // Procesar datos para gráficas
        GraficasState.datosGraficas = procesarDatosGraficas(transacciones);
        
        // Llenar selector de años
        llenarSelectorAños(GraficasState.datosGraficas.años);
        
        // Filtrar por año si hay uno seleccionado
        const año = GraficasState.añoSeleccionado || GraficasState.datosGraficas.años[0];
        const datosFiltrados = filtrarPorAño(transacciones, año);
        
        // Renderizar todas las gráficas
        renderizarChartBalanceMensual(datosFiltrados);
        renderizarChartCategoriasMes(datosFiltrados);
        renderizarChartDistribucion(datosFiltrados);
        renderizarChartAhorroAcumulado(datosFiltrados);
        renderizarTablaResumenMensual(datosFiltrados);
        
        // Llenar selector de meses y configurar visor
        llenarSelectorMeses(datosFiltrados);
        
    } catch (error) {
        console.error('Error al cargar gráficas:', error);
    }
}

/**
 * Procesar datos de transacciones para gráficas
 */
function procesarDatosGraficas(transacciones) {
    const años = [...new Set(transacciones.map(t => new Date(t.fecha).getFullYear()))].sort((a, b) => b - a);
    
    return {
        años,
        transacciones
    };
}

/**
 * Llenar selector de años
 */
function llenarSelectorAños(años) {
    const select = document.getElementById('graficas-año');
    if (!select) return;
    
    const valorActual = GraficasState.añoSeleccionado;
    
    select.innerHTML = años.map(año => 
        `<option value="${año}" ${año == valorActual ? 'selected' : ''}>${año}</option>`
    ).join('');
    
    if (!GraficasState.añoSeleccionado && años.length > 0) {
        GraficasState.añoSeleccionado = años[0];
    }
}

/**
 * Filtrar transacciones por año
 */
function filtrarPorAño(transacciones, año) {
    return transacciones.filter(t => new Date(t.fecha).getFullYear() == año);
}

/**
 * Agrupar transacciones por mes
 */
function agruparPorMes(transacciones) {
    const meses = {};
    
    transacciones.forEach(t => {
        const fecha = new Date(t.fecha);
        const mes = fecha.getMonth(); // 0-11
        
        if (!meses[mes]) {
            meses[mes] = {
                mes,
                nombre: NOMBRES_MESES[mes],
                ingresos: 0,
                gastos: 0,
                inversion: 0,
                transacciones: []
            };
        }
        
        meses[mes].transacciones.push(t);
        
        // Clasificar por tipo (Inversión se separa)
        if (t.categoria === 'Inversiones') {
            meses[mes].inversion += t.importe;
        } else if (t.importe > 0) {
            meses[mes].ingresos += t.importe;
        } else {
            meses[mes].gastos += Math.abs(t.importe);
        }
    });
    
    // Convertir a array ordenado por mes
    return Object.values(meses).sort((a, b) => a.mes - b.mes);
}

/**
 * Agrupar por categoría y mes
 */
function agruparPorCategoriaMes(transacciones) {
    const datos = {};
    const categorias = new Set();
    const mesesSet = new Set();
    
    transacciones.forEach(t => {
        // Solo gastos (importe negativo) y excluyendo Ingresos
        if (t.importe >= 0 || t.categoria === 'Ingresos') return;
        
        const mes = new Date(t.fecha).getMonth();
        categorias.add(t.categoria);
        mesesSet.add(mes);
        
        const key = `${t.categoria}-${mes}`;
        if (!datos[key]) {
            datos[key] = { categoria: t.categoria, mes, total: 0 };
        }
        datos[key].total += Math.abs(t.importe);
    });
    
    const meses = [...mesesSet].sort((a, b) => a - b);
    
    return {
        categorias: [...categorias],
        meses,
        datos
    };
}

/**
 * Destruir gráfica existente si existe
 */
function destruirChart(id) {
    if (GraficasState.charts[id]) {
        GraficasState.charts[id].destroy();
        GraficasState.charts[id] = null;
    }
}

/**
 * Gráfica: Balance Mensual (Gastos/Ingresos/Ahorro)
 */
function renderizarChartBalanceMensual(transacciones) {
    const ctx = document.getElementById('chart-balance-mensual');
    if (!ctx) return;
    
    destruirChart('balanceMensual');
    
    const datosMes = agruparPorMes(transacciones);
    const labels = datosMes.map(m => m.nombre);
    
    // Calcular ahorro (ingresos - gastos, sin inversión)
    const ahorros = datosMes.map(m => m.ingresos - m.gastos);
    
    // Totales para resumen
    const totalIngresos = datosMes.reduce((sum, m) => sum + m.ingresos, 0);
    const totalGastos = datosMes.reduce((sum, m) => sum + m.gastos, 0);
    const totalAhorro = totalIngresos - totalGastos;
    
    // Mostrar resumen
    const resumenDiv = document.getElementById('resumen-balance-mensual');
    if (resumenDiv) {
        resumenDiv.innerHTML = `
            <div class="total-item">
                <span class="total-label">Total Ingresos</span>
                <span class="total-value ingresos">${formatearMoneda(totalIngresos)}</span>
            </div>
            <div class="total-item">
                <span class="total-label">Total Gastos</span>
                <span class="total-value gastos">${formatearMoneda(totalGastos)}</span>
            </div>
            <div class="total-item">
                <span class="total-label">Ahorro Total</span>
                <span class="total-value ahorro">${formatearMoneda(totalAhorro)}</span>
            </div>
        `;
    }
    
    GraficasState.charts.balanceMensual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: datosMes.map(m => m.ingresos),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                },
                {
                    label: 'Gastos',
                    data: datosMes.map(m => m.gastos),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                },
                {
                    label: 'Ahorro',
                    data: ahorros,
                    type: 'line',
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatearMoneda(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatearMoneda(value)
                    }
                }
            }
        }
    });
}

/**
 * Gráfica: Gastos por Categoría y Mes (Barras apiladas)
 */
function renderizarChartCategoriasMes(transacciones) {
    const ctx = document.getElementById('chart-categorias-mes');
    if (!ctx) return;
    
    destruirChart('categoriasMes');
    
    const { categorias, meses, datos } = agruparPorCategoriaMes(transacciones);
    const labels = meses.map(m => NOMBRES_MESES[m]);
    
    const datasets = categorias.map(cat => {
        const color = COLORES_CATEGORIAS[cat] || { bg: 'rgba(107, 114, 128, 0.7)', border: 'rgb(107, 114, 128)' };
        
        return {
            label: cat,
            data: meses.map(mes => {
                const key = `${cat}-${mes}`;
                return datos[key]?.total || 0;
            }),
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1
        };
    });
    
    GraficasState.charts.categoriasMes = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatearMoneda(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatearMoneda(value)
                    }
                }
            }
        }
    });
}

/**
 * Gráfica: Distribución de Gastos (Donut)
 */
function renderizarChartDistribucion(transacciones) {
    const ctx = document.getElementById('chart-distribucion');
    if (!ctx) return;
    
    destruirChart('distribucion');
    
    // Agrupar gastos por categoría (excluyendo Ingresos)
    const gastosPorCategoria = {};
    
    transacciones.forEach(t => {
        if (t.importe >= 0 || t.categoria === 'Ingresos') return;
        
        if (!gastosPorCategoria[t.categoria]) {
            gastosPorCategoria[t.categoria] = 0;
        }
        gastosPorCategoria[t.categoria] += Math.abs(t.importe);
    });
    
    const categorias = Object.keys(gastosPorCategoria);
    const valores = Object.values(gastosPorCategoria);
    const colores = categorias.map(cat => 
        COLORES_CATEGORIAS[cat]?.bg || 'rgba(107, 114, 128, 0.7)'
    );
    const bordes = categorias.map(cat => 
        COLORES_CATEGORIAS[cat]?.border || 'rgb(107, 114, 128)'
    );
    
    GraficasState.charts.distribucion = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categorias,
            datasets: [{
                data: valores,
                backgroundColor: colores,
                borderColor: bordes,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const porcentaje = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${formatearMoneda(context.raw)} (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Gráfica: Evolución del Ahorro Acumulado
 */
function renderizarChartAhorroAcumulado(transacciones) {
    const ctx = document.getElementById('chart-ahorro-acumulado');
    if (!ctx) return;
    
    destruirChart('ahorroAcumulado');
    
    const datosMes = agruparPorMes(transacciones);
    const labels = datosMes.map(m => m.nombre);
    
    // Calcular ahorro acumulado
    let acumulado = 0;
    const ahorroAcumulado = datosMes.map(m => {
        acumulado += (m.ingresos - m.gastos);
        return acumulado;
    });
    
    GraficasState.charts.ahorroAcumulado = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ahorro Acumulado',
                data: ahorroAcumulado,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Acumulado: ' + formatearMoneda(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatearMoneda(value)
                    }
                }
            }
        }
    });
}

/**
 * Renderizar tabla resumen mensual
 */
function renderizarTablaResumenMensual(transacciones) {
    const tbody = document.getElementById('tabla-resumen-mensual');
    if (!tbody) return;
    
    const datosMes = agruparPorMes(transacciones);
    
    // Totales
    let totalIngresos = 0;
    let totalGastos = 0;
    let totalAhorro = 0;
    let totalInversion = 0;
    
    const filas = datosMes.map(m => {
        const ahorro = m.ingresos - m.gastos;
        totalIngresos += m.ingresos;
        totalGastos += m.gastos;
        totalAhorro += ahorro;
        totalInversion += m.inversion;
        
        return `
            <tr>
                <td>${m.nombre}</td>
                <td class="positivo">${formatearMoneda(m.ingresos)}</td>
                <td class="negativo">${formatearMoneda(m.gastos)}</td>
                <td class="${ahorro >= 0 ? 'positivo' : 'negativo'}">${formatearMoneda(ahorro)}</td>
                <td class="inversion">${formatearMoneda(Math.abs(m.inversion))}</td>
            </tr>
        `;
    }).join('');
    
    // Fila de totales
    const filaTotales = `
        <tr style="font-weight: bold; background: var(--bg-color);">
            <td><strong>TOTAL</strong></td>
            <td class="positivo">${formatearMoneda(totalIngresos)}</td>
            <td class="negativo">${formatearMoneda(totalGastos)}</td>
            <td class="${totalAhorro >= 0 ? 'positivo' : 'negativo'}">${formatearMoneda(totalAhorro)}</td>
            <td class="inversion">${formatearMoneda(Math.abs(totalInversion))}</td>
        </tr>
    `;
    
    tbody.innerHTML = filas + filaTotales;
}

/**
 * Llenar selector de meses disponibles
 */
function llenarSelectorMeses(transacciones) {
    const select = document.getElementById('select-mes-detalle');
    if (!select) return;
    
    // Obtener meses disponibles
    const mesesDisponibles = new Map();
    
    transacciones.forEach(t => {
        const fecha = new Date(t.fecha);
        const mes = fecha.getMonth();
        const key = mes;
        
        if (!mesesDisponibles.has(key)) {
            mesesDisponibles.set(key, {
                mes,
                nombre: NOMBRES_MESES[mes],
                transacciones: []
            });
        }
        mesesDisponibles.get(key).transacciones.push(t);
    });
    
    // Ordenar por mes
    const mesesOrdenados = [...mesesDisponibles.values()].sort((a, b) => a.mes - b.mes);
    
    // Guardar en estado para uso posterior
    GraficasState.mesesDisponibles = mesesOrdenados;
    
    // Llenar select
    select.innerHTML = '<option value="">-- Seleccionar mes --</option>' + 
        mesesOrdenados.map(m => 
            `<option value="${m.mes}">${m.nombre} (${m.transacciones.length} transacciones)</option>`
        ).join('');
    
    // Limpiar contenedor y contador
    document.getElementById('transacciones-mes-container').innerHTML = 
        '<p class="info-text">Selecciona un mes para ver sus transacciones.</p>';
    document.getElementById('transacciones-mes-count').textContent = '';
    
    // Añadir evento de cambio
    select.onchange = (e) => {
        const mesSeleccionado = e.target.value;
        if (mesSeleccionado !== '') {
            mostrarTransaccionesMes(parseInt(mesSeleccionado));
        } else {
            document.getElementById('transacciones-mes-container').innerHTML = 
                '<p class="info-text">Selecciona un mes para ver sus transacciones.</p>';
            document.getElementById('transacciones-mes-count').textContent = '';
        }
    };
}

/**
 * Mostrar transacciones de un mes específico
 */
function mostrarTransaccionesMes(mesIndex) {
    const container = document.getElementById('transacciones-mes-container');
    const countSpan = document.getElementById('transacciones-mes-count');
    
    if (!container || !GraficasState.mesesDisponibles) return;
    
    const datosMes = GraficasState.mesesDisponibles.find(m => m.mes === mesIndex);
    
    if (!datosMes || datosMes.transacciones.length === 0) {
        container.innerHTML = '<p class="info-text">No hay transacciones para este mes.</p>';
        countSpan.textContent = '';
        return;
    }
    
    const transacciones = datosMes.transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Calcular totales del mes
    let ingresos = 0;
    let gastos = 0;
    let inversion = 0;
    
    transacciones.forEach(t => {
        if (t.categoria === 'Inversiones') {
            inversion += t.importe;
        } else if (t.importe > 0) {
            ingresos += t.importe;
        } else {
            gastos += Math.abs(t.importe);
        }
    });
    
    // Actualizar contador
    countSpan.textContent = `${transacciones.length} transacciones`;
    
    // Crear tabla de transacciones
    const tablaHTML = `
        <table class="tabla-transacciones-mes">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    <th>Importe</th>
                </tr>
            </thead>
            <tbody>
                ${transacciones.map(t => `
                    <tr>
                        <td>${formatearFecha(t.fecha)}</td>
                        <td>${escapeHtml(t.concepto)}</td>
                        <td><span class="categoria-badge" data-cat="${t.categoria}">${t.categoria}</span></td>
                        <td class="${t.importe >= 0 ? 'importe-positivo' : 'importe-negativo'}">
                            ${formatearMoneda(t.importe)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="transacciones-mes-resumen">
            <div class="resumen-item">
                <span class="resumen-label">Ingresos</span>
                <span class="resumen-value" style="color: var(--ingresos-color);">${formatearMoneda(ingresos)}</span>
            </div>
            <div class="resumen-item">
                <span class="resumen-label">Gastos</span>
                <span class="resumen-value" style="color: var(--gastos-color);">${formatearMoneda(gastos)}</span>
            </div>
            <div class="resumen-item">
                <span class="resumen-label">Ahorro</span>
                <span class="resumen-value" style="color: var(--primary-color);">${formatearMoneda(ingresos - gastos)}</span>
            </div>
            <div class="resumen-item">
                <span class="resumen-label">Inversión</span>
                <span class="resumen-value" style="color: #6366f1;">${formatearMoneda(Math.abs(inversion))}</span>
            </div>
        </div>
    `;
    
    container.innerHTML = tablaHTML;
}
