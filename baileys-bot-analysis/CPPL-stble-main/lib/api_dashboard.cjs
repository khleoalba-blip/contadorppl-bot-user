// ============================================
// lib/api_dashboard.cjs — API REST para Flutter Dashboard
// Se integra al Express existente del bot ContadorPPL
// ============================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db.cjs');
const { cargarConfigGrupo, guardarConfigGrupo, cargarListerosGrupo, guardarListerosGrupo, cargarHorariosGrupo, guardarHorariosGrupo } = require('./grupo_config.cjs');
const { cargarJornada } = require('./jornadas.cjs');

// ============================================
// ALMACENAMIENTO DE TOKENS Y CÓDIGOS
// ============================================
const pendingCodes = {};    // { phone: { code, expires, attempts } }
const validTokens = {};     // { token: { phone, name, expires } }
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 días
const CODE_EXPIRY = 5 * 60 * 1000;              // 5 minutos
const MAX_CODE_ATTEMPTS = 3;

// ============================================
// HELPERS
// ============================================
function generarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
}

function generarToken() {
    return crypto.randomBytes(32).toString('hex');
}

function limpiarExpirados() {
    const now = Date.now();
    for (const [code, data] of Object.entries(pendingCodes)) {
        if (now > data.expires) delete pendingCodes[code];
    }
    for (const [token, data] of Object.entries(validTokens)) {
        if (now > data.expires) delete validTokens[token];
    }
}
setInterval(limpiarExpirados, 60000);

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    
    const token = authHeader.split(' ')[1];
    const tokenData = validTokens[token];
    
    if (!tokenData || Date.now() > tokenData.expires) {
        delete validTokens[token];
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    
    req.user = tokenData;
    next();
}

// ============================================
// VERIFICACIÓN DE ACCESO (users_access.json)
// ============================================
function verificarAccesoApp(phone) {
    try {
        const usersPath = path.join(__dirname, '..', 'users_access.json');
        if (!fs.existsSync(usersPath)) return false;
        
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
        const user = users.find(u => u.phone === phone);
        
        if (!user) return false;
        
        // Verificar expiración (formato "7d", "30d", "permanent")
        if (user.expires === 'permanent') return true;
        
        const match = user.expires.match(/^(\d+)d$/);
        if (match) {
            // Asumimos que no hay fecha de registro, así que permitimos
            return true;
        }
        
        return true;
    } catch (e) {
        console.error('[API] Error verificando acceso:', e.message);
        return false;
    }
}

function obtenerNombreUsuario(phone) {
    try {
        const usersPath = path.join(__dirname, '..', 'users_access.json');
        if (!fs.existsSync(usersPath)) return null;
        
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
        const user = users.find(u => u.phone === phone);
        return user?.name || null;
    } catch {
        return null;
    }
}

// ============================================
// OBTENER GRUPOS ASIGNADOS A UN ADMIN
// ============================================
function obtenerGruposDeAdmin(adminPhone) {
    const groupsDir = path.join(__dirname, '..', 'data', 'groups');
    if (!fs.existsSync(groupsDir)) return [];
    
    const grupos = [];
    const dirs = fs.readdirSync(groupsDir).filter(d => {
        try { return fs.statSync(path.join(groupsDir, d)).isDirectory(); } catch { return false; }
    });
    
    for (const groupId of dirs) {
        try {
            const config = cargarConfigGrupo(groupId);
            if (config.adminPhone === adminPhone) {
                // Intentar obtener metadata del grupo desde WhatsApp
                const metadata = obtenerMetadataGrupo(groupId);
                grupos.push({
                    id: groupId,
                    name: metadata?.subject || `Grupo ${groupId.slice(0, 8)}`,
                    adminPhone: config.adminPhone,
                    loteriaActual: config.loteriaActual || 'Florida',
                    modo: config.modo || 'automatico',
                    jornadaAutomatica: config.jornadaAutomatica !== false,
                    jornadaActivaId: config.jornadaActivaId || null,
                    memberCount: metadata?.participants?.length || 0,
                    description: metadata?.desc || '',
                    ultimaJornadaCerrada: config.ultimaJornadaCerrada || null
                });
            }
        } catch (e) {
            console.error(`[API] Error leyendo grupo ${groupId}:`, e.message);
        }
    }
    
    return grupos;
}

function obtenerMetadataGrupo(groupId) {
    try {
        const metadataPath = path.join(__dirname, '..', 'data', 'groups', groupId, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        }
    } catch {}
    return null;
}

