/**
 * TransaccionController - Controlador de endpoints REST para transacciones
 */

class TransaccionController {
    /**
     * GET /api/transacciones
     * Obtener todas las transacciones con filtros opcionales
     */
    static obtenerTodas(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const filtros = {
                categoria: req.query.categoria,
                fechaInicio: req.query.fechaInicio,
                fechaFin: req.query.fechaFin,
                busqueda: req.query.busqueda,
                limite: req.query.limite ? parseInt(req.query.limite) : null,
                orden: req.query.orden // 'ASC' o 'DESC'
            };

            const transacciones = ecoSis.obtenerTransacciones(filtros);
            res.json({
                success: true,
                data: transacciones,
                total: transacciones.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/transacciones/:id
     * Obtener una transacción por ID
     */
    static obtenerPorId(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const transaccion = ecoSis.obtenerTransaccionPorId(parseInt(req.params.id));

            if (!transaccion) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Transacción no encontrada' 
                });
            }

            res.json({ success: true, data: transaccion });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/transacciones
     * Crear una nueva transacción
     */
    static crear(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const transaccion = ecoSis.crearTransaccion(req.body);

            res.status(201).json({ 
                success: true, 
                data: transaccion,
                message: 'Transacción creada correctamente'
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * PUT /api/transacciones/:id
     * Actualizar una transacción existente
     */
    static actualizar(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const transaccion = ecoSis.actualizarTransaccion(
                parseInt(req.params.id), 
                req.body
            );

            if (!transaccion) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Transacción no encontrada' 
                });
            }

            res.json({ 
                success: true, 
                data: transaccion,
                message: 'Transacción actualizada correctamente'
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE /api/transacciones/:id
     * Eliminar una transacción
     */
    static eliminar(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const eliminado = ecoSis.eliminarTransaccion(parseInt(req.params.id));

            if (!eliminado) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Transacción no encontrada' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Transacción eliminada correctamente' 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/transacciones/importar
     * Importar transacciones desde archivo
     */
    static async importar(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');

            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No se proporcionó ningún archivo' 
                });
            }

            const tipo = req.file.originalname.endsWith('.json') ? 'json' : 'csv';
            const resultado = await ecoSis.importarTransacciones(req.file.path, tipo);

            res.json({
                success: true,
                data: resultado,
                message: `Importación completada: ${resultado.exitosas} de ${resultado.total} transacciones`
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/transacciones/clasificar
     * Clasificar un concepto
     */
    static clasificar(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const { concepto } = req.body;

            if (!concepto) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'El concepto es requerido' 
                });
            }

            const categoria = ecoSis.clasificarConcepto(concepto);
            res.json({ success: true, data: { concepto, categoria } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/transacciones/reclasificar
     * Reclasificar todas las transacciones
     */
    static reclasificar(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const resultado = ecoSis.reclasificarTodas();

            res.json({
                success: true,
                data: resultado,
                message: `Reclasificadas ${resultado.actualizadas} de ${resultado.total} transacciones`
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/categorias
     * Obtener lista de categorías
     */
    static obtenerCategorias(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const categorias = ecoSis.obtenerCategorias();
            res.json({ success: true, data: categorias });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/estadisticas/categorias
     * Obtener resumen por categorías
     */
    static obtenerResumenCategorias(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const { fechaInicio, fechaFin } = req.query;
            const resumen = ecoSis.obtenerResumenCategorias(fechaInicio, fechaFin);

            res.json({ success: true, data: resumen });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/estadisticas/mensual
     * Obtener resumen mensual
     */
    static obtenerResumenMensual(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const { año } = req.query;
            const resumen = ecoSis.obtenerResumenMensual(año);

            res.json({ success: true, data: resumen });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/estadisticas/balance
     * Obtener balance general
     */
    static obtenerBalance(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const { fechaInicio, fechaFin } = req.query;
            const balance = ecoSis.obtenerBalance(fechaInicio, fechaFin);

            res.json({ success: true, data: balance });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/estado
     * Obtener estado del sistema
     */
    static obtenerEstado(req, res) {
        try {
            const ecoSis = req.app.get('ecoSis');
            const estado = ecoSis.obtenerEstado();
            res.json({ success: true, data: estado });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = TransaccionController;
