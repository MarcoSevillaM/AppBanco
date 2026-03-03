/**
 * Database - Clase de gestión de base de datos SQLite
 * Maneja todas las operaciones CRUD de transacciones
 * Usa sql.js (SQLite compilado a JavaScript)
 */

const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../../../data/banco.db');
        this.db = null;
        this.SQL = null;
        this.isReady = false;
        this.initPromise = this.inicializar();
    }

    /**
     * Inicializar la base de datos de forma asíncrona
     */
    async inicializar() {
        const initSqlJs = require('sql.js');
        this.SQL = await initSqlJs();
        
        // Cargar base de datos existente o crear nueva
        try {
            if (fs.existsSync(this.dbPath)) {
                const buffer = fs.readFileSync(this.dbPath);
                this.db = new this.SQL.Database(buffer);
                console.log('📁 Base de datos cargada:', this.dbPath);
            } else {
                this.db = new this.SQL.Database();
                console.log('📁 Nueva base de datos creada:', this.dbPath);
            }
        } catch (error) {
            console.log('📁 Creando nueva base de datos...');
            this.db = new this.SQL.Database();
        }
        
        // Inicializar tablas
        this.inicializarTablas();
        this.guardar();
        this.isReady = true;
        
        return this.db;
    }

    /**
     * Asegurar que la DB está lista
     */
    async ready() {
        if (!this.isReady) {
            await this.initPromise;
        }
        return this.db;
    }

    /**
     * Guardar base de datos a disco
     */
    guardar() {
        if (this.db) {
            try {
                const data = this.db.export();
                const buffer = Buffer.from(data);
                
                // Asegurar que el directorio existe
                const dir = path.dirname(this.dbPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(this.dbPath, buffer);
            } catch (error) {
                console.error('Error al guardar DB:', error);
            }
        }
    }

    /**
     * Crear las tablas necesarias si no existen
     */
    inicializarTablas() {
        // Tabla de transacciones
        this.db.run(`
            CREATE TABLE IF NOT EXISTS transacciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha DATE NOT NULL,
                concepto TEXT NOT NULL,
                importe REAL NOT NULL,
                categoria TEXT DEFAULT 'Otros',
                cuenta TEXT,
                notas TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de reglas de clasificación personalizadas
        this.db.run(`
            CREATE TABLE IF NOT EXISTS reglas_clasificacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                palabra_clave TEXT NOT NULL UNIQUE,
                categoria TEXT NOT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de administradores
        this.db.run(`
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insertar admin por defecto si no existe
        const adminExiste = this.db.exec("SELECT COUNT(*) as count FROM admin WHERE username = 'marco'");
        const count = adminExiste[0]?.values[0]?.[0] || 0;
        if (count === 0) {
            this.db.run(
                'INSERT INTO admin (username, password_hash) VALUES (?, ?)',
                ['marco', '$2a$12$Cyu03QB0gXYbQNP4sPYQ.OYCIzm3Z/GJp1IWGCq6VoxwWzQW7QykK']
            );
            console.log('👤 Usuario marco creado por defecto');
        }

        // Índices para mejorar rendimiento
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacciones_categoria ON transacciones(categoria)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacciones_concepto ON transacciones(concepto)`);

        console.log('✅ Tablas inicializadas correctamente');
    }

    // ==========================================
    // OPERACIONES - ADMIN
    // ==========================================

    /**
     * Obtener un administrador por username
     */
    obtenerAdmin(username) {
        const stmt = this.db.prepare('SELECT * FROM admin WHERE username = ?');
        stmt.bind([username]);
        
        let admin = null;
        if (stmt.step()) {
            const row = stmt.getAsObject();
            admin = row;
        }
        stmt.free();
        return admin;
    }

    // ==========================================
    // OPERACIONES CRUD - TRANSACCIONES
    // ====================

    /**
     * Insertar una nueva transacción
     */
    insertarTransaccion(transaccion) {
        this.db.run(`
            INSERT INTO transacciones (fecha, concepto, importe, categoria, cuenta, notas)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            transaccion.fecha,
            transaccion.concepto,
            transaccion.importe,
            transaccion.categoria,
            transaccion.cuenta || null,
            transaccion.notas || null
        ]);

        // Obtener el ID insertado
        const result = this.db.exec('SELECT last_insert_rowid() as id');
        const id = result[0]?.values[0]?.[0] || null;
        
        this.guardar();
        return { id, ...transaccion };
    }

    /**
     * Convertir resultado de sql.js a array de objetos
     */
    _resultToObjects(result) {
        if (!result || result.length === 0) return [];
        
        const columns = result[0].columns;
        const values = result[0].values;
        
        return values.map(row => {
            const obj = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });
    }

    /**
     * Obtener transacciones con filtros opcionales
     */
    obtenerTransacciones(filtros = {}) {
        let query = 'SELECT * FROM transacciones WHERE 1=1';
        const params = [];

        if (filtros.categoria) {
            query += ' AND categoria = ?';
            params.push(filtros.categoria);
        }

        if (filtros.fechaInicio) {
            query += ' AND fecha >= ?';
            params.push(filtros.fechaInicio);
        }

        if (filtros.fechaFin) {
            query += ' AND fecha <= ?';
            params.push(filtros.fechaFin);
        }

        if (filtros.busqueda) {
            query += ' AND concepto LIKE ?';
            params.push(`%${filtros.busqueda}%`);
        }

        // Ordenación configurable
        const orden = filtros.orden === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY fecha ${orden}, id ${orden}`;

        if (filtros.limite) {
            query += ' LIMIT ?';
            params.push(filtros.limite);
        }

        const stmt = this.db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        
        return results;
    }

    /**
     * Obtener una transacción por ID
     */
    obtenerTransaccionPorId(id) {
        const stmt = this.db.prepare('SELECT * FROM transacciones WHERE id = ?');
        stmt.bind([id]);
        
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        
        return result;
    }

    /**
     * Actualizar una transacción
     */
    actualizarTransaccion(id, datos) {
        const campos = [];
        const valores = [];

        for (const [campo, valor] of Object.entries(datos)) {
            if (valor !== undefined && campo !== 'id') {
                campos.push(`${campo} = ?`);
                valores.push(valor);
            }
        }

        if (campos.length === 0) return null;

        campos.push('fecha_actualizacion = CURRENT_TIMESTAMP');
        valores.push(id);

        const query = `UPDATE transacciones SET ${campos.join(', ')} WHERE id = ?`;
        this.db.run(query, valores);
        
        this.guardar();
        return this.obtenerTransaccionPorId(id);
    }

    /**
     * Eliminar una transacción
     */
    eliminarTransaccion(id) {
        const antes = this.contarTransacciones();
        this.db.run('DELETE FROM transacciones WHERE id = ?', [id]);
        const despues = this.contarTransacciones();
        
        this.guardar();
        return antes > despues;
    }

    /**
     * Contar total de transacciones
     */
    contarTransacciones() {
        const result = this.db.exec('SELECT COUNT(*) as total FROM transacciones');
        return result[0]?.values[0]?.[0] || 0;
    }

    // ==========================================
    // ESTADÍSTICAS Y REPORTES
    // ==========================================

    /**
     * Obtener resumen agrupado por categoría
     */
    obtenerResumenPorCategoria(fechaInicio = null, fechaFin = null) {
        let query = `
            SELECT 
                categoria,
                COUNT(*) as cantidad,
                SUM(importe) as total,
                AVG(importe) as promedio
            FROM transacciones
            WHERE 1=1
        `;
        const params = [];

        if (fechaInicio) {
            query += ' AND fecha >= ?';
            params.push(fechaInicio);
        }

        if (fechaFin) {
            query += ' AND fecha <= ?';
            params.push(fechaFin);
        }

        query += ' GROUP BY categoria ORDER BY total ASC';

        const stmt = this.db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        
        return results;
    }

    /**
     * Obtener resumen mensual
     */
    obtenerResumenMensual(año = null) {
        let query = `
            SELECT 
                strftime('%Y-%m', fecha) as mes,
                categoria,
                SUM(importe) as total,
                COUNT(*) as cantidad
            FROM transacciones
        `;
        const params = [];

        if (año) {
            query += ' WHERE strftime("%Y", fecha) = ?';
            params.push(año.toString());
        }

        query += ' GROUP BY mes, categoria ORDER BY mes DESC, categoria';

        const stmt = this.db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        
        return results;
    }

    // ==========================================
    // REGLAS DE CLASIFICACIÓN
    // ==========================================

    /**
     * Obtener reglas de clasificación personalizadas
     */
    obtenerReglasClasificacion() {
        const stmt = this.db.prepare('SELECT * FROM reglas_clasificacion');
        
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        
        return results;
    }

    /**
     * Insertar regla de clasificación
     */
    insertarReglaClasificacion(palabraClave, categoria) {
        this.db.run(`
            INSERT OR REPLACE INTO reglas_clasificacion (palabra_clave, categoria)
            VALUES (?, ?)
        `, [palabraClave.toLowerCase(), categoria]);
        
        this.guardar();
        return true;
    }

    /**
     * Cerrar conexión a la base de datos
     */
    cerrar() {
        if (this.db) {
            this.guardar();
            this.db.close();
            console.log('📁 Base de datos cerrada');
        }
    }
}

module.exports = Database;