// ============================================
// REGISTRAR RUTAS EN EXPRESS
// ============================================
function registrarRutas(app, conn) {
    console.log('[API-DASHBOARD] 🚀 Registrando rutas del dashboard...');

    // ─── AUTH ──────────────────────────────────────────
    
    // POST /api/auth/request-code
    app.post('/api/auth/request-code', async (req, res) => {
        try {
            const { phone } = req.body;
            
            if (!phone || !/^\d{7,15}$/.test(phone)) {
                return res.status(400).json({ success: false, error: 'Número de teléfono inválido' });
            }
            
            // Verificar acceso
            if (!verificarAccesoApp(phone)) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Tu número no está autorizado. Contacta al administrador del bot.' 
                });
            }
            
            // Generar código
            const code = generarCodigo();
            pendingCodes[phone] = {
                code,
                expires: Date.now() + CODE_EXPIRY,
                attempts: 0
            };
            
            // Enviar código por WhatsApp
            const nombre = obtenerNombreUsuario(phone) || 'Usuario';
            const jid = phone + '@s.whatsapp.net';
            
            try {
                await conn.sendMessage(jid, {
                    text: `🔐 *Código de Verificación — ContadorPPL Dashboard*\n\n` +
                          `👤 Usuario: *${nombre}*\n` +
                          `📱 Teléfono: +${phone}\n` +
                          `🔢 Código: *${code}*\n\n` +
                          `⏰ Este código expira en *5 minutos*.\n` +
                          `⚠️ Si no solicitaste este código, ignora este mensaje.`
                });
                
                console.log(`[API] ✅ Código enviado a ${phone}: ${code}`);
                res.json({ success: true, message: 'Código enviado por WhatsApp' });
            } catch (e) {
                console.error(`[API] ❌ Error enviando código a ${phone}:`, e.message);
                delete pendingCodes[phone];
                res.status(500).json({ success: false, error: 'Error al enviar el código. Verifica que el bot tenga tu contacto.' });
            }
        } catch (e) {
            console.error('[API] Error en request-code:', e.message);
            res.status(500).json({ success: false, error: 'Error interno del servidor' });
        }
    });
    
    // POST /api/auth/verify-code
    app.post('/api/auth/verify-code', (req, res) => {
        try {
            const { phone, code } = req.body;
            
            if (!phone || !code) {
                return res.status(400).json({ success: false, error: 'Teléfono y código son requeridos' });
            }
            
            const pending = pendingCodes[phone];
            
            if (!pending) {
                return res.status(401).json({ success: false, error: 'No hay código pendiente. Solicita uno nuevo.' });
            }
            
            if (Date.now() > pending.expires) {
                delete pendingCodes[phone];
                return res.status(401).json({ success: false, error: 'Código expirado. Solicita uno nuevo.' });
            }
            
            pending.attempts++;
            if (pending.attempts > MAX_CODE_ATTEMPTS) {
                delete pendingCodes[phone];
                return res.status(429).json({ success: false, error: 'Demasiados intentos. Solicita un nuevo código.' });
            }
            
            if (pending.code !== code) {
                return res.status(401).json({ 
                    success: false, 
                    error: `Código incorrecto. Intentos restantes: ${MAX_CODE_ATTEMPTS - pending.attempts}` 
                });
            }
            
            // Código correcto — generar token
            delete pendingCodes[phone];
            
            const token = generarToken();
            const nombre = obtenerNombreUsuario(phone) || 'Usuario';
            
            validTokens[token] = {
                phone,
                name: nombre,
                expires: Date.now() + TOKEN_EXPIRY
            };
            
            console.log(`[API] ✅ Login exitoso: ${phone} (${nombre})`);
            
            res.json({
                success: true,
                token,
                user: {
                    phone,
                    name: nombre
                }
            });
        } catch (e) {
            console.error('[API] Error en verify-code:', e.message);
            res.status(500).json({ success: false, error: 'Error interno del servidor' });
        }
    });
    
    // POST /api/auth/refresh-token
    app.post('/api/auth/refresh-token', authMiddleware, (req, res) => {
        const oldToken = req.headers.authorization.split(' ')[1];
        const tokenData = validTokens[oldToken];
        
        if (!tokenData) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        
        delete validTokens[oldToken];
        
        const newToken = generarToken();
        validTokens[newToken] = {
            phone: tokenData.phone,
            name: tokenData.name,
            expires: Date.now() + TOKEN_EXPIRY
        };
        
        res.json({ token: newToken });
    });

    // ─── USER ──────────────────────────────────────────
    
    // GET /api/user/profile
    app.get('/api/user/profile', authMiddleware, (req, res) => {
        const nombre = obtenerNombreUsuario(req.user.phone) || req.user.name;
        const grupos = obtenerGruposDeAdmin(req.user.phone);
        
        res.json({
            phone: req.user.phone,
            name: nombre,
            groupCount: grupos.length,
            activeGroups: grupos.filter(g => g.jornadaActivaId).length
        });
    });

    // ─── GRUPOS ────────────────────────────────────────
    
    // GET /api/groups
    app.get('/api/groups', authMiddleware, (req, res) => {
        try {
            const grupos = obtenerGruposDeAdmin(req.user.phone);
            res.json(grupos);
        } catch (e) {
            console.error('[API] Error en GET /groups:', e.message);
            res.status(500).json({ error: 'Error al obtener grupos' });
        }
    });
    
    // GET /api/groups/:id
    app.get('/api/groups/:id', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            // Verificar que el admin sea el usuario
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const metadata = obtenerMetadataGrupo(groupId);
            
            res.json({
                id: groupId,
                name: metadata?.subject || `Grupo ${groupId.slice(0, 8)}`,
                adminPhone: config.adminPhone,
                loteriaActual: config.loteriaActual || 'Florida',
                modo: config.modo || 'automatico',
                jornadaAutomatica: config.jornadaAutomatica !== false,
                jornadaActivaId: config.jornadaActivaId || null,
                configPremios: config.configPremios || { Parlet: 400, Centena: 400, Fijo: 80, Corrido: 20 },
                barraInterpretacion: config.barra_interpretacion || 'error',
                bancoGroupJid: config.bancoGroupJid || null,
                listerosRegistrados: config.listerosRegistrados || [],
                ultimaJornadaCerrada: config.ultimaJornadaCerrada || null,
                memberCount: metadata?.participants?.length || 0,
                isGroupBanca: config.esGrupoBanca || false
            });
        } catch (e) {
            console.error(`[API] Error en GET /groups/${req.params.id}:`, e.message);
            res.status(500).json({ error: 'Error al obtener grupo' });
        }
    });
    
    // PUT /api/groups/:id/config
    app.put('/api/groups/:id/config', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const updates = req.body;
            const allowedFields = [
                'loteriaActual', 'modo', 'jornadaAutomatica',
                'configPremios', 'barraInterpretacion', 'bancoGroupJid'
            ];
            
            for (const key of Object.keys(updates)) {
                if (allowedFields.includes(key)) {
                    config[key] = updates[key];
                }
            }
            
            guardarConfigGrupo(groupId, config);
            console.log(`[API] ✅ Config actualizada para grupo ${groupId}`);
            
            res.json({ success: true, config });
        } catch (e) {
            console.error(`[API] Error en PUT /groups/${req.params.id}/config:`, e.message);
            res.status(500).json({ error: 'Error al actualizar configuración' });
        }
    });
    
    // GET /api/groups/:id/horarios
    app.get('/api/groups/:id/horarios', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const horarios = cargarHorariosGrupo(groupId);
            res.json(horarios);
        } catch (e) {
            console.error(`[API] Error en GET /groups/${req.params.id}/horarios:`, e.message);
            res.status(500).json({ error: 'Error al obtener horarios' });
        }
    });
    
    // PUT /api/groups/:id/horarios
    app.put('/api/groups/:id/horarios', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            guardarHorariosGrupo(groupId, req.body);
            console.log(`[API] ✅ Horarios actualizados para grupo ${groupId}`);
            
            res.json({ success: true });
        } catch (e) {
            console.error(`[API] Error en PUT /groups/${req.params.id}/horarios:`, e.message);
            res.status(500).json({ error: 'Error al actualizar horarios' });
        }
    });

    // ─── LISTEROS ──────────────────────────────────────
    
    // GET /api/groups/:id/listeros
    app.get('/api/groups/:id/listeros', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const listeros = cargarListerosGrupo(groupId);
            
            // Convertir a array
            const lista = Object.entries(listeros).map(([phone, data]) => ({
                phone,
                nombre: data.nombre || 'Sin nombre',
                porciento: data.porciento || 0,
                deuda: data.deuda || 0,
                horarioPermitido: data.horarioPermitido || 'ambos',
                activo: data.activo !== false
            }));
            
            res.json(lista);
        } catch (e) {
            console.error(`[API] Error en GET /groups/${req.params.id}/listeros:`, e.message);
            res.status(500).json({ error: 'Error al obtener listeros' });
        }
    });
    
    // POST /api/groups/:id/listeros
    app.post('/api/groups/:id/listeros', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const { phone, nombre, porciento, horarioPermitido } = req.body;
            
            if (!phone || !nombre) {
                return res.status(400).json({ error: 'Teléfono y nombre son requeridos' });
            }
            
            const listeros = cargarListerosGrupo(groupId);
            
            if (listeros[phone]) {
                return res.status(409).json({ error: 'Este listero ya existe' });
            }
            
            listeros[phone] = {
                nombre,
                porciento: porciento || 0,
                deuda: 0,
                horarioPermitido: horarioPermitido || 'ambos',
                activo: true
            };
            
            guardarListerosGrupo(groupId, listeros);
            
            // Actualizar listerosRegistrados en config
            if (!config.listerosRegistrados) config.listerosRegistrados = [];
            if (!config.listerosRegistrados.includes(phone)) {
                config.listerosRegistrados.push(phone);
                guardarConfigGrupo(groupId, config);
            }
            
            console.log(`[API] ✅ Listero agregado: ${nombre} (${phone}) → grupo ${groupId}`);
            
            res.status(201).json({ success: true, listero: { phone, ...listeros[phone] } });
        } catch (e) {
            console.error(`[API] Error en POST /groups/${req.params.id}/listeros:`, e.message);
            res.status(500).json({ error: 'Error al agregar listero' });
        }
    });
    
    // PUT /api/groups/:id/listeros/:phone
    app.put('/api/groups/:id/listeros/:phone', authMiddleware, (req, res) => {
        try {
            const { id: groupId, phone } = req.params;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const listeros = cargarListerosGrupo(groupId);
            
            if (!listeros[phone]) {
                return res.status(404).json({ error: 'Listero no encontrado' });
            }
            
            const updates = req.body;
            const allowedFields = ['nombre', 'porciento', 'deuda', 'horarioPermitido', 'activo'];
            
            for (const key of Object.keys(updates)) {
                if (allowedFields.includes(key)) {
                    listeros[phone][key] = updates[key];
                }
            }
            
            guardarListerosGrupo(groupId, listeros);
            console.log(`[API] ✅ Listero actualizado: ${phone} → grupo ${groupId}`);
            
            res.json({ success: true, listero: { phone, ...listeros[phone] } });
        } catch (e) {
            console.error(`[API] Error en PUT /groups/${req.params.id}/listeros:`, e.message);
            res.status(500).json({ error: 'Error al actualizar listero' });
        }
    });
    
    // DELETE /api/groups/:id/listeros/:phone
    app.delete('/api/groups/:id/listeros/:phone', authMiddleware, (req, res) => {
        try {
            const { id: groupId, phone } = req.params;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const listeros = cargarListerosGrupo(groupId);
            
            if (!listeros[phone]) {
                return res.status(404).json({ error: 'Listero no encontrado' });
            }
            
            const nombre = listeros[phone].nombre;
            delete listeros[phone];
            guardarListerosGrupo(groupId, listeros);
            
            // Actualizar listerosRegistrados
            if (config.listerosRegistrados) {
                config.listerosRegistrados = config.listerosRegistrados.filter(p => p !== phone);
                guardarConfigGrupo(groupId, config);
            }
            
            console.log(`[API] ✅ Listero eliminado: ${nombre} (${phone}) → grupo ${groupId}`);
            
            res.json({ success: true, message: `Listero ${nombre} eliminado` });
        } catch (e) {
            console.error(`[API] Error en DELETE /groups/${req.params.id}/listeros:`, e.message);
            res.status(500).json({ error: 'Error al eliminar listero' });
        }
    });

    // ─── JORNADAS ──────────────────────────────────────
    
    // GET /api/groups/:id/jornadas
    app.get('/api/groups/:id/jornadas', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const jornadas = [];
            
            // 1. Intentar MongoDB (todas las jornadas del grupo desde caché)
            try {
                const mongoJornadas = db.obtenerTodasJornadasGrupo(groupId);
                if (mongoJornadas && mongoJornadas.length > 0) {
                    for (const data of mongoJornadas) {
                        jornadas.push({
                                id: data.id || '',
                                loteria: data.loteria || 'Florida',
                                turno: data.turno || 'desconocido',
                                estado: data.estado || 'desconocido',
                                inicio: data.inicioReal || data.inicio || null,
                                fin: data.finReal || data.fin || null,
                                pick3: data.pick3 || null,
                                pick4: data.pick4 || null,
                                premiosProcesados: data.premiosProcesados || false,
                                listerosCount: data.listeros ? Object.keys(data.listeros).length : 0,
                                totalPremios: data.premios ? Object.values(data.premios).reduce((acc, tipos) => {
                                    return acc + Object.values(tipos).reduce((a, b) => a + b, 0);
                                }, 0) : 0
                            });
                        }
                    }
                }
            } catch(e) { console.error('[API] Error Mongo jornadas:', e.message); }
            
            // 2. Fallback: leer del subdirectorio jornadas/
            if (jornadas.length === 0) {
                const jornadasDir = path.join(__dirname, '..', 'data', 'groups', groupId, 'jornadas');
                if (fs.existsSync(jornadasDir)) {
                    const files = fs.readdirSync(jornadasDir).filter(f => f.endsWith('.json'));
                    for (const file of files) {
                        try {
                            const data = JSON.parse(fs.readFileSync(path.join(jornadasDir, file), 'utf-8'));
                            jornadas.push({
                                id: data.id || file.replace('.json', ''),
                                loteria: data.loteria || 'Florida',
                                turno: data.turno || 'desconocido',
                                estado: data.estado || 'desconocido',
                                inicio: data.inicioReal || data.inicio || null,
                                fin: data.finReal || data.fin || null,
                                pick3: data.pick3 || null,
                                pick4: data.pick4 || null,
                                premiosProcesados: data.premiosProcesados || false,
                                listerosCount: data.listeros ? Object.keys(data.listeros).length : 0,
                                totalPremios: data.premios ? Object.values(data.premios).reduce((acc, tipos) => {
                                    return acc + Object.values(tipos).reduce((a, b) => a + b, 0);
                                }, 0) : 0
                            });
                        } catch (e) {
                            console.error(`[API] Error leyendo jornada ${file}:`, e.message);
                        }
                    }
                }
            }
            
            // Ordenar por inicio descendente
            jornadas.sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
            
            console.log(`[API] 📋 Jornadas para ${groupId}: ${jornadas.length} encontradas`);
            res.json(jornadas);
        } catch (e) {
            console.error(`[API] Error en GET /groups/${req.params.id}/jornadas:`, e.message);
            res.status(500).json({ error: 'Error al obtener jornadas' });
        }
    });
    
    // GET /api/groups/:id/jornadas/:jornadaId
    app.get('/api/groups/:id/jornadas/:jornadaId', authMiddleware, (req, res) => {
        try {
            const { id: groupId, jornadaId } = req.params;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const jornada = cargarJornada(groupId, jornadaId);
            
            if (!jornada) {
                return res.status(404).json({ error: 'Jornada no encontrada' });
            }
            
            res.json(jornada);
        } catch (e) {
            console.error(`[API] Error en GET /groups/${req.params.id}/jornadas:`, e.message);
            res.status(500).json({ error: 'Error al obtener jornada' });
        }
    });

    // ─── ESTADÍSTICAS ──────────────────────────────────
    
    // GET /api/groups/:id/stats
    app.get('/api/groups/:id/stats', authMiddleware, (req, res) => {
        try {
            const groupId = req.params.id;
            const config = cargarConfigGrupo(groupId);
            
            if (config.adminPhone !== req.user.phone) {
                return res.status(403).json({ error: 'No tienes acceso a este grupo' });
            }
            
            const listeros = cargarListerosGrupo(groupId);
            const listerosCount = Object.keys(listeros).length;
            const listerosActivos = Object.values(listeros).filter(l => l.activo !== false).length;
            
            // Contar jornadas
            const jornadasDir = path.join(__dirname, '..', 'data', 'groups', groupId);
            let jornadasCount = 0;
            let jornadasActivas = 0;
            
            if (fs.existsSync(jornadasDir)) {
                const files = fs.readdirSync(jornadasDir).filter(f => f.endsWith('.json') && f !== 'config.json' && f !== 'listeros.json' && f !== 'horarios.json' && f !== 'metadata.json');
                jornadasCount = files.length;
                
                for (const file of files) {
                    try {
                        const data = JSON.parse(fs.readFileSync(path.join(jornadasDir, file), 'utf-8'));
                        if (data.estado === 'activa') jornadasActivas++;
                    } catch {}
                }
            }
            
            res.json({
                listerosCount,
                listerosActivos,
                jornadasCount,
                jornadasActivas,
                loteriaActual: config.loteriaActual,
                jornadaAutomatica: config.jornadaAutomatica !== false,
                jornadaActiva: config.jornadaActivaId ? true : false,
                modo: config.modo
            });
        } catch (e) {
            console.error(`[API] Error en GET /groups/${req.params.id}/stats:`, e.message);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    });

    console.log('[API-DASHBOARD] ✅ Rutas registradas correctamente');
}

module.exports = { registrarRutas };
