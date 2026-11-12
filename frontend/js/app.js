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
    ordenFecha: 'DESC', // 'DESC' = más recientes primero, 'ASC' = más antiguas primero
    token: null,
    username: null
};

// ==========================================
// AUTENTICACIÓN
// ==========================================

/**
 * Obtener headers con token de autenticación
 */
function getAuthHeaders(extra = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...extra
    };
    if (AppState.token) {
        headers['Authorization'] = `Bearer ${AppState.token}`;
    }
    return headers;
}

/**
 * Fetch autenticado - wrapper de fetch que incluye el token
 */
async function fetchAuth(url, options = {}) {
    const headers = getAuthHeaders(options.headers || {});
    const response = await fetch(url, { ...options, headers });
    
    // Si el token expiró, volver al login
    if (response.status === 401) {
        cerrarSesion();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
    
    return response;
}

/**
 * Inicializar el sistema de login
 */
function inicializarLogin() {
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await realizarLogin();
    });
    
    btnLogout.addEventListener('click', cerrarSesion);
    
    // Comprobar si hay sesión guardada
    const tokenGuardado = localStorage.getItem('appbanco_token');
    const usernameGuardado = localStorage.getItem('appbanco_username');
    
    if (tokenGuardado) {
        // Verificar que el token sigue siendo válido
        verificarToken(tokenGuardado, usernameGuardado);
    }
}

/**
 * Verificar token guardado
 */
async function verificarToken(token, username) {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            AppState.token = token;
            AppState.username = username;
            mostrarApp();
        } else {
            // Token inválido, limpiar
            localStorage.removeItem('appbanco_token');
            localStorage.removeItem('appbanco_username');
        }
    } catch (error) {
        console.error('Error al verificar token:', error);
    }
}

/**
 * Realizar login
 */
async function realizarLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            AppState.token = data.token;
            AppState.username = data.username;
            localStorage.setItem('appbanco_token', data.token);
            localStorage.setItem('appbanco_username', data.username);
            mostrarApp();
        } else {
            errorDiv.textContent = data.error || 'Credenciales inválidas';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Error de conexión con el servidor';
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
    }
}

/**
 * Mostrar la aplicación después del login
 */
function mostrarApp() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app-container').style.display = '';
    document.getElementById('user-display').textContent = `👤 ${AppState.username}`;
    
    // Cargar datos
    inicializarTabs();
    inicializarEventos();
    cargarDatosIniciales();
}

/**
 * Cerrar sesión
 */
