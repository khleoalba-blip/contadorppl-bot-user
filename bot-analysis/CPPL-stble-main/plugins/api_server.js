// ============================================
// API REST para Dashboard Flet
// Expone datos del bot para la app mÃ³vil
// ============================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Seguridad simple: token compartido
const API_TOKEN = process.env.API_TOKEN || 'cppl-dashboard-2024';

function authMiddleware(req, res, next) {
    const token = req.headers['x-api-token'] || req.query.token;
    if (token !== API_TOKEN) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
}

// Verificar si un usuario estÃ¡ autorizado (desde users_access.json)
function verificarAcceso(phone) {
    try {
        const usuarios = JSON.parse(fs.readFileSync(
            path.join(__dirname, '..', 'users_access.json'), 'utf-8'
        ));
        return usuarios.find(u => u.phone === phone) || null;
    } catch (e) {
        return null;
    }
}

// Listar todos los grupos donde un adminPhone es el admin
function listarGruposPorAdmin(adminPhone) {
    const gruposDir = path.join(__dirname, '..', 'data', 'groups');
    const grupos = [];
    
    if (!fs.existsSync(gruposDir)) return grupos;
    
    const dirs = fs.readdirSync(gruposDir);
    for (const dir of dirs) {
        const configPath = path.join(gruposDir, dir, 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (config.adminPhone === adminPhone || !adminPhone) {
                    grupos.push({
                        groupId: dir,
                        ...config,
                        _configPath: configPath
                    });
                }
            } catch (e) {}
        }
    }
    return grupos;
}

// Leer todos los grupos desde MongoDB (si disponible) o archivos
function obtenerTodosLosGrupos(adminPhone) {
    try {
        const db = require('../lib/db.cjs');
        // Leer del cachÃ© de la DB
        const todosLosGrupos = [];
        const groupDataKeys = Object.keys(db.cache?.group_data || {});
        
        for (const key of groupDataKeys) {
            if (key.includes('|config')) {
                const groupId = key.split('|')[0];
                const datos = db.obtenerGroupData(groupId, 'config');
                if (datos && (datos.adminPhone === adminPhone || !adminPhone)) {
                    todosLosGrupos.push({ groupId, ...datos });
                }
            }
        }
        
        // Si no hay datos en MongoDB, usar archivos
        if (todosLosGrupos.length === 0) {
            return listarGruposPorAdmin(adminPhone);
        }
        
        return todosLosGrupos;
    } catch (e) {
        return listarGruposPorAdmin(adminPhone);
    }
}

// ============================================
// RUTAS
// ============================================

// Estado del bot
router.get('/status', authMiddleware, (req, res) => {
    const db = require('../lib/db.cjs');
    res.json({
        online: true,
        mongoActivo: db.estaDisponible(),
        timestamp: new Date().toISOString(),
        version: require('../package.json').version
    });
});

// Login / verificar acceso
router.get('/auth/:phone', (req, res) => {
    const usuario = verificarAcceso(req.params.phone);
    if (usuario) {
        res.json({ autorizado: true, nombre: usuario.name, telefono: usuario.phone });
    } else {
        res.status(403).json({ autorizado: false, error: 'No autorizado' });
    }
});

// Listar grupos del admin
router.get('/groups', authMiddleware, (req, res) => {
    const adminPhone = req.query.adminPhone || '';
    const grupos = obtenerTodosLosGrupos(adminPhone);
    
    // Enriquecer con datos de jornada activa
    const gruposEnriquecidos = grupos.map(g => {
        const tieneJornada = !!g.jornadaActivaId;
        return {
            groupId: g.groupId,
            adminPhone: g.adminPhone,
            loteriaActual: g.loteriaActual || 'Florida',
            modo: g.modo || 'automatico',
            jornadaAutomatica: g.jornadaAutomatica !== false,
            jornadaActiva: tieneJornada,
            jornadaActivaId: g.jornadaActivaId || null,
            listerosCount: g.listerosRegistrados?.length || 0,
            ultimaJornadaCerrada: g.ultimaJornadaCerrada || null
        };
    });
    
    res.json(gruposEnriquecidos);
});

// Obtener config de un grupo
router.get('/groups/:groupId/config', authMiddleware, (req, res) => {
    const { cargarConfigGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const config = cargarConfigGrupo(req.params.groupId);
        res.json(config);
    } catch (e) {
        res.status(404).json({ error: 'Grupo no encontrado', detalle: e.message });
    }
});

// Actualizar config de un grupo
router.put('/groups/:groupId/config', authMiddleware, (req, res) => {
    const { guardarConfigGrupo, cargarConfigGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const configActual = cargarConfigGrupo(req.params.groupId);
        const nuevaConfig = { ...configActual, ...req.body };
        guardarConfigGrupo(req.params.groupId, nuevaConfig);
        res.json({ ok: true, config: nuevaConfig });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar', detalle: e.message });
    }
});

