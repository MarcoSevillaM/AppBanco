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