function cerrarSesion() {
    AppState.token = null;
    AppState.username = null;
    localStorage.removeItem('appbanco_token');
    localStorage.removeItem('appbanco_username');
    
    // Mostrar login, ocultar app
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('app-container').style.display = 'none';
    
    // Limpiar formulario
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AppBanco v1.5 iniciado');
    
    inicializarTema();
    inicializarLogin();
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

    // Modal de patrimonio
    document.getElementById('btn-config-patrimonio').addEventListener('click', abrirModalPatrimonio);
    document.getElementById('btn-cerrar-patrimonio').addEventListener('click', cerrarModalPatrimonio);
    document.getElementById('btn-cancelar-patrimonio').addEventListener('click', cerrarModalPatrimonio);
    document.getElementById('form-patrimonio').addEventListener('submit', guardarConfiguracionPatrimonio);
    
    // Clasificación automática en tiempo real
    document.getElementById('input-concepto').addEventListener('blur', async (e) => {
        const concepto = e.target.value;
        const selectCategoria = document.getElementById('input-categoria');
        
        if (concepto && !selectCategoria.value) {
            try {
                const response = await fetchAuth(`${API_URL}/clasificar`, {
                    method: 'POST',
                    body: JSON.stringify({
                        concepto,
                        importe: parseFloat(document.getElementById('input-importe').value) || null
                    })
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
        
        const response = await fetchAuth(`${API_URL}/transacciones?${params}`);
        const data = await response.json();
        
        if (data.success) {
            AppState.transacciones = data.data;
            renderizarTransacciones(data.data);
            actualizarIndicadorOrden();
            actualizarResumenFiltro(data.data);
            cargarPatrimonio(filtros.fechaFin);
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
    let vivienda = 0;
    
    transacciones.forEach(t => {
        if (t.categoria === 'Inversiones') {
            //inversion += Math.abs(t.importe);
            inversion += t.importe;
        } else if (t.categoria === 'Vivienda') {
            vivienda += t.importe;
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
    document.getElementById('filtro-total-vivienda').textContent = formatearMoneda(vivienda);
    
    // Mostrar el resumen
    resumenDiv.classList.remove('hidden');
}

/**
 * Cargar dinero líquido y patrimonio total hasta la fecha final del filtro
 * (no depende de la categoría ni de la búsqueda)
 */
async function cargarPatrimonio(fechaFin) {
    const div = document.getElementById('resumen-patrimonio');
    if (!div) return;

    try {
        const params = new URLSearchParams();
        if (fechaFin) params.append('fechaFin', fechaFin);

        const response = await fetchAuth(`${API_URL}/patrimonio?${params}`);
        const data = await response.json();

        if (data.success) {
            const p = data.data;
            document.getElementById('patrimonio-liquido').textContent = formatearMoneda(p.liquido);
            document.getElementById('patrimonio-inversiones').textContent = formatearMoneda(p.valorInversiones);
            document.getElementById('patrimonio-total').textContent = formatearMoneda(p.total);
            document.getElementById('patrimonio-fecha-label').textContent =
                fechaFin ? `DINERO LÍQUIDO A ${formatearFecha(fechaFin)}` : 'DINERO LÍQUIDO';
            div.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error al cargar patrimonio:', error);
    }
}

async function abrirModalPatrimonio() {
    try {
        const response = await fetchAuth(`${API_URL}/configuracion`);
        const data = await response.json();

        if (data.success) {
            const c = data.data;
            document.getElementById('config-saldo-inicial').value = c.saldo_inicial || 0;
            document.getElementById('config-fecha-saldo-inicial').value = c.fecha_saldo_inicial || '';
            document.getElementById('config-valor-inversiones').value = c.valor_inversiones || 0;
            document.getElementById('config-cuenta-inversiones').value = c.cuenta_inversiones || '';
            document.getElementById('modal-patrimonio').classList.remove('hidden');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al cargar la configuración', 'error');
    }
}

function cerrarModalPatrimonio() {
    document.getElementById('modal-patrimonio').classList.add('hidden');
}

async function guardarConfiguracionPatrimonio(e) {
    e.preventDefault();

    const datos = {
        saldo_inicial: parseFloat(document.getElementById('config-saldo-inicial').value),
        fecha_saldo_inicial: document.getElementById('config-fecha-saldo-inicial').value,
        valor_inversiones: parseFloat(document.getElementById('config-valor-inversiones').value),
        cuenta_inversiones: document.getElementById('config-cuenta-inversiones').value.trim()
    };

    try {
        const response = await fetchAuth(`${API_URL}/configuracion`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
        const data = await response.json();

        if (data.success) {
            mostrarNotificacion('✅ Configuración guardada');
            cerrarModalPatrimonio();
            cargarPatrimonio(document.getElementById('filtro-fecha-fin').value);
        } else {
            mostrarNotificacion(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al guardar la configuración', 'error');
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
        const response = await fetchAuth(`${API_URL}/transacciones`, {
            method: 'POST',
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
        const response = await fetchAuth(`${API_URL}/transacciones/${id}`, {
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
        cuenta: document.getElementById('edit-cuenta').value.trim() || null,
        notas: notasValue || null
    };
    
    try {
        const response = await fetchAuth(`${API_URL}/transacciones/${id}`, {
            method: 'PUT',
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
            fetchAuth(`${API_URL}/estadisticas/balance`),
            fetchAuth(`${API_URL}/estadisticas/categorias`),
            fetchAuth(`${API_URL}/estado`)
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
        const response = await fetchAuth(`${API_URL}/categorias`);
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
            headers: { 'Authorization': `Bearer ${AppState.token}` },
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
        const response = await fetchAuth(`${API_URL}/transacciones/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const t = data.data;
            document.getElementById('edit-id').value = t.id;
            document.getElementById('edit-fecha').value = t.fecha;
            document.getElementById('edit-concepto').value = t.concepto;
            document.getElementById('edit-importe').value = t.importe;
            document.getElementById('edit-categoria').value = t.categoria;
            document.getElementById('edit-cuenta').value = t.cuenta || '';
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
    añoSeleccionado: null,
    mesSeleccionado: ''
};

// Colores para categorías - todos distintos y bien diferenciados
const COLORES_CATEGORIAS = {
    'Inversiones': { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },       // Azul
    'Coche': { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },           // Naranja/Ámbar
    'Alimentación': { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },    // Verde esmeralda
    'Gastos recurrentes': { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' }, // Púrpura
    'Ocio': { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' },            // Rosa/Fucsia
    'Ingresos': { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },          // Verde claro
    'Vivienda': { bg: 'rgba(8, 145, 178, 0.7)', border: 'rgb(8, 145, 178)' },          // Cian
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
        const response = await fetchAuth(`${API_URL}/transacciones`);
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

        // Gráficas visuales (flujo, habitual, comercios, calendario)
        llenarSelectorMesGraficas(datosFiltrados);
        renderizarGraficasVisuales();
        
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
                vivienda: 0,
                transacciones: []
            };
        }
        
        meses[key].transacciones.push(t);
        
        // Clasificar por tipo (Inversión y Vivienda se separan)
        if (t.categoria === 'Inversiones') {
            meses[key].inversion += t.importe;
        } else if (t.categoria === 'Vivienda') {
            meses[key].vivienda += t.importe;
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
    let totalVivienda = 0;
    
    const filas = datosMes.map(m => {
        const ahorro = m.ingresos - m.gastos;
        totalIngresos += m.ingresos;
        totalGastos += m.gastos;
        totalAhorro += ahorro;
        totalInversion += m.inversion;
        totalVivienda += m.vivienda;
        
        return `
            <tr>
                <td>${m.nombre}</td>
                <td class="positivo">${formatearMoneda(m.ingresos)}</td>
                <td class="negativo">${formatearMoneda(m.gastos)}</td>
                <td class="${ahorro >= 0 ? 'positivo' : 'negativo'}">${formatearMoneda(ahorro)}</td>
                <td class="inversion">${formatearMoneda(m.inversion)}</td>
                <td class="vivienda">${formatearMoneda(m.vivienda)}</td>
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
            <td class="vivienda">${formatearMoneda(totalVivienda)}</td>
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
    let vivienda = 0;
    
    transacciones.forEach(t => {
        if (t.categoria === 'Inversiones') {
            inversion += t.importe;
        } else if (t.categoria === 'Vivienda') {
            vivienda += t.importe;
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
            <div class="resumen-item">
                <span class="resumen-label">Vivienda</span>
                <span class="resumen-value" style="color: #0891b2;">${formatearMoneda(vivienda)}</span>
            </div>
        </div>
    `;
    
    container.innerHTML = tablaHTML;
}

// ==========================================
// PREDICCIÓN
// ==========================================
// El cálculo se hace en el backend (GET /api/prediccion); aquí solo se pinta.

const NOMBRES_MESES_COMPLETOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const PrediccionState = {
    chart: null,
    chartAbsoluto: null,
    chartAcierto: null,
    diaAcierto: 0,
    datos: null
};

const COLORES_CATEGORIA_PRED = {
    'Inversiones': '#3b82f6',
    'Coche': '#f59e0b',
    'Alimentación': '#10b981',
    'Gastos recurrentes': '#a855f7',
    'Ocio': '#ec4899',
    'Vivienda': '#0891b2',
    'Otros': '#6b7280'
};

/**
 * Etiqueta corta de un mes 'YYYY-MM' -> 'Nov 26'
 */
function etiquetaMesPred(claveMes) {
    const [año, mes] = claveMes.split('-').map(Number);
    return `${NOMBRES_MESES[mes - 1]} ${String(año).slice(-2)}`;
}

/**
 * Cargar la predicción del mes actual desde el backend
 */
async function cargarPrediccion() {
    try {
        const response = await fetchAuth(`${API_URL}/prediccion`);
        const data = await response.json();

        if (!data.success || !data.data || data.data.historico.length === 0) {
            mostrarPrediccionVacia(data.error);
            return;
        }

        const pred = data.data;
        PrediccionState.datos = pred;

        renderizarPrediccion(pred);
        renderizarProgresoMesActual(pred);
        renderizarChartPrediccion(pred);
        renderizarChartPrediccionAbsoluto(pred);
        renderizarFijosPrediccion(pred);
        renderizarPrediccionCategorias(pred);
        renderizarAciertoPrediccion(pred);
        renderizarMetodoPrediccion(pred);
    } catch (error) {
        console.error('Error al cargar predicción:', error);
        mostrarPrediccionVacia();
    }
}

/**
 * Tendencia simple (pendiente de una regresión lineal)
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
 * Mostrar predicción vacía
 */
function mostrarPrediccionVacia(mensaje) {
    document.getElementById('pred-mes-objetivo').textContent = '--';
    document.getElementById('pred-ahorro').textContent = '-- €';
    document.getElementById('pred-confianza').textContent = mensaje || 'Sin datos suficientes';
    document.getElementById('pred-intervalo').textContent = '';
    document.getElementById('pred-ingresos').textContent = '-- €';
    document.getElementById('pred-gastos').textContent = '-- €';
    document.getElementById('pred-meses-analizados').textContent = '0';
    document.getElementById('pred-tendencia').textContent = '--';
    document.getElementById('pred-avisos').hidden = true;
}

/**
 * Tarjeta principal: ahorro estimado, intervalo, avisos y desglose
 */
function renderizarPrediccion(pred) {
    const [año, mes] = pred.mes.split('-').map(Number);
    document.getElementById('pred-mes-objetivo').textContent = `${NOMBRES_MESES_COMPLETOS[mes - 1]} ${año}`;
    document.getElementById('pred-ahorro').textContent = formatearMoneda(pred.prediccion.ahorro);

    const intervalo = pred.prediccion.intervalo;
    document.getElementById('pred-intervalo').textContent = intervalo
        ? `Probablemente entre ${formatearMoneda(intervalo.p10)} y ${formatearMoneda(intervalo.p90)}`
            + (pred.precision && pred.precision.dentroIntervalo !== null
                ? ` (este rango acertó el ${Math.round(pred.precision.dentroIntervalo)}% de los meses pasados)` : '')
        : '';

    const confianza = pred.mesesAnalizados < 6 || !intervalo ? 'Baja'
        : pred.fraccionMes >= 0.66 ? 'Alta'
        : pred.fraccionMes >= 0.33 ? 'Media' : 'Media-baja';
    document.getElementById('pred-confianza').textContent =
        `Confianza: ${confianza} · ${Math.round(pred.fraccionMes * 100)}% del mes registrado`;

    // Avisos sobre los datos
    const avisosEl = document.getElementById('pred-avisos');
    avisosEl.innerHTML = pred.avisos.map(a => `<p>⚠️ ${escapeHtml(a)}</p>`).join('');
    avisosEl.hidden = pred.avisos.length === 0;

    // Desglose de ingresos y gastos esperados
    const d = pred.desglose;
    document.getElementById('pred-ingresos').textContent = formatearMoneda(pred.prediccion.ingresos);
    document.getElementById('pred-gastos').textContent = formatearMoneda(pred.prediccion.gastos);
    document.getElementById('pred-ingresos-detalle').textContent =
        `Fijos ${formatearMoneda(d.ingresos.fijos)} · Variables ${formatearMoneda(d.ingresos.variables)}`;
    document.getElementById('pred-gastos-detalle').textContent =
        `Fijos ${formatearMoneda(d.gastos.fijos)} · Variables ${formatearMoneda(d.gastos.variables)} · Extra. ${formatearMoneda(d.gastos.extraordinarios)}`;
}

/**
 * Progreso del mes actual: lo registrado frente a lo esperado
 */
function renderizarProgresoMesActual(pred) {
    const container = document.getElementById('pred-progreso');
    if (!container) return;
    container.style.display = 'block';

    const real = pred.real;
    const esperado = pred.prediccion;
    const ahorroReal = real.ingresos - real.gastos;

    document.getElementById('pred-dia-corte').textContent = pred.diaCorte > 0
        ? `(datos hasta el día ${pred.diaCorte} de ${pred.diasMes})`
        : '(sin movimientos todavía)';
    document.getElementById('pred-ingresos-real').textContent = formatearMoneda(real.ingresos);
    document.getElementById('pred-ingresos-esperado').textContent = formatearMoneda(esperado.ingresos);
    document.getElementById('pred-gastos-real').textContent = formatearMoneda(real.gastos);
    document.getElementById('pred-gastos-esperado').textContent = formatearMoneda(esperado.gastos);
    document.getElementById('pred-ahorro-real').textContent = formatearMoneda(ahorroReal);
    document.getElementById('pred-ahorro-esperado').textContent = formatearMoneda(esperado.ahorro);

    const pct = (valor, total) => total > 0 ? Math.min((valor / total) * 100, 100) : 0;
    document.getElementById('pred-barra-ingresos').style.width = `${pct(real.ingresos, esperado.ingresos)}%`;
    document.getElementById('pred-barra-gastos').style.width = `${pct(real.gastos, esperado.gastos)}%`;
}

/**
 * Opciones comunes de las dos gráficas de predicción
 */
function opcionesChartPrediccion(etiquetaReal) {
    const cfg = getChartResponsiveConfig();
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: cfg.legend.boxWidth,
                    padding: cfg.legend.padding,
                    font: { size: cfg.legend.fontSize },
                    filter: item => !item.text.endsWith('probable')
                }
            },
            tooltip: {
                filter: item => item.raw !== null,
                callbacks: {
                    label: ctx => `${ctx.dataset.label}: ${formatearMoneda(ctx.raw)}`,
                    afterBody: items => {
                        const real = items.find(i => i.dataset.label === etiquetaReal);
                        const predicho = items.find(i => i.dataset.label === 'Predicción');
                        if (!real || !predicho || real.raw === null || predicho.raw === null) return [];
                        const diferencia = real.raw - predicho.raw;
                        const signo = diferencia >= 0 ? '+' : '';
                        return ['─────────────', `Diferencia: ${signo}${formatearMoneda(diferencia)}`];
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: cfg.axis.maxRotation,
                    minRotation: cfg.axis.minRotation,
                    font: { size: cfg.axis.fontSize }
                }
            },
            y: {
                ticks: {
                    callback: value => formatearMoneda(value),
                    font: { size: cfg.axis.fontSize }
                }
            }
        }
    };
}

/**
 * Datasets: real, predicción (prueba hacia atrás + mes actual) y banda del intervalo
 */
function datasetsPrediccion(pred, valoresReales, etiquetaReal, valorRealActual) {
    const n = pred.historico.length;
    const prediccion = [...pred.historico.map(h => h.prediccion), pred.prediccion.ahorro];
    const reales = [...valoresReales, pred.diaCorte > 0 ? valorRealActual : null];

    const intervalo = pred.prediccion.intervalo;
    const bandaBaja = new Array(n).fill(null).concat(intervalo ? intervalo.p10 : null);
    const bandaAlta = new Array(n).fill(null).concat(intervalo ? intervalo.p90 : null);

    return [
        {
            label: etiquetaReal,
            data: reales,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: 'rgb(34, 197, 94)',
            pointRadius: reales.map((_, i) => i === n ? 4 : 5),
            pointStyle: reales.map((_, i) => i === n ? 'rectRot' : 'circle'),
            pointHoverRadius: 7
        },
        {
            label: 'Predicción',
            data: prediccion,
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'rgb(168, 85, 247)',
            pointRadius: 5,
            pointStyle: 'triangle',
            borderDash: [5, 5],
            spanGaps: false
        },
        {
            label: 'Mínimo probable',
            data: bandaBaja,
            borderColor: 'rgba(168, 85, 247, 0.6)',
            backgroundColor: 'rgba(168, 85, 247, 0.6)',
            pointStyle: 'line',
            pointRadius: 10,
            showLine: false
        },
        {
            label: 'Máximo probable',
            data: bandaAlta,
            borderColor: 'rgba(168, 85, 247, 0.6)',
            backgroundColor: 'rgba(168, 85, 247, 0.6)',
            pointStyle: 'line',
            pointRadius: 10,
            showLine: false
        }
    ];
}

/**
 * Gráfica: ahorro real vs predicción
 */
function renderizarChartPrediccion(pred) {
    const ctx = document.getElementById('chart-prediccion');
    if (!ctx) return;
    if (PrediccionState.chart) PrediccionState.chart.destroy();

    const labels = [...pred.historico.map(h => etiquetaMesPred(h.mes)), `${etiquetaMesPred(pred.mes)} (Actual)`];
    const datasets = datasetsSeguros(() => datasetsPrediccion(
        pred,
        pred.historico.map(h => h.ahorro),
        'Ahorro Real',
        pred.real.ingresos - pred.real.gastos
    ));

    PrediccionState.chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: opcionesChartPrediccion('Ahorro Real')
    });
}

/**
 * Gráfica: ahorro absoluto (ahorro + inversión neta) vs predicción
 */
function renderizarChartPrediccionAbsoluto(pred) {
    const ctx = document.getElementById('chart-prediccion-absoluto');
    if (!ctx) return;
    if (PrediccionState.chartAbsoluto) PrediccionState.chartAbsoluto.destroy();

    const labels = [...pred.historico.map(h => etiquetaMesPred(h.mes)), `${etiquetaMesPred(pred.mes)} (Actual)`];
    const datasets = datasetsSeguros(() => datasetsPrediccion(
        pred,
        pred.historico.map(h => h.ahorro + h.inversion),
        'Ahorro Absoluto',
        pred.real.ingresos - pred.real.gastos + pred.real.inversion
    ));

    PrediccionState.chartAbsoluto = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: opcionesChartPrediccion('Ahorro Absoluto')
    });
}

function datasetsSeguros(fn) {
    try {
        return fn();
    } catch (error) {
        console.error('Error preparando la gráfica de predicción:', error);
        return [];
    }
}

/**
 * Lista de fijos (cobrados / pendientes) y extraordinarios del mes
 */
function renderizarFijosPrediccion(pred) {
    const listaFijos = document.getElementById('pred-fijos');
    const listaExtra = document.getElementById('pred-extraordinarios');
    if (!listaFijos || !listaExtra) return;

    listaFijos.innerHTML = pred.fijos.length === 0
        ? '<li><span class="pred-lista-concepto">No se han detectado movimientos fijos</span></li>'
        : pred.fijos.map(f => {
            const estado = f.pendiente
                ? `⏳ Pendiente · suele llegar el día ${f.diaHabitual}`
                : `✅ ${f.tipo === 'ingreso' ? 'Cobrado' : 'Pagado'} ${formatearMoneda(f.registrado)}`;
            const signo = f.tipo === 'ingreso' ? '+' : '−';
            return `
                <li>
                    <span class="pred-lista-concepto" title="${escapeHtml(f.concepto)}">${escapeHtml(f.concepto)}</span>
                    <span class="pred-lista-estado">${estado}</span>
                    <span class="pred-lista-importe ${f.tipo}">${signo}${formatearMoneda(f.esperado)}</span>
                </li>`;
        }).join('');

    document.getElementById('pred-extra-info').textContent =
        `Gastos sueltos de más de ${formatearMoneda(pred.umbralExtraordinario)}. No se pueden prever, así que se espera su media mensual.`;
    listaExtra.innerHTML = pred.extraordinarios.length === 0
        ? '<li><span class="pred-lista-concepto">Ninguno por ahora</span></li>'
        : pred.extraordinarios.map(e => `
                <li>
                    <span class="pred-lista-concepto" title="${escapeHtml(e.concepto)}">${escapeHtml(e.concepto)}</span>
                    <span class="pred-lista-estado">${e.fecha.split('-').reverse().join('/')}</span>
                    <span class="pred-lista-importe gasto">${formatearMoneda(e.importe)}</span>
                </li>`).join('');
}

/**
 * Gasto esperado por categoría y lo ya registrado
 */
function renderizarPrediccionCategorias(pred) {
    const container = document.getElementById('prediccion-categorias');
    if (!container) return;

    container.innerHTML = pred.categorias.map(c => {
        const pct = c.prediccion > 0 ? Math.min((c.real / c.prediccion) * 100, 100).toFixed(0) : 0;
        const registrado = c.real > 0
            ? `<span class="pred-categoria-actual">Registrado: ${formatearMoneda(c.real)} (${pct}%)</span>`
            : '<span class="pred-categoria-tendencia">Nada registrado aún</span>';
        return `
        <div class="pred-categoria-item" style="border-left-color: ${COLORES_CATEGORIA_PRED[c.categoria] || '#6b7280'}">
            <span class="pred-categoria-nombre">${escapeHtml(c.categoria)}</span>
            <span class="pred-categoria-valor">${formatearMoneda(c.prediccion)}</span>
            ${registrado}
        </div>`;
    }).join('');
}

/**
 * Tarjeta de metodología: método, meses, tendencia y error medido
 */
function renderizarMetodoPrediccion(pred) {
    document.getElementById('pred-metodo').textContent = pred.metodo;
    document.getElementById('pred-meses-analizados').textContent = pred.mesesAnalizados;

    const ultimos = pred.historico.slice(-6).map(h => h.ahorro);
    const pendiente = calcularTendencia(ultimos).pendiente;
    document.getElementById('pred-tendencia').textContent =
        pendiente > 50 ? '📈 Ahorro en aumento' : pendiente < -50 ? '📉 Ahorro en descenso' : '➡️ Ahorro estable';

    const precisionEl = document.getElementById('pred-precision');
    const p = pred.precision;
    if (!p) {
        precisionEl.textContent = 'Sin meses suficientes';
        return;
    }
    precisionEl.innerHTML = `±${formatearMoneda(p.errorMediano)} en un mes normal
        <br><small>Error medio ${formatearMoneda(p.errorMedio)} · ${p.mesesProbados} meses probados</small>`;
}

// ==========================================
// ACIERTO DE LAS PREDICCIONES PASADAS
// ==========================================

const NOMBRE_DIA_ACIERTO = { 0: 'a principio de mes', 10: 'el día 10', 20: 'el día 20' };

function textoCausa(causa) {
    if (causa.tipo === 'extraordinario') return `${causa.concepto} (${formatearMoneda(causa.importe)})`;
    if (causa.tipo === 'ingresoNoLlego') return `No llegó: ${causa.concepto} (${formatearMoneda(-causa.importe)})`;
    return `No se pagó: ${causa.concepto} (${formatearMoneda(causa.importe)})`;
}

/**
 * Tarjeta "¿Cuánto acierta?": resumen, gráfica de rango vs real y tabla por mes
 */
function renderizarAciertoPrediccion(pred) {
    const card = document.querySelector('.card-acierto');
    if (!card) return;
    const probados = pred.historico.filter(h => h.acierto);
    if (!pred.precision || probados.length === 0) {
        card.hidden = true;
        return;
    }
    card.hidden = false;

    const dia = PrediccionState.diaAcierto;
    document.querySelectorAll('#acierto-dias button').forEach(b => {
        const activo = Number(b.dataset.dia) === dia;
        b.classList.toggle('active', activo);
        b.setAttribute('aria-pressed', String(activo));
    });

    renderizarResumenAcierto(pred, dia);
    renderizarChartAcierto(probados, dia);
    renderizarTablaAcierto(probados, dia);
}

function renderizarResumenAcierto(pred, dia) {
    const resumen = pred.precision.porDia.find(p => p.dia === dia);
    const inicio = pred.precision.porDia[0];
    const mejora = dia > 0 && inicio.errorMediano > 0
        ? `${Math.round((1 - resumen.errorMediano / inicio.errorMediano) * 100)}% menos que el día 1`
        : 'en la mitad de los meses se falla menos';
    const sesgo = Math.abs(resumen.sesgo) < 50
        ? 'Sin tendencia clara a fallar hacia un lado'
        : resumen.sesgo < 0
            ? `De media promete ${formatearMoneda(-resumen.sesgo)} más de lo que ahorras`
            : `De media se queda ${formatearMoneda(resumen.sesgo)} corta`;

    const dato = (label, valor, nota) => `
        <div class="acierto-dato">
            <span class="acierto-dato-label">${label}</span>
            <span class="acierto-dato-valor">${valor}</span>
            <span class="acierto-dato-nota">${nota}</span>
        </div>`;

    document.getElementById('acierto-resumen').innerHTML = [
        dato('Dentro del rango', `${resumen.dentroRango} de ${resumen.mesesConRango}`,
            `meses en que el ahorro real cayó en el rango dado ${NOMBRE_DIA_ACIERTO[dia]}`),
        dato('Error típico', `±${formatearMoneda(resumen.errorMediano)}`, mejora),
        dato('Error medio', formatearMoneda(resumen.errorMedio), 'lo suben los meses con gastos imprevistos'),
        dato('Sesgo', formatearMoneda(resumen.sesgo), sesgo)
    ].join('');
}

function renderizarChartAcierto(probados, dia) {
    const ctx = document.getElementById('chart-acierto');
    if (!ctx) return;
    if (PrediccionState.chartAcierto) PrediccionState.chartAcierto.destroy();

    const cfg = getChartResponsiveConfig();
    const datos = probados.map(h => h.acierto.find(a => a.dia === dia));
    const colorPunto = datos.map(a => a.dentro === null ? '#9ca3af' : a.dentro ? '#10b981' : '#ef4444');

    PrediccionState.chartAcierto = new Chart(ctx, {
        data: {
            labels: probados.map(h => etiquetaMesPred(h.mes)),
            datasets: [
                {
                    type: 'bar',
                    label: 'Rango previsto',
                    data: datos.map(a => a.p10 === null ? null : [a.p10, a.p90]),
                    backgroundColor: 'rgba(102, 126, 234, 0.22)',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                    borderWidth: 1,
                    borderSkipped: false,
                    barPercentage: 0.6,
                    order: 3
                },
                {
                    type: 'line',
                    label: 'Predicción',
                    data: datos.map(a => a.prediccion),
                    showLine: false,
                    pointStyle: 'line',
                    pointRadius: cfg.point.radius * 2.4,
                    pointHoverRadius: cfg.point.radius * 2.6,
                    pointBorderWidth: 3,
                    borderColor: '#667eea',
                    backgroundColor: '#667eea',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Ahorro real (verde: dentro · rojo: fuera)',
                    data: probados.map(h => h.ahorro),
                    showLine: false,
                    pointRadius: cfg.point.radius + 1,
                    pointHoverRadius: cfg.point.hoverRadius + 1,
                    pointBackgroundColor: colorPunto,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        generateLabels: chart => Chart.defaults.plugins.legend.labels.generateLabels(chart)
                            .map(item => item.datasetIndex === 2
                                ? { ...item, fillStyle: '#10b981', strokeStyle: '#10b981' } : item),
                        boxWidth: cfg.legend.boxWidth,
                        padding: cfg.legend.padding,
                        font: { size: cfg.legend.fontSize }
                    }
                },
                tooltip: {
                    filter: item => item.raw !== null,
                    callbacks: {
                        label: c => Array.isArray(c.raw)
                            ? `Rango: ${formatearMoneda(c.raw[0])} a ${formatearMoneda(c.raw[1])}`
                            : `${c.datasetIndex === 2 ? 'Ahorro real' : c.dataset.label}: ${formatearMoneda(c.raw)}`,
                        afterBody: items => {
                            const i = items[0].dataIndex;
                            const a = datos[i];
                            const lineas = ['─────────────',
                                `Error: ${a.error >= 0 ? '+' : ''}${formatearMoneda(a.error)}`
                                + (a.dentro === null ? '' : a.dentro ? ' · dentro del rango' : ' · fuera del rango')];
                            probados[i].causas.forEach(c => lineas.push('• ' + textoCausa(c)));
                            return lineas;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: cfg.axis.maxRotation,
                        minRotation: cfg.axis.minRotation,
                        font: { size: cfg.axis.fontSize }
                    }
                },
                y: {
                    ticks: { callback: v => formatearMoneda(v), font: { size: cfg.axis.fontSize } }
                }
            }
        }
    });
}

function renderizarTablaAcierto(probados, dia) {
    const filas = [...probados].reverse().map(h => {
        const a = h.acierto.find(x => x.dia === dia);
        const estado = a.dentro === null ? '<span title="Aún no había meses suficientes para dar un rango">—</span>'
            : a.dentro ? '<span class="dentro">✓ dentro</span>' : '<span class="fuera">✗ fuera</span>';
        const rango = a.p10 === null ? '—' : `${formatearMoneda(a.p10)} a ${formatearMoneda(a.p90)}`;
        const causas = h.causas.map(c => escapeHtml(textoCausa(c))).join('<br>');
        return `<tr>
            <td>${etiquetaMesPred(h.mes)}</td>
            <td>${formatearMoneda(a.prediccion)}</td>
            <td>${rango}</td>
            <td>${formatearMoneda(h.ahorro)}</td>
            <td>${a.error >= 0 ? '+' : ''}${formatearMoneda(a.error)}</td>
            <td>${estado}</td>
            <td class="acierto-causas">${causas}</td>
        </tr>`;
    }).join('');

    document.getElementById('acierto-tabla').innerHTML = `
        <thead><tr>
            <th>Mes</th><th>Predicho</th><th>Rango</th><th>Real</th><th>Error</th><th></th><th>Lo que más pesó</th>
        </tr></thead>
        <tbody>${filas}</tbody>`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('acierto-dias')?.addEventListener('click', (e) => {
        const boton = e.target.closest('button[data-dia]');
        if (!boton || !PrediccionState.datos) return;
        PrediccionState.diaAcierto = Number(boton.dataset.dia);
        renderizarAciertoPrediccion(PrediccionState.datos);
    });
});

// ==========================================
// GRÁFICAS VISUALES: FLUJO, HABITUAL, COMERCIOS, CALENDARIO
// ==========================================

const CATEGORIAS_FUERA_GASTO = ['Inversiones', 'Vivienda'];
const COLOR_AHORRO = 'rgb(34, 197, 94)';
const COLOR_NEUTRO = 'rgb(148, 163, 184)';
const DIAS_SEMANA_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function claveMesGrafica(fecha) {
    return String(fecha).slice(0, 7);
}

function etiquetaMesGrafica(claveMes) {
    const [año, mes] = claveMes.split('-').map(Number);
    return `${NOMBRES_MESES_COMPLETOS[mes - 1]} ${año}`;
}

function esGastoConsumo(t) {
    return t.importe < 0 && !CATEGORIAS_FUERA_GASTO.includes(t.categoria);
}

function colorCategoria(categoria) {
    return COLORES_CATEGORIAS[categoria]?.border || COLOR_NEUTRO;
}

function colorTextoTema() {
    return getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#1f2937';
}

/**
 * Selector de mes: los meses con datos del año elegido
 */
function llenarSelectorMesGraficas(transaccionesAño) {
    const select = document.getElementById('graficas-mes');
    if (!select) return;
    const meses = [...new Set(transaccionesAño.map(t => claveMesGrafica(t.fecha)))].sort().reverse();
    if (GraficasState.mesSeleccionado && !meses.includes(GraficasState.mesSeleccionado)) {
        GraficasState.mesSeleccionado = '';
    }
    select.innerHTML = '<option value="">Todo el periodo</option>' + meses
        .map(m => `<option value="${m}" ${m === GraficasState.mesSeleccionado ? 'selected' : ''}>${etiquetaMesGrafica(m)}</option>`)
        .join('');
}

/**
 * Periodo que usan flujo y comercios: el mes elegido o el año/todo
 */
function periodoGraficas(transaccionesAño, año) {
    const mes = GraficasState.mesSeleccionado;
    if (mes) {
        const [a, m] = mes.split('-').map(Number);
        const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
        return {
            desde: `${mes}-01`,
            hasta: `${mes}-${String(ultimo).padStart(2, '0')}`,
            etiqueta: etiquetaMesGrafica(mes),
            transacciones: transaccionesAño.filter(t => claveMesGrafica(t.fecha) === mes)
        };
    }
    if (año === 'todo' || !año) {
        return { desde: null, hasta: null, etiqueta: 'todo el historial', transacciones: transaccionesAño };
    }
    return { desde: `${año}-01-01`, hasta: `${año}-12-31`, etiqueta: String(año), transacciones: transaccionesAño };
}

function renderizarGraficasVisuales() {
    const todas = GraficasState.datosGraficas?.transacciones;
    if (!todas) return;
    const año = GraficasState.añoSeleccionado || 'todo';
    const transaccionesAño = filtrarPorAño(todas, año);
    const periodo = periodoGraficas(transaccionesAño, año);

    const conProteccion = (nombre, fn) => {
        try { fn(); } catch (error) { console.error(`Error en la gráfica ${nombre}:`, error); }
    };
    conProteccion('flujo', () => renderizarChartFlujo(periodo));
    conProteccion('habitual', () => renderizarChartHabitual(todas, transaccionesAño));
    conProteccion('comercios', () => renderizarChartComercios(periodo));
    conProteccion('calendario', () => renderizarCalendarioGasto(todas, año));
}

// ---------- 1. Flujo del dinero (Sankey) ----------

function renderizarChartFlujo(periodo) {
    const ctx = document.getElementById('chart-flujo');
    if (!ctx) return;
    destruirChart('flujo');
    document.getElementById('flujo-periodo').textContent = `· ${periodo.etiqueta}`;

    // Neto por categoría: lo positivo entra, lo negativo sale
    const neto = {};
    periodo.transacciones.forEach(t => {
        neto[t.categoria] = (neto[t.categoria] || 0) + t.importe;
    });

    const NODO_CENTRAL = 'Dinero disponible';
    const nombreEntrada = cat => cat === 'Ingresos' ? 'Ingresos'
        : cat === 'Inversiones' ? 'Rescate de inversión' : `${cat} (entradas)`;
    const nombreSalida = cat => cat === 'Inversiones' ? 'Inversión' : cat;

    const entradas = Object.entries(neto).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
    const salidas = Object.entries(neto).filter(([, v]) => v < -0.5).sort((a, b) => a[1] - b[1]);
    const totalEntra = entradas.reduce((s, [, v]) => s + v, 0);
    const totalSale = salidas.reduce((s, [, v]) => s - v, 0);

    const flujos = [];
    const colores = { [NODO_CENTRAL]: COLOR_NEUTRO };
    const totales = {};
    const anadir = (from, to, flow, colorNodo, nodoColoreado) => {
        flujos.push({ from, to, flow: Math.round(flow * 100) / 100 });
        colores[nodoColoreado] = colorNodo;
    };

    entradas.forEach(([cat, v]) => anadir(nombreEntrada(cat), NODO_CENTRAL, v, colorCategoria(cat), nombreEntrada(cat)));
    if (totalSale > totalEntra) {
        anadir('Ahorros previos', NODO_CENTRAL, totalSale - totalEntra, COLOR_NEUTRO, 'Ahorros previos');
    }
    salidas.forEach(([cat, v]) => anadir(NODO_CENTRAL, nombreSalida(cat), -v, colorCategoria(cat), nombreSalida(cat)));
    if (totalEntra > totalSale) {
        anadir(NODO_CENTRAL, 'Ahorro', totalEntra - totalSale, COLOR_AHORRO, 'Ahorro');
    }

    flujos.forEach(f => {
        totales[f.from] = (totales[f.from] || 0) + f.flow;
        totales[f.to] = (totales[f.to] || 0) + f.flow;
    });
    totales[NODO_CENTRAL] = Math.max(totalEntra, totalSale);

    const resumen = document.getElementById('flujo-resumen');
    if (flujos.length === 0) {
        resumen.innerHTML = '<p class="info-text">No hay movimientos en este periodo.</p>';
        return;
    }

    // En pantallas estrechas solo el nombre (la cifra sale al pasar por la banda)
    const estrecho = ctx.parentElement.clientWidth < 600;
    const etiquetas = {};
    Object.keys(totales).forEach(nodo => {
        etiquetas[nodo] = estrecho
            ? (nodo === NODO_CENTRAL ? '' : nodo)
            : `${nodo}  ${formatearMoneda(totales[nodo])}`;
    });
    const base = Math.max(totalEntra, totalSale);
    const ahorro = totalEntra - totalSale;

    GraficasState.charts.flujo = new Chart(ctx, {
        type: 'sankey',
        data: {
            datasets: [{
                label: 'Flujo del dinero',
                data: flujos,
                colorFrom: c => colores[c.dataset.data[c.dataIndex].from] || COLOR_NEUTRO,
                colorTo: c => colores[c.dataset.data[c.dataIndex].to] || COLOR_NEUTRO,
                colorMode: 'gradient',
                alpha: 0.45,
                labels: etiquetas,
                color: colorTextoTema(),
                font: { size: getChartResponsiveConfig().legend.fontSize },
                nodeWidth: 12,
                nodePadding: 14,
                size: 'max',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: c => {
                            const d = c.raw;
                            const pct = base > 0 ? ` (${((d.flow / base) * 100).toFixed(1)}%)` : '';
                            return `${d.from} → ${d.to}: ${formatearMoneda(d.flow)}${pct}`;
                        }
                    }
                }
            }
        }
    });

    const tasa = totalEntra > 0 ? (ahorro / totalEntra) * 100 : 0;
    resumen.innerHTML = `
        <div class="total-item"><span class="total-label">Entra</span><span class="total-value ingresos">${formatearMoneda(totalEntra)}</span></div>
        <div class="total-item"><span class="total-label">Sale</span><span class="total-value gastos">${formatearMoneda(totalSale)}</span></div>
        <div class="total-item"><span class="total-label">${ahorro >= 0 ? 'Queda' : 'Falta'}${totalEntra > 0 ? ` (${tasa.toFixed(0)}% de lo que entra)` : ''}</span><span class="total-value ahorro">${formatearMoneda(Math.abs(ahorro))}</span></div>`;
}

// ---------- 2. Este mes frente a lo habitual ----------

function renderizarChartHabitual(todas, transaccionesAño) {
    const ctx = document.getElementById('chart-habitual');
    if (!ctx) return;
    destruirChart('habitual');

    const mesesConDatos = [...new Set(transaccionesAño.map(t => claveMesGrafica(t.fecha)))].sort();
    const hoy = new Date();
    const mesEnCurso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    // Por defecto, el último mes terminado: el mes en curso apenas tiene datos
    const terminados = mesesConDatos.filter(k => k < mesEnCurso);
    const mes = GraficasState.mesSeleccionado || terminados[terminados.length - 1] || mesesConDatos[mesesConDatos.length - 1];
    if (!mes) return;

    // Si es el mes en curso, se compara solo hasta el día de hoy en todos los meses
    const diaCorte = mes === mesEnCurso ? hoy.getDate() : 31;
    document.getElementById('habitual-periodo').textContent =
        `· ${etiquetaMesGrafica(mes)}${diaCorte < 31 ? ` (hasta el día ${diaCorte})` : ''}`;

    // Los 6 meses naturales anteriores
    const [a, m] = mes.split('-').map(Number);
    const anteriores = [];
    for (let i = 1; i <= 6; i++) {
        const d = new Date(Date.UTC(a, m - 1 - i, 1));
        anteriores.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    const gastoPorMesCat = {};
    todas.forEach(t => {
        if (!esGastoConsumo(t)) return;
        const clave = claveMesGrafica(t.fecha);
        if (clave !== mes && !anteriores.includes(clave)) return;
        if (Number(String(t.fecha).slice(8, 10)) > diaCorte) return;
        gastoPorMesCat[clave] = gastoPorMesCat[clave] || {};
        gastoPorMesCat[clave][t.categoria] = (gastoPorMesCat[clave][t.categoria] || 0) - t.importe;
    });
    const anterioresConDatos = anteriores.filter(k => gastoPorMesCat[k]);

    const mediana = valores => {
        if (!valores.length) return 0;
        const v = [...valores].sort((x, y) => x - y);
        const mitad = Math.floor(v.length / 2);
        return v.length % 2 ? v[mitad] : (v[mitad - 1] + v[mitad]) / 2;
    };

    const categorias = new Set([...Object.keys(gastoPorMesCat[mes] || {}),
        ...anterioresConDatos.flatMap(k => Object.keys(gastoPorMesCat[k]))]);
    const filas = [...categorias].map(cat => ({
        categoria: cat,
        actual: (gastoPorMesCat[mes] || {})[cat] || 0,
        habitual: mediana(anterioresConDatos.map(k => gastoPorMesCat[k][cat] || 0))
    }))
        .filter(f => f.actual >= 5 || f.habitual >= 5)
        .sort((x, y) => Math.max(y.actual, y.habitual) - Math.max(x.actual, x.habitual));

    const cfg = getChartResponsiveConfig();
    GraficasState.charts.habitual = new Chart(ctx, {
        data: {
            labels: filas.map(f => f.categoria),
            datasets: [
                {
                    type: 'bar',
                    label: etiquetaMesGrafica(mes),
                    data: filas.map(f => f.actual),
                    backgroundColor: filas.map(f => COLORES_CATEGORIAS[f.categoria]?.bg || 'rgba(148, 163, 184, 0.7)'),
                    borderColor: filas.map(f => colorCategoria(f.categoria)),
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.7,
                    order: 2
                },
                {
                    type: 'line',
                    label: `Lo habitual (mediana de ${anterioresConDatos.length} meses${diaCorte < 31 ? `, hasta el día ${diaCorte}` : ''})`,
                    data: filas.map(f => f.habitual),
                    showLine: false,
                    pointStyle: 'line',
                    rotation: 90,
                    pointRadius: 13,
                    pointHoverRadius: 14,
                    pointBorderWidth: 3,
                    borderColor: colorTextoTema(),
                    backgroundColor: colorTextoTema(),
                    order: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false, axis: 'y' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: cfg.legend.boxWidth,
                        padding: cfg.legend.padding,
                        font: { size: cfg.legend.fontSize },
                        generateLabels: chart => Chart.defaults.plugins.legend.labels.generateLabels(chart)
                            .map(item => item.datasetIndex === 0
                                ? { ...item, fillStyle: COLOR_NEUTRO, strokeStyle: COLOR_NEUTRO, pointStyle: 'rect' }
                                : { ...item, rotation: 90 })
                    }
                },
                tooltip: {
                    callbacks: {
                        label: c => `${c.datasetIndex === 0 ? 'Este mes' : 'Lo habitual'}: ${formatearMoneda(c.raw)}`,
                        afterBody: items => {
                            const f = filas[items[0].dataIndex];
                            if (f.habitual < 1) return ['Normalmente no gastas en esto'];
                            const dif = f.actual - f.habitual;
                            const pct = Math.round((dif / f.habitual) * 100);
                            return [`${dif >= 0 ? '+' : ''}${formatearMoneda(dif)} (${pct >= 0 ? '+' : ''}${pct}%) sobre lo habitual`];
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { callback: v => formatearMoneda(v), font: { size: cfg.axis.fontSize } } },
                y: { ticks: { font: { size: cfg.axis.fontSize } }, grid: { display: false } }
            }
        }
    });
}

// ---------- 3. Dónde más gastas ----------

async function renderizarChartComercios(periodo) {
    const ctx = document.getElementById('chart-comercios');
    if (!ctx) return;
    document.getElementById('comercios-periodo').textContent = `· ${periodo.etiqueta}`;

    const params = new URLSearchParams({ limite: '10' });
    if (periodo.desde) params.set('desde', periodo.desde);
    if (periodo.hasta) params.set('hasta', periodo.hasta);
    const peticion = (GraficasState.peticionComercios || 0) + 1;
    GraficasState.peticionComercios = peticion;

    const response = await fetchAuth(`${API_URL}/estadisticas/comercios?${params}`);
    const data = await response.json();
    if (peticion !== GraficasState.peticionComercios) return; // llegó una petición más nueva
    destruirChart('comercios');
    if (!data.success) throw new Error(data.error);

    const { comercios, totalGasto } = data.data;
    const cfg = getChartResponsiveConfig();
    const categorias = [...new Set(comercios.map(c => c.categoria))];
    const corto = nombre => nombre.length > 28 ? `${nombre.slice(0, 27)}…` : nombre;

    GraficasState.charts.comercios = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: comercios.map(c => corto(c.nombre)),
            // Un dataset por categoría para que la leyenda explique el color
            datasets: categorias.map(cat => ({
                label: cat,
                data: comercios.map(c => c.categoria === cat ? c.total : null),
                backgroundColor: COLORES_CATEGORIAS[cat]?.bg || 'rgba(148, 163, 184, 0.7)',
                borderColor: colorCategoria(cat),
                borderWidth: 1,
                borderRadius: 4,
                grouped: false,
                barPercentage: 0.75
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: cfg.legend.boxWidth, padding: cfg.legend.padding, font: { size: cfg.legend.fontSize } }
                },
                tooltip: {
                    filter: item => item.raw !== null,
                    callbacks: {
                        title: items => comercios[items[0].dataIndex].nombre,
                        label: c => {
                            const com = comercios[c.dataIndex];
                            const pct = totalGasto > 0 ? ` (${((com.total / totalGasto) * 100).toFixed(1)}% del gasto)` : '';
                            return `${formatearMoneda(com.total)}${pct}`;
                        },
                        afterLabel: c => {
                            const com = comercios[c.dataIndex];
                            return [`${com.movimientos} movimientos · media ${formatearMoneda(com.media)}`,
                                `${com.categoria} · último: ${formatearFecha(com.ultimaFecha)}`];
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { callback: v => formatearMoneda(v), font: { size: cfg.axis.fontSize } } },
                y: { ticks: { font: { size: cfg.axis.fontSize } }, grid: { display: false } }
            }
        }
    });
}

// ---------- 4. Calendario de gasto ----------

function fechaISO(d) {
    return d.toISOString().slice(0, 10);
}

function renderizarCalendarioGasto(todas, año) {
    const contenedor = document.getElementById('calendario-gasto');
    if (!contenedor) return;
    document.getElementById('calendario-detalle').innerHTML = '';

    // Rango: el año elegido o, con "Todo", los últimos 12 meses con datos
    const fechas = todas.map(t => String(t.fecha).slice(0, 10)).sort();
    if (!fechas.length) { contenedor.innerHTML = ''; return; }
    let inicio, fin;
    if (año && año !== 'todo') {
        inicio = new Date(Date.UTC(Number(año), 0, 1));
        fin = new Date(Date.UTC(Number(año), 11, 31));
    } else {
        fin = new Date(`${fechas[fechas.length - 1]}T00:00:00Z`);
        inicio = new Date(Date.UTC(fin.getUTCFullYear() - 1, fin.getUTCMonth(), fin.getUTCDate() + 1));
    }
    const desde = fechaISO(inicio), hasta = fechaISO(fin);
    document.getElementById('calendario-periodo').textContent =
        `· ${formatearFecha(desde)} – ${formatearFecha(hasta)}`;

    // Gasto y movimientos por día
    const porDia = {};
    todas.forEach(t => {
        const dia = String(t.fecha).slice(0, 10);
        if (dia < desde || dia > hasta || !esGastoConsumo(t)) return;
        porDia[dia] = porDia[dia] || { total: 0, movimientos: [] };
        porDia[dia].total -= t.importe;
        porDia[dia].movimientos.push(t);
    });
    GraficasState.calendarioDias = porDia;

    // Niveles por quintiles de los días con gasto
    const totales = Object.values(porDia).map(d => d.total).sort((x, y) => x - y);
    const cuantil = p => totales.length ? totales[Math.min(totales.length - 1, Math.floor(p * totales.length))] : 0;
    const cortes = [cuantil(0.2), cuantil(0.4), cuantil(0.6), cuantil(0.8)];
    const nivel = total => total <= 0 ? 0 : 1 + cortes.filter(c => total > c).length;

    // Columnas = semanas (lunes a domingo); la primera columna son los nombres de los días
    const html = ['<span class="cal-mes"></span>'];
    ['L', '', 'X', '', 'V', '', 'D'].forEach(d => html.push(`<span class="cal-dia-semana">${d}</span>`));

    const cursor = new Date(inicio);
    cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7)); // lunes anterior
    while (cursor <= fin) {
        const semana = [];
        let etiquetaMes = '';
        for (let i = 0; i < 7; i++) {
            const dia = fechaISO(cursor);
            const fuera = dia < desde || dia > hasta;
            if (!fuera && cursor.getUTCDate() === 1) etiquetaMes = NOMBRES_MESES[cursor.getUTCMonth()];
            if (!fuera && dia === desde && !etiquetaMes) etiquetaMes = NOMBRES_MESES[cursor.getUTCMonth()];
            const datos = porDia[dia];
            const n = datos ? nivel(datos.total) : 0;
            semana.push(fuera
                ? '<span class="cal-celda fuera"></span>'
                : `<button type="button" class="cal-celda${n ? ` cal-nivel-${n}` : ''}" data-dia="${dia}"
                    aria-label="${formatearFecha(dia)}: ${formatearMoneda(datos ? datos.total : 0)}"></button>`);
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        html.push(`<span class="cal-mes">${etiquetaMes}</span>`, ...semana);
    }
    contenedor.innerHTML = html.join('');

    // Leyenda con los cortes reales
    const rangos = ['Sin gasto', `hasta ${formatearMoneda(cortes[0])}`, `hasta ${formatearMoneda(cortes[1])}`,
        `hasta ${formatearMoneda(cortes[2])}`, `hasta ${formatearMoneda(cortes[3])}`, `más de ${formatearMoneda(cortes[3])}`];
    document.getElementById('calendario-leyenda').innerHTML = 'Menos ' +
        [0, 1, 2, 3, 4, 5].map(n => `<span class="cal-celda${n ? ` cal-nivel-${n}` : ''}" title="${rangos[n]}"></span>`).join('') +
        ' Más';

    // Resumen: total, día más caro y día de la semana con más gasto
    const dias = Object.entries(porDia);
    const total = dias.reduce((s, [, d]) => s + d.total, 0);
    const masCaro = dias.sort((x, y) => y[1].total - x[1].total)[0];
    const porSemana = [0, 0, 0, 0, 0, 0, 0];
    const semanasRango = Math.max(1, (fin - inicio) / (7 * 86400000));
    Object.entries(porDia).forEach(([dia, d]) => {
        porSemana[(new Date(`${dia}T00:00:00Z`).getUTCDay() + 6) % 7] += d.total;
    });
    const diaTop = porSemana.indexOf(Math.max(...porSemana));
    document.getElementById('calendario-resumen').innerHTML = dias.length
        ? `${formatearMoneda(total)} en ${dias.length} días con gasto · Día más caro: ${formatearFecha(masCaro[0])} (${formatearMoneda(masCaro[1].total)}) · Gastas más los ${DIAS_SEMANA_LARGOS[diaTop]} (${formatearMoneda(porSemana[diaTop] / semanasRango)} de media)`
        : 'Sin gastos en este periodo';
}

function textoDiaCalendario(dia, limite = null) {
    const datos = GraficasState.calendarioDias?.[dia];
    if (!datos) return { titulo: `${formatearFecha(dia)} · sin gasto`, movimientos: [] };
    const movimientos = [...datos.movimientos].sort((a, b) => a.importe - b.importe);
    return {
        titulo: `${formatearFecha(dia)} · ${formatearMoneda(datos.total)}`,
        movimientos: limite ? movimientos.slice(0, limite) : movimientos,
        resto: limite ? Math.max(0, movimientos.length - limite) : 0
    };
}

function mostrarTooltipCalendario(celda) {
    let tooltip = document.getElementById('cal-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'cal-tooltip';
        tooltip.className = 'cal-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltip);
    }
    const info = textoDiaCalendario(celda.dataset.dia, 3);
    tooltip.innerHTML = `<strong>${info.titulo}</strong>` + info.movimientos
        .map(t => `<br>${escapeHtml(t.concepto.slice(0, 40))}: ${formatearMoneda(-t.importe)}`).join('')
        + (info.resto ? `<br>y ${info.resto} más…` : '');
    tooltip.hidden = false;
    const r = celda.getBoundingClientRect();
    const ancho = tooltip.offsetWidth;
    tooltip.style.left = `${Math.min(window.innerWidth - ancho - 8, Math.max(8, r.left + r.width / 2 - ancho / 2))}px`;
    tooltip.style.top = `${r.top - tooltip.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - tooltip.offsetHeight - 8}px`;
}

function ocultarTooltipCalendario() {
    const tooltip = document.getElementById('cal-tooltip');
    if (tooltip) tooltip.hidden = true;
}

function mostrarDetalleDiaCalendario(celda) {
    document.querySelectorAll('#calendario-gasto .cal-celda.seleccionada').forEach(c => c.classList.remove('seleccionada'));
    celda.classList.add('seleccionada');
    const info = textoDiaCalendario(celda.dataset.dia);
    document.getElementById('calendario-detalle').innerHTML = `<strong>${info.titulo}</strong>` + (info.movimientos.length
        ? `<ul>${info.movimientos.map(t => `<li><span>${escapeHtml(t.concepto)} <small>· ${escapeHtml(t.categoria)}</small></span><span>${formatearMoneda(t.importe)}</span></li>`).join('')}</ul>`
        : '');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('graficas-mes')?.addEventListener('change', (e) => {
        GraficasState.mesSeleccionado = e.target.value;
        renderizarGraficasVisuales();
    });
    // Al cambiar de año se vuelve a "Todo el periodo"
    document.getElementById('graficas-año')?.addEventListener('change', () => {
        GraficasState.mesSeleccionado = '';
    });

    const calendario = document.getElementById('calendario-gasto');
    if (calendario) {
        const celdaDe = e => e.target.closest('button.cal-celda');
        calendario.addEventListener('mouseover', e => { const c = celdaDe(e); if (c) mostrarTooltipCalendario(c); });
        calendario.addEventListener('focusin', e => { const c = celdaDe(e); if (c) mostrarTooltipCalendario(c); });
        calendario.addEventListener('mouseleave', ocultarTooltipCalendario);
        calendario.addEventListener('focusout', ocultarTooltipCalendario);
        calendario.addEventListener('click', e => { const c = celdaDe(e); if (c) mostrarDetalleDiaCalendario(c); });
    }
    window.addEventListener('scroll', ocultarTooltipCalendario, { passive: true });
});