// Obtener listeros de un grupo
router.get('/groups/:groupId/listeros', authMiddleware, (req, res) => {
    const { cargarListerosGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const listeros = cargarListerosGrupo(req.params.groupId);
        // Convertir objeto {phone: data} a array
        const lista = Object.entries(listeros).map(([phone, data]) => ({
            phone,
            nombre: data.nombre,
            porciento: data.porciento || 0,
            deuda: data.deuda || 0,
            horarioPermitido: data.horarioPermitido || 'ambos',
            activo: data.activo !== false
        }));
        res.json(lista);
    } catch (e) {
        res.status(404).json({ error: 'Grupo no encontrado' });
    }
});

// Agregar listero
router.post('/groups/:groupId/listeros', authMiddleware, (req, res) => {
    const { cargarListerosGrupo, guardarListerosGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const { phone, nombre, porciento = 0, horarioPermitido = 'ambos' } = req.body;
        
        if (!phone || !nombre) {
            return res.status(400).json({ error: 'phone y nombre son requeridos' });
        }
        
        const listeros = cargarListerosGrupo(req.params.groupId);
        listeros[phone] = {
            nombre,
            porciento,
            deuda: 0,
            horarioPermitido,
            activo: true
        };
        guardarListerosGrupo(req.params.groupId, listeros);
        
        // Sincronizar con config del grupo (listerosRegistrados)
        const { cargarConfigGrupo, guardarConfigGrupo } = require('../lib/grupo_config.cjs');
        const config = cargarConfigGrupo(req.params.groupId);
        if (!config.listerosRegistrados) config.listerosRegistrados = [];
        if (!config.listerosRegistrados.includes(phone)) {
            config.listerosRegistrados.push(phone);
            guardarConfigGrupo(req.params.groupId, config);
        }
        
        res.json({ ok: true, listero: { phone, ...listeros[phone] } });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar', detalle: e.message });
    }
});

// Actualizar listero
router.put('/groups/:groupId/listeros/:phone', authMiddleware, (req, res) => {
    const { cargarListerosGrupo, guardarListerosGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const listeros = cargarListerosGrupo(req.params.groupId);
        const phone = decodeURIComponent(req.params.phone);
        
        if (!listeros[phone]) {
            return res.status(404).json({ error: 'Listero no encontrado' });
        }
        
        listeros[phone] = { ...listeros[phone], ...req.body };
        guardarListerosGrupo(req.params.groupId, listeros);
        
        res.json({ ok: true, listero: { phone, ...listeros[phone] } });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar', detalle: e.message });
    }
});

// Eliminar listero
router.delete('/groups/:groupId/listeros/:phone', authMiddleware, (req, res) => {
    const { cargarListerosGrupo, guardarListerosGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const listeros = cargarListerosGrupo(req.params.groupId);
        const phone = decodeURIComponent(req.params.phone);
        
        if (!listeros[phone]) {
            return res.status(404).json({ error: 'Listero no encontrado' });
        }
        
        delete listeros[phone];
        guardarListerosGrupo(req.params.groupId, listeros);
        
        // Actualizar listerosRegistrados
        const { cargarConfigGrupo, guardarConfigGrupo } = require('../lib/grupo_config.cjs');
        const config = cargarConfigGrupo(req.params.groupId);
        if (config.listerosRegistrados) {
            config.listerosRegistrados = config.listerosRegistrados.filter(p => p !== phone);
            guardarConfigGrupo(req.params.groupId, config);
        }
        
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar', detalle: e.message });
    }
});

// Obtener jornadas de un grupo
router.get('/groups/:groupId/jornadas', authMiddleware, (req, res) => {
    const db = require('../lib/db.cjs');
    const { cargarConfigGrupo } = require('../lib/grupo_config.cjs');
    
    try {
        const config = cargarConfigGrupo(req.params.groupId);
        const jornadas = [];
        
        // Buscar en el cachÃ© de MongoDB
        const cacheJornadas = db.cache?.jornadas || {};
        for (const [key, datos] of Object.entries(cacheJornadas)) {
            if (key.startsWith(req.params.groupId + '|')) {
                const jornadaId = key.split('|')[1];
                jornadas.push({
                    jornadaId,
                    ...datos,
                    esActiva: config.jornadaActivaId === jornadaId
                });
            }
        }
        
        // Ordenar por fecha (mÃ¡s recientes primero)
        jornadas.sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
        
        res.json(jornadas.slice(0, 20)); // Ãšltimas 20
    } catch (e) {
        res.json([]);
    }
});

// EstadÃ­sticas rÃ¡pidas
router.get('/stats/:adminPhone', authMiddleware, (req, res) => {
    const grupos = obtenerTodosLosGrupos(req.params.adminPhone);
    const db = require('../lib/db.cjs');
    
    let gruposActivos = 0;
    let jornadasActivas = 0;
    let totalListeros = 0;
    
    for (const g of grupos) {
        if (g.jornadaActivaId) jornadasActivas++;
        if (g.listerosRegistrados?.length > 0) totalListeros += g.listerosRegistrados.length;
        gruposActivos++;
    }
    
    res.json({
        gruposActivos,
        jornadasActivas,
        totalListeros,
        totalGrupos: grupos.length
    });
});

// Exportar para integrar en el bot
module.exports = router;

// Si se ejecuta directamente (testing)
if (require.main === module) {
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    app.listen(3001, () => console.log('API Dashboard en puerto 3001'));
}
