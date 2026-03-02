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
    
    inicializarTema();
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
// GESTIÓN DE TEMA (MODO CLARO/OSCURO)
// ==========================================

function inicializarTema() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    // Cargar tema guardado o usar preferencia del sistema
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    // Aplicar tema inicial
    document.documentElement.setAttribute('data-theme', currentTheme);
    actualizarIconoTema(currentTheme, themeIcon);
    
    // Evento de cambio de tema
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        actualizarIconoTema(newTheme, themeIcon);
        
        // Animar el cambio
        themeIcon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            themeIcon.style.transform = '';
        }, 300);
    });
    
    // Detectar cambios en la preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            actualizarIconoTema(newTheme, themeIcon);
        }
    });
}

function actualizarIconoTema(theme, iconElement) {
    iconElement.textContent = theme === 'dark' ? '☀️' : '🌙';
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
            } else if (targetId === 'prediccion') {
                cargarPrediccion();
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
            actualizarResumenFiltro(data.data);
        }
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
    }
}

/**
 * Actualizar resumen del filtro aplicado
 */
function actualizarResumenFiltro(transacciones) {
    const resumenDiv = document.getElementById('resumen-filtro');
    if (!resumenDiv) return;
    
    // Calcular totales
    let ingresos = 0;
    let gastos = 0;
    let inversion = 0;
    
    transacciones.forEach(t => {
        if (t.categoria === 'Inversiones') {
            //inversion += Math.abs(t.importe);
            inversion += t.importe;
        } else if (t.importe > 0) {
            ingresos += t.importe;
        } else {
            gastos += Math.abs(t.importe);
        }
    });
    
    const ahorro = ingresos - gastos;
    
    // Actualizar valores
    document.getElementById('filtro-total-ingresos').textContent = formatearMoneda(ingresos);
    document.getElementById('filtro-total-gastos').textContent = formatearMoneda(gastos);
    document.getElementById('filtro-total-ahorro').textContent = formatearMoneda(ahorro);
    document.getElementById('filtro-total-inversion').textContent = formatearMoneda(inversion);
    
    // Mostrar el resumen
    resumenDiv.classList.remove('hidden');
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
    const notasValue = document.getElementById('edit-notas').value.trim();
    const datos = {
        fecha: document.getElementById('edit-fecha').value,
        concepto: document.getElementById('edit-concepto').value,
        importe: parseFloat(document.getElementById('edit-importe').value),
        categoria: document.getElementById('edit-categoria').value,
        notas: notasValue || null
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
            <td>
                ${escapeHtml(t.concepto)}
                ${t.notas ? `<span title="${escapeHtml(t.notas)}" style="cursor: help; margin-left: 5px;">📝</span>` : ''}
            </td>
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
            document.getElementById('edit-notas').value = t.notas || '';
            
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
 * Obtener configuración responsive para Chart.js
 */
function getChartResponsiveConfig() {
    const isMobile = window.innerWidth < 500;
    const isTablet = window.innerWidth < 768;
    
    return {
        legend: {
            boxWidth: isMobile ? 10 : isTablet ? 15 : 20,
            padding: isMobile ? 6 : 10,
            fontSize: isMobile ? 10 : 12
        },
        axis: {
            fontSize: isMobile ? 9 : isTablet ? 10 : 11,
            maxRotation: isMobile ? 65 : 45,
            minRotation: isMobile ? 45 : 0
        },
        point: {
            radius: isMobile ? 3 : 5,
            hoverRadius: isMobile ? 5 : 7
        }
    };
}

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
    
    // Agregar opción "Todo" al principio
    const opcionTodo = `<option value="todo" ${valorActual === 'todo' ? 'selected' : ''}>Todo</option>`;
    const opcionesAños = años.map(año => 
        `<option value="${año}" ${año == valorActual ? 'selected' : ''}>${año}</option>`
    ).join('');
    
    select.innerHTML = opcionTodo + opcionesAños;
    
    if (!GraficasState.añoSeleccionado && años.length > 0) {
        GraficasState.añoSeleccionado = "todo";
    }
}

/**
 * Filtrar transacciones por año
 */
function filtrarPorAño(transacciones, año) {
    // Si el año es "todo", devolver todas las transacciones
    if (año === 'todo') {
        return transacciones;
    }
    return transacciones.filter(t => new Date(t.fecha).getFullYear() == año);
}

/**
 * Agrupar transacciones por mes
 */
function agruparPorMes(transacciones) {
    const meses = {};
    
    // Verificar si hay múltiples años en las transacciones
    const años = [...new Set(transacciones.map(t => new Date(t.fecha).getFullYear()))];
    const multipleAños = años.length > 1;
    
    transacciones.forEach(t => {
        const fecha = new Date(t.fecha);
        const mes = fecha.getMonth(); // 0-11
        const año = fecha.getFullYear();
        
        // Si hay múltiples años, usar clave mes-año, sino solo mes
        const key = multipleAños ? `${año}-${mes}` : mes;
        
        if (!meses[key]) {
            meses[key] = {
                mes,
                año,
                nombre: multipleAños ? `${NOMBRES_MESES[mes]} ${año}` : NOMBRES_MESES[mes],
                ingresos: 0,
                gastos: 0,
                inversion: 0,
                transacciones: []
            };
        }
        
        meses[key].transacciones.push(t);
        
        // Clasificar por tipo (Inversión se separa)
        if (t.categoria === 'Inversiones') {
            meses[key].inversion += t.importe;
        } else if (t.importe > 0) {
            meses[key].ingresos += t.importe;
        } else {
            meses[key].gastos += Math.abs(t.importe);
        }
    });
    
    // Convertir a array ordenado por año y mes
    return Object.values(meses).sort((a, b) => {
        if (multipleAños) {
            // Ordenar por año y luego por mes
            if (a.año !== b.año) return a.año - b.año;
            return a.mes - b.mes;
        }
        return a.mes - b.mes;
    });
}

/**
 * Agrupar por categoría y mes
 */
function agruparPorCategoriaMes(transacciones) {
    const datos = {};
    const categorias = new Set();
    const mesesSet = new Set();
    
    // Verificar si hay múltiples años
    const años = [...new Set(transacciones.map(t => new Date(t.fecha).getFullYear()))];
    const multipleAños = años.length > 1;
    
    transacciones.forEach(t => {
        // Excluir categoría Ingresos pero procesar todos los importes (positivos y negativos)
        if (t.categoria === 'Ingresos') return;
        
        const fecha = new Date(t.fecha);
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        
        categorias.add(t.categoria);
        
        // Si hay múltiples años, usar clave año-mes, sino solo mes
        const mesKey = multipleAños ? `${año}-${mes}` : mes;
        mesesSet.add(mesKey);
        
        const key = `${t.categoria}-${mesKey}`;
        if (!datos[key]) {
            datos[key] = { 
                categoria: t.categoria, 
                mes: mesKey,
                mesNombre: multipleAños ? `${NOMBRES_MESES[mes]} ${año}` : NOMBRES_MESES[mes],
                total: 0 
            };
        }
        // Sumar el importe tal cual (positivo o negativo) para obtener el resultado neto
        datos[key].total += t.importe;
        //Invierto el signo
        //datos[key].total += t.importe < 0 ? Math.abs(t.importe) : -t.importe;

    });
    
    const meses = [...mesesSet].sort((a, b) => {
        if (multipleAños) {
            // Ordenar por año-mes si son strings del formato "año-mes"
            const [añoA, mesA] = String(a).split('-').map(Number);
            const [añoB, mesB] = String(b).split('-').map(Number);
            if (añoA !== añoB) return añoA - añoB;
            return mesA - mesB;
        }
        return a - b;
    });
    
    return {
        categorias: [...categorias],
        meses,
        datos,
        multipleAños
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
                    position: 'top',
                    labels: {
                        boxWidth: getChartResponsiveConfig().legend.boxWidth,
                        padding: getChartResponsiveConfig().legend.padding,
                        font: { size: getChartResponsiveConfig().legend.fontSize }
                    }
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
                    ticks: {
                        maxRotation: getChartResponsiveConfig().axis.maxRotation,
                        font: { size: getChartResponsiveConfig().axis.fontSize }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatearMoneda(value),
                        font: { size: getChartResponsiveConfig().axis.fontSize }
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
    
    const { categorias, meses, datos, multipleAños } = agruparPorCategoriaMes(transacciones);
    
    // Generar las etiquetas correctamente según si hay múltiples años o no
    const labels = meses.map(m => {
        if (multipleAños) {
            const [año, mes] = String(m).split('-').map(Number);
            return `${NOMBRES_MESES[mes]} ${año}`;
        }
        return NOMBRES_MESES[m];
    });
    
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
                    position: 'top',
                    labels: {
                        boxWidth: getChartResponsiveConfig().legend.boxWidth,
                        padding: getChartResponsiveConfig().legend.padding,
                        font: { size: getChartResponsiveConfig().legend.fontSize }
                    }
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
                    stacked: true,
                    ticks: {
                        maxRotation: getChartResponsiveConfig().axis.maxRotation,
                        font: { size: getChartResponsiveConfig().axis.fontSize }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatearMoneda(value),
                        font: { size: getChartResponsiveConfig().axis.fontSize }
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
        //if (t.importe >= 0 || t.categoria === 'Ingresos') return;
        if (t.categoria === 'Ingresos') return;
        
        if (!gastosPorCategoria[t.categoria]) {
            gastosPorCategoria[t.categoria] = 0;
        }
        //gastosPorCategoria[t.categoria] += Math.abs(t.importe);
        gastosPorCategoria[t.categoria] += t.importe;
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
                    position: window.innerWidth < 500 ? 'bottom' : 'right',
                    labels: {
                        boxWidth: getChartResponsiveConfig().legend.boxWidth,
                        padding: getChartResponsiveConfig().legend.padding,
                        font: { size: getChartResponsiveConfig().legend.fontSize }
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
                pointRadius: getChartResponsiveConfig().point.radius
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
                x: {
                    ticks: {
                        maxRotation: getChartResponsiveConfig().axis.maxRotation,
                        font: { size: getChartResponsiveConfig().axis.fontSize }
                    }
                },
                y: {
                    ticks: {
                        callback: value => formatearMoneda(value),
                        font: { size: getChartResponsiveConfig().axis.fontSize }
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
    
    // Verificar si hay múltiples años
    const años = [...new Set(transacciones.map(t => new Date(t.fecha).getFullYear()))];
    const multipleAños = años.length > 1;
    
    // Obtener meses disponibles
    const mesesDisponibles = new Map();
    
    transacciones.forEach(t => {
        const fecha = new Date(t.fecha);
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        const key = multipleAños ? `${año}-${mes}` : mes;
        
        if (!mesesDisponibles.has(key)) {
            mesesDisponibles.set(key, {
                mes,
                año,
                key,
                nombre: multipleAños ? `${NOMBRES_MESES[mes]} ${año}` : NOMBRES_MESES[mes],
                transacciones: []
            });
        }
        mesesDisponibles.get(key).transacciones.push(t);
    });
    
    // Ordenar por año y mes
    const mesesOrdenados = [...mesesDisponibles.values()].sort((a, b) => {
        if (multipleAños) {
            if (a.año !== b.año) return a.año - b.año;
            return a.mes - b.mes;
        }
        return a.mes - b.mes;
    });
    
    // Guardar en estado para uso posterior
    GraficasState.mesesDisponibles = mesesOrdenados;
    
    // Llenar select
    select.innerHTML = '<option value="">-- Seleccionar mes --</option>' + 
        mesesOrdenados.map(m => 
            `<option value="${m.key}">${m.nombre} (${m.transacciones.length} transacciones)</option>`
        ).join('');
    
    // Limpiar contenedor y contador
    document.getElementById('transacciones-mes-container').innerHTML = 
        '<p class="info-text">Selecciona un mes para ver sus transacciones.</p>';
    document.getElementById('transacciones-mes-count').textContent = '';
    
    // Añadir evento de cambio
    select.onchange = (e) => {
        const mesSeleccionado = e.target.value;
        if (mesSeleccionado !== '') {
            mostrarTransaccionesMes(mesSeleccionado);
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
function mostrarTransaccionesMes(mesKey) {
    const container = document.getElementById('transacciones-mes-container');
    const countSpan = document.getElementById('transacciones-mes-count');
    
    if (!container || !GraficasState.mesesDisponibles) return;
    
    const datosMes = GraficasState.mesesDisponibles.find(m => String(m.key) === String(mesKey));
    
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

// ==========================================
// PREDICCIÓN
// ==========================================

const NOMBRES_MESES_COMPLETOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Estado de predicción
const PrediccionState = {
    chart: null,
    datosHistoricos: null
};

/**
 * Cargar y calcular predicción
 */
async function cargarPrediccion() {
    try {
        const response = await fetch(`${API_URL}/transacciones`);
        const data = await response.json();
        
        if (!data.success || data.data.length === 0) {
            mostrarPrediccionVacia();
            return;
        }
        
        const transacciones = data.data;
        
        // Agrupar por año-mes para análisis histórico
        const datosMensuales = agruparTransaccionesPorAñoMes(transacciones);
        PrediccionState.datosHistoricos = datosMensuales;
        
        // Calcular predicción
        const prediccion = calcularPrediccion(datosMensuales);
        
        // Mostrar resultados
        renderizarPrediccion(prediccion);
        renderizarChartPrediccion(datosMensuales, prediccion);
        renderizarPrediccionCategorias(transacciones);
        
    } catch (error) {
        console.error('Error al cargar predicción:', error);
    }
}

/**
 * Agrupar transacciones por año-mes
 */
function agruparTransaccionesPorAñoMes(transacciones) {
    const meses = {};
    
    transacciones.forEach(t => {
        const fecha = new Date(t.fecha);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        if (!meses[key]) {
            meses[key] = {
                año: fecha.getFullYear(),
                mes: fecha.getMonth(),
                key,
                ingresos: 0,
                gastos: 0,
                inversion: 0,
                transacciones: []
            };
        }
        
        meses[key].transacciones.push(t);
        
        if (t.categoria === 'Inversiones') {
            meses[key].inversion += t.importe;
        } else if (t.importe > 0) {
            meses[key].ingresos += t.importe;
        } else {
            meses[key].gastos += Math.abs(t.importe);
        }
    });
    
    // Convertir a array ordenado
    return Object.values(meses).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Calcular índices de estacionalidad para cada mes del año
 * Detecta patrones que se repiten en los mismos meses (ej: diciembre siempre más gastos)
 */
function calcularEstacionalidad(datosMensuales) {
    // Agrupar datos por mes del año (0-11)
    const datosPorMes = {};
    
    for (let i = 0; i < 12; i++) {
        datosPorMes[i] = { ingresos: [], gastos: [], ahorros: [] };
    }
    
    datosMensuales.forEach(m => {
        datosPorMes[m.mes].ingresos.push(m.ingresos);
        datosPorMes[m.mes].gastos.push(m.gastos);
        datosPorMes[m.mes].ahorros.push(m.ingresos - m.gastos);
    });
    
    // Calcular medias globales
    const totalIngresos = datosMensuales.reduce((sum, m) => sum + m.ingresos, 0);
    const totalGastos = datosMensuales.reduce((sum, m) => sum + m.gastos, 0);
    const mediaGlobalIngresos = totalIngresos / datosMensuales.length;
    const mediaGlobalGastos = totalGastos / datosMensuales.length;
    
    // Calcular índices estacionales para cada mes
    // Índice > 1 = mes con valores superiores a la media
    // Índice < 1 = mes con valores inferiores a la media
    const indicesEstacionales = {};
    
    for (let mes = 0; mes < 12; mes++) {
        const datosDelMes = datosPorMes[mes];
        
        if (datosDelMes.ingresos.length === 0) {
            // Sin datos para este mes, usar índice neutro
            indicesEstacionales[mes] = { 
                ingresos: 1.0, 
                gastos: 1.0,
                confianza: 0,
                muestras: 0
            };
            continue;
        }
        
        // Media del mes específico
        const mediaIngresosMes = datosDelMes.ingresos.reduce((a, b) => a + b, 0) / datosDelMes.ingresos.length;
        const mediaGastosMes = datosDelMes.gastos.reduce((a, b) => a + b, 0) / datosDelMes.gastos.length;
        
        // Índice estacional = media del mes / media global
        const indiceIngresos = mediaGlobalIngresos > 0 ? mediaIngresosMes / mediaGlobalIngresos : 1.0;
        const indiceGastos = mediaGlobalGastos > 0 ? mediaGastosMes / mediaGlobalGastos : 1.0;
        
        // Confianza basada en número de muestras (más años = más confianza)
        const confianza = Math.min(datosDelMes.ingresos.length / 3, 1); // 3+ años = confianza máxima
        
        indicesEstacionales[mes] = {
            ingresos: indiceIngresos,
            gastos: indiceGastos,
            confianza,
            muestras: datosDelMes.ingresos.length
        };
    }
    
    return indicesEstacionales;
}

/**
 * Calcular predicción usando Media Móvil Ponderada + Tendencia + Estacionalidad
 */
function calcularPrediccion(datosMensuales) {
    const n = datosMensuales.length;
    
    if (n === 0) {
        return null;
    }
    
    // Determinar mes objetivo (siguiente mes)
    const ultimoMes = datosMensuales[n - 1];
    let mesObjetivo = ultimoMes.mes + 1;
    let añoObjetivo = ultimoMes.año;
    
    if (mesObjetivo > 11) {
        mesObjetivo = 0;
        añoObjetivo++;
    }
    
    // Usar los últimos N meses (máximo 12) para la predicción
    const mesesParaAnalisis = Math.min(n, 12);
    const datosRecientes = datosMensuales.slice(-mesesParaAnalisis);
    
    // Calcular índices de estacionalidad con todos los datos históricos
    const estacionalidad = calcularEstacionalidad(datosMensuales);
    const indiceEstacionalObjetivo = estacionalidad[mesObjetivo];
    
    // Calcular media ponderada (más peso a meses recientes)
    // Pesos exponenciales para dar más importancia a datos recientes
    let pesoTotal = 0;
    let ingresoPonderado = 0;
    let gastoPonderado = 0;
    
    datosRecientes.forEach((mes, index) => {
        // Peso exponencial: los últimos meses pesan mucho más
        const peso = Math.pow(1.5, index); // 1, 1.5, 2.25, 3.37, 5.06...
        pesoTotal += peso;
        ingresoPonderado += mes.ingresos * peso;
        gastoPonderado += mes.gastos * peso;
    });
    
    let ingresoBase = ingresoPonderado / pesoTotal;
    let gastoBase = gastoPonderado / pesoTotal;
    
    // Análisis de tendencia (regresión lineal simple)
    const tendenciaIngresos = calcularTendencia(datosRecientes.map(m => m.ingresos));
    const tendenciaGastos = calcularTendencia(datosRecientes.map(m => m.gastos));
    
    // Ajustar con tendencia
    let ingresoPredicho = ingresoBase + tendenciaIngresos.pendiente;
    let gastoPredicho = gastoBase + tendenciaGastos.pendiente;
    
    // Aplicar ajuste estacional (ponderado por confianza del índice)
    const pesoEstacional = indiceEstacionalObjetivo.confianza * 0.3; // Máximo 30% de ajuste estacional
    
    ingresoPredicho = ingresoPredicho * (1 - pesoEstacional + pesoEstacional * indiceEstacionalObjetivo.ingresos);
    gastoPredicho = gastoPredicho * (1 - pesoEstacional + pesoEstacional * indiceEstacionalObjetivo.gastos);
    
    // Asegurar valores no negativos
    ingresoPredicho = Math.max(0, ingresoPredicho);
    gastoPredicho = Math.max(0, gastoPredicho);
    
    const ahorroPredicho = ingresoPredicho - gastoPredicho;
    
    // Calcular confianza basada en variabilidad de datos
    const confianza = calcularConfianza(datosRecientes);
    
    // Determinar tendencia general
    let tendenciaGeneral = 'estable';
    const ahorrosHistoricos = datosRecientes.map(m => m.ingresos - m.gastos);
    const tendenciaAhorro = calcularTendencia(ahorrosHistoricos);
    
    if (tendenciaAhorro.pendiente > 50) {
        tendenciaGeneral = 'subiendo';
    } else if (tendenciaAhorro.pendiente < -50) {
        tendenciaGeneral = 'bajando';
    }
    
    // Determinar efecto estacional
    let efectoEstacional = 'neutro';
    const indiceCombinadoEstacional = (indiceEstacionalObjetivo.ingresos + (2 - indiceEstacionalObjetivo.gastos)) / 2;
    if (indiceCombinadoEstacional > 1.1) {
        efectoEstacional = 'favorable';
    } else if (indiceCombinadoEstacional < 0.9) {
        efectoEstacional = 'desfavorable';
    }
    
    return {
        mesObjetivo,
        añoObjetivo,
        nombreMes: NOMBRES_MESES_COMPLETOS[mesObjetivo],
        ingresos: ingresoPredicho,
        gastos: gastoPredicho,
        ahorro: ahorroPredicho,
        confianza,
        tendencia: tendenciaGeneral,
        mesesAnalizados: mesesParaAnalisis,
        metodo: 'Media Móvil Ponderada + Tendencia + Estacionalidad',
        estacionalidad: {
            indiceIngresos: indiceEstacionalObjetivo.ingresos,
            indiceGastos: indiceEstacionalObjetivo.gastos,
            muestrasHistoricas: indiceEstacionalObjetivo.muestras,
            efecto: efectoEstacional
        }
    };
}

/**
 * Calcular tendencia usando regresión lineal simple
 */
function calcularTendencia(valores) {
    const n = valores.length;
    if (n < 2) return { pendiente: 0, interseccion: valores[0] || 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += valores[i];
        sumXY += i * valores[i];
        sumX2 += i * i;
    }
    
    const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const interseccion = (sumY - pendiente * sumX) / n;
    
    return { pendiente: pendiente || 0, interseccion };
}

/**
 * Calcular nivel de confianza basado en variabilidad
 */
function calcularConfianza(datos) {
    if (datos.length < 2) return 'Baja';
    
    const ahorros = datos.map(m => m.ingresos - m.gastos);
    const media = ahorros.reduce((a, b) => a + b, 0) / ahorros.length;
    
    // Calcular desviación estándar
    const varianza = ahorros.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / ahorros.length;
    const desviacion = Math.sqrt(varianza);
    
    // Coeficiente de variación
    const cv = Math.abs(media) > 0 ? (desviacion / Math.abs(media)) * 100 : 100;
    
    if (cv < 20) return 'Alta';
    if (cv < 40) return 'Media';
    return 'Baja';
}

/**
 * Mostrar predicción vacía
 */
function mostrarPrediccionVacia() {
    document.getElementById('pred-mes-objetivo').textContent = '--';
    document.getElementById('pred-ahorro').textContent = '-- €';
    document.getElementById('pred-confianza').textContent = 'Sin datos suficientes';
    document.getElementById('pred-ingresos').textContent = '-- €';
    document.getElementById('pred-gastos').textContent = '-- €';
    document.getElementById('pred-meses-analizados').textContent = '0';
    document.getElementById('pred-tendencia').textContent = '--';
}

/**
 * Renderizar predicción principal
 */
function renderizarPrediccion(prediccion) {
    if (!prediccion) {
        mostrarPrediccionVacia();
        return;
    }
    
    document.getElementById('pred-mes-objetivo').textContent = `${prediccion.nombreMes} ${prediccion.añoObjetivo}`;
    document.getElementById('pred-ahorro').textContent = formatearMoneda(prediccion.ahorro);
    document.getElementById('pred-confianza').textContent = `Confianza: ${prediccion.confianza}`;
    document.getElementById('pred-ingresos').textContent = formatearMoneda(prediccion.ingresos);
    document.getElementById('pred-gastos').textContent = formatearMoneda(prediccion.gastos);
    document.getElementById('pred-metodo').textContent = prediccion.metodo;
    document.getElementById('pred-meses-analizados').textContent = prediccion.mesesAnalizados;
    
    // Tendencia con emoji
    const tendenciaTexto = {
        'subiendo': '📈 Ahorro en aumento',
        'bajando': '📉 Ahorro en descenso',
        'estable': '➡️ Ahorro estable'
    };
    document.getElementById('pred-tendencia').textContent = tendenciaTexto[prediccion.tendencia];
    
    // Mostrar información de estacionalidad si existe
    if (prediccion.estacionalidad) {
        const estacionalidadEl = document.getElementById('pred-estacionalidad');
        if (estacionalidadEl) {
            const efectoIcono = {
                'favorable': '🌟 Mes históricamente favorable',
                'desfavorable': '⚠️ Mes históricamente difícil',
                'neutro': '➖ Mes sin patrón estacional marcado'
            };
            estacionalidadEl.textContent = efectoIcono[prediccion.estacionalidad.efecto];
        }
    }
}

/**
 * Calcular predicciones históricas retroactivas
 * Para cada mes, calcula qué hubiéramos predicho basándonos en los meses anteriores
 * Usa el mismo algoritmo mejorado: Media Móvil Ponderada + Tendencia + Estacionalidad
 */
function calcularPrediccionesHistoricas(datosMensuales) {
    const prediccionesHistoricas = [];
    
    // Necesitamos al menos 2 meses de datos para empezar a predecir
    for (let i = 2; i < datosMensuales.length; i++) {
        // Usar los meses anteriores para predecir el mes i
        const datosAnteriores = datosMensuales.slice(0, i);
        const mesesParaAnalisis = Math.min(datosAnteriores.length, 12); // Ampliado a 12 meses
        const datosRecientes = datosAnteriores.slice(-mesesParaAnalisis);
        
        // Calcular estacionalidad con los datos disponibles hasta ese punto
        const estacionalidad = calcularEstacionalidad(datosAnteriores);
        const mesObjetivo = datosMensuales[i].mes;
        const indiceEstacional = estacionalidad[mesObjetivo];
        
        // Calcular media ponderada con pesos exponenciales
        let pesoTotal = 0;
        let ingresoPonderado = 0;
        let gastoPonderado = 0;
        
        datosRecientes.forEach((mes, index) => {
            const peso = Math.pow(1.5, index); // Pesos exponenciales
            pesoTotal += peso;
            ingresoPonderado += mes.ingresos * peso;
            gastoPonderado += mes.gastos * peso;
        });
        
        let ingresoBase = ingresoPonderado / pesoTotal;
        let gastoBase = gastoPonderado / pesoTotal;
        
        // Análisis de tendencia
        const tendenciaIngresos = calcularTendencia(datosRecientes.map(m => m.ingresos));
        const tendenciaGastos = calcularTendencia(datosRecientes.map(m => m.gastos));
        
        let ingresoPredicho = ingresoBase + tendenciaIngresos.pendiente;
        let gastoPredicho = gastoBase + tendenciaGastos.pendiente;
        
        // Aplicar ajuste estacional
        const pesoEstacional = indiceEstacional.confianza * 0.3;
        ingresoPredicho = ingresoPredicho * (1 - pesoEstacional + pesoEstacional * indiceEstacional.ingresos);
        gastoPredicho = gastoPredicho * (1 - pesoEstacional + pesoEstacional * indiceEstacional.gastos);
        
        ingresoPredicho = Math.max(0, ingresoPredicho);
        gastoPredicho = Math.max(0, gastoPredicho);
        
        const ahorroPredicho = ingresoPredicho - gastoPredicho;
        
        prediccionesHistoricas.push({
            mesIndex: i,
            prediccion: ahorroPredicho,
            real: datosMensuales[i].ingresos - datosMensuales[i].gastos
        });
    }
    
    return prediccionesHistoricas;
}

/**
 * Renderizar gráfica de tendencia y predicción
 */
function renderizarChartPrediccion(datosMensuales, prediccion) {
    const ctx = document.getElementById('chart-prediccion');
    if (!ctx) return;
    
    if (PrediccionState.chart) {
        PrediccionState.chart.destroy();
    }
    
    // Usar TODOS los datos históricos (no limitar)
    const datosGrafica = datosMensuales;
    const offsetInicio = 0;
    
    // Crear labels con mes y año para evitar confusión
    const labels = datosGrafica.map(m => `${NOMBRES_MESES[m.mes]} ${m.año.toString().slice(-2)}`);
    const ahorrosReales = datosGrafica.map(m => m.ingresos - m.gastos);
    
    // Calcular predicciones históricas
    const prediccionesHistoricas = calcularPrediccionesHistoricas(datosMensuales);
    
    // Mapear predicciones históricas a los índices de la gráfica
    const ahorrosPredichos = datosGrafica.map((m, idx) => {
        const idxGlobal = offsetInicio + idx;
        const predHistorica = prediccionesHistoricas.find(p => p.mesIndex === idxGlobal);
        return predHistorica ? predHistorica.prediccion : null;
    });
    
    // Añadir mes de predicción futura
    if (prediccion) {
        labels.push(`${NOMBRES_MESES[prediccion.mesObjetivo]} ${prediccion.añoObjetivo.toString().slice(-2)} (Pred.)`);
        ahorrosReales.push(null);
        ahorrosPredichos.push(prediccion.ahorro);
    }
    
    // Dataset de ahorro real
    const datasets = [
        {
            label: 'Ahorro Real',
            data: ahorrosReales,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: 'rgb(34, 197, 94)',
            pointRadius: 6,
            pointHoverRadius: 8
        },
        {
            label: 'Predicción',
            data: ahorrosPredichos,
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'rgb(168, 85, 247)',
            pointRadius: 5,
            pointStyle: 'triangle',
            borderDash: [5, 5]
        }
    ];
    
    PrediccionState.chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: getChartResponsiveConfig().legend.boxWidth,
                        padding: getChartResponsiveConfig().legend.padding,
                        font: { size: getChartResponsiveConfig().legend.fontSize }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.raw === null) return null;
                            return context.dataset.label + ': ' + formatearMoneda(context.raw);
                        },
                        afterBody: function(tooltipItems) {
                            const realItem = tooltipItems.find(i => i.dataset.label === 'Ahorro Real');
                            const predItem = tooltipItems.find(i => i.dataset.label === 'Predicción');
                            
                            if (realItem && predItem && realItem.raw !== null && predItem.raw !== null) {
                                const diferencia = realItem.raw - predItem.raw;
                                const porcentaje = predItem.raw !== 0 ? ((diferencia / Math.abs(predItem.raw)) * 100).toFixed(1) : 0;
                                const signo = diferencia >= 0 ? '+' : '';
                                return [`─────────────`, `Diferencia: ${signo}${formatearMoneda(diferencia)} (${signo}${porcentaje}%)`];
                            }
                            return [];
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: getChartResponsiveConfig().axis.maxRotation,
                        minRotation: getChartResponsiveConfig().axis.minRotation,
                        font: { size: getChartResponsiveConfig().axis.fontSize }
                    }
                },
                y: {
                    ticks: {
                        callback: value => formatearMoneda(value),
                        font: { size: getChartResponsiveConfig().axis.fontSize }
                    }
                }
            }
        }
    });
    
    // Calcular y mostrar precisión del modelo
    mostrarPrecisionModelo(prediccionesHistoricas);
}

/**
 * Mostrar precisión del modelo de predicción
 */
function mostrarPrecisionModelo(prediccionesHistoricas) {
    const metodoEl = document.getElementById('pred-metodo');
    if (!metodoEl) return;
    
    if (prediccionesHistoricas.length === 0) {
        metodoEl.innerHTML = `Media Móvil Ponderada + Tendencia + Estacionalidad <br><small style="color: var(--warning-color)">📊 Sin datos suficientes para calcular precisión</small>`;
        return;
    }
    
    // Calcular precisión usando SMAPE (Symmetric Mean Absolute Percentage Error)
    // Es más robusto cuando hay valores cercanos a 0 o negativos
    let sumaErroresSMAPE = 0;
    let conteoValido = 0;
    
    prediccionesHistoricas.forEach(p => {
        const denominador = (Math.abs(p.real) + Math.abs(p.prediccion)) / 2;
        if (denominador > 0) {
            const error = Math.abs(p.real - p.prediccion);
            const smape = (error / denominador) * 100;
            sumaErroresSMAPE += Math.min(smape, 200); // Limitar a 200% máximo
            conteoValido++;
        }
    });
    
    if (conteoValido === 0) {
        metodoEl.innerHTML = `Media Móvil Ponderada + Tendencia + Estacionalidad <br><small style="color: var(--warning-color)">📊 Sin datos válidos para calcular precisión</small>`;
        return;
    }
    
    const errorMedioSMAPE = sumaErroresSMAPE / conteoValido;
    const precision = Math.max(0, Math.min(100, 100 - errorMedioSMAPE / 2)).toFixed(1);
    
    // Actualizar el elemento de método con la precisión
    const colorPrecision = precision > 70 ? 'var(--success-color)' : precision > 50 ? 'var(--warning-color)' : 'var(--danger-color)';
    metodoEl.innerHTML = `Media Móvil Ponderada + Tendencia + Estacionalidad <br><small style="color: ${colorPrecision}">📊 Precisión histórica: ${precision}% (${conteoValido} meses comparados)</small>`;
}

/**
 * Renderizar predicción por categorías
 */
function renderizarPrediccionCategorias(transacciones) {
    const container = document.getElementById('prediccion-categorias');
    if (!container) return;
    
    // Agrupar gastos por categoría y mes
    const categoriasMes = {};
    
    transacciones.forEach(t => {
        if (t.importe >= 0 || t.categoria === 'Ingresos') return;
        
        const fecha = new Date(t.fecha);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        if (!categoriasMes[t.categoria]) {
            categoriasMes[t.categoria] = {};
        }
        if (!categoriasMes[t.categoria][mesKey]) {
            categoriasMes[t.categoria][mesKey] = 0;
        }
        categoriasMes[t.categoria][mesKey] += Math.abs(t.importe);
    });
    
    // Calcular predicción para cada categoría
    const prediccionesCategorias = [];
    
    for (const [categoria, meses] of Object.entries(categoriasMes)) {
        const valores = Object.values(meses);
        if (valores.length === 0) continue;
        
        // Media ponderada de últimos meses
        const n = Math.min(valores.length, 4);
        const recientes = valores.slice(-n);
        
        let pesoTotal = 0;
        let valorPonderado = 0;
        recientes.forEach((v, i) => {
            const peso = i + 1;
            pesoTotal += peso;
            valorPonderado += v * peso;
        });
        
        const prediccion = valorPonderado / pesoTotal;
        
        // Calcular tendencia
        const tendencia = calcularTendencia(recientes);
        let tendenciaTexto = 'estable';
        if (tendencia.pendiente > 20) tendenciaTexto = 'subiendo';
        else if (tendencia.pendiente < -20) tendenciaTexto = 'bajando';
        
        prediccionesCategorias.push({
            categoria,
            prediccion,
            tendencia: tendenciaTexto
        });
    }
    
    // Ordenar por predicción (mayor a menor)
    prediccionesCategorias.sort((a, b) => b.prediccion - a.prediccion);
    
    // Renderizar
    const coloresCat = {
        'Inversión': '#3b82f6',
        'Coche': '#f59e0b',
        'Alimentación': '#10b981',
        'Gastos Recurrentes': '#a855f7',
        'Gastos recurrentes': '#a855f7',
        'Ocio': '#ec4899',
        'Otros': '#6b7280'
    };
    
    const tendenciaIcono = {
        'subiendo': '↗️',
        'bajando': '↘️',
        'estable': '→'
    };
    
    container.innerHTML = prediccionesCategorias.map(p => `
        <div class="pred-categoria-item" style="border-left-color: ${coloresCat[p.categoria] || '#6b7280'}">
            <span class="pred-categoria-nombre">${p.categoria}</span>
            <span class="pred-categoria-valor">${formatearMoneda(p.prediccion)}</span>
            <span class="pred-categoria-tendencia ${p.tendencia}">
                ${tendenciaIcono[p.tendencia]} Tendencia ${p.tendencia}
            </span>
        </div>
    `).join('');
}
