// ============================================
// lib/scheduler.cjs — Programador de Jornadas Automáticas (FIXED v2)
// Maneja: inicio, cierre, obtención de resultados vía API
// ============================================

const fs = require('fs');
const path = require('path');
const https = require('https');

const { cargarConfigGrupo, guardarConfigGrupo, cargarHorariosGrupo, cargarListerosGrupo } = require('./grupo_config.cjs');
const { crearJornada, cerrarJornada, cargarJornada, guardarJornada, generarIdJornada, limpiarCacheJornada } = require('./jornadas.cjs');
const { calcularPremios, cargarConfiguracionPremios, cargarUltimaLoteria, cargarListerosPorciento, guardarListerosPorciento } = require('./jugadas.cjs');

const GROUPS_DIR = './data/groups';
const TIMEZONE = 'America/Havana';
const CHECK_INTERVAL = 30000; // 30 segundos

let globalConn = null;
let checkIntervalId = null;
const handledToday = {};       // Acciones ya ejecutadas hoy
const resultAttempts = {};     // Intentos de obtener resultados

// ============================================
// HELPERS DE TIEMPO (100% Cuba)
// ============================================
function getCurrentTime() {
    const now = new Date();
    
    // Forzar extracción en timezone de La Habana
    const havanaStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
    const havana = new Date(havanaStr);
    const hours = havana.getHours();
    const minutes = havana.getMinutes();
    
    // Fecha en formato YYYY-MM-DD (La Habana)
    const dateFormatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' 
    });
    const date = dateFormatter.format(now);
    
    // Día de la semana en español sin tildes
    const dayFormatter = new Intl.DateTimeFormat('es', { 
        timeZone: TIMEZONE, weekday: 'long' 
    });
    const dayRaw = dayFormatter.format(now);
    const day = dayRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    
    return {
        time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        date,
        day
    };
}

function getAllGroupIds() {
    if (!fs.existsSync(GROUPS_DIR)) return [];
    return fs.readdirSync(GROUPS_DIR).filter(d => {
        try { return fs.statSync(path.join(GROUPS_DIR, d)).isDirectory(); } catch { return false; }
    });
}

function isHandled(key) {
    const today = getCurrentTime().date;
    return handledToday[key] === today;
}

function markHandled(key) {
    handledToday[key] = getCurrentTime().date;
}

function cleanupHandled() {
    const today = getCurrentTime().date;
    for (const key of Object.keys(handledToday)) {
        if (handledToday[key] !== today) delete handledToday[key];
    }
    for (const key of Object.keys(resultAttempts)) {
        if (!key.includes(today)) delete resultAttempts[key];
    }
}

// ============================================
// API DE RESULTADOS
// ============================================
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } 
                catch (e) { reject(new Error('JSON parse error')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function obtenerResultados(drawTime) {
    try {
        const [pick3Data, pick4Data] = await Promise.all([
            fetchJson('https://kbolita-1.onrender.com/api/scrape?game=PICK3'),
            fetchJson('https://kbolita-1.onrender.com/api/scrape?game=PICK4')
        ]);
        
        // 🔧 FIX: NO filtrar por fecha del servidor (puede estar mal)
        // Solo buscar por drawTime (MIDDAY/EVENING)
        const pick3Results = (pick3Data?.results || []).filter(r => r.drawTime === drawTime);
        const pick4Results = (pick4Data?.results || []).filter(r => r.drawTime === drawTime);
        
        if (pick3Results.length === 0 || pick4Results.length === 0) {
            console.log(`[SCHEDULER] ⏳ Resultados no disponibles aún para ${drawTime}`);
            return null;
        }
        
        // Tomar el primer resultado (el más reciente)
        const pick3Result = pick3Results[0];
        const pick4Result = pick4Results[0];
        
        console.log(`[SCHEDULER] 🎯 Pick3: ${pick3Result.numbers} | Pick4: ${pick4Result.numbers} | Fecha: ${pick3Result.date}`);
        return { pick3: pick3Result.numbers, pick4: pick4Result.numbers };
        
    } catch (e) {
        console.error(`[SCHEDULER] ❌ Error API resultados:`, e.message);
        return null;
    }
}

// ============================================
// SINCRONIZAR PORCIENTO grupo → admin
// ============================================
function sincronizarPorcientoGrupo(groupId, adminPhone) {
    try {
        const listerosGrupo = cargarListerosGrupo(groupId);
        const loteria = cargarUltimaLoteria(adminPhone);
        const porcientoAdmin = cargarListerosPorciento(adminPhone, loteria);
        
        for (const [phone, data] of Object.entries(listerosGrupo)) {
            const nombre = data.nombre;
            if (!nombre) continue;
            if (!porcientoAdmin[nombre]) porcientoAdmin[nombre] = { porciento: 0, deuda: 0 };
            porcientoAdmin[nombre].porciento = data.porciento || 0;
        }
        
        guardarListerosPorciento(adminPhone, porcientoAdmin, loteria);
    } catch (e) {
        console.error('[SCHEDULER] Error sincronizando porciento:', e.message);
    }
}

// ============================================
// GENERAR TIKE (para resultados automáticos)
// ============================================
function generarTikeResultados(adminPhone, listeros, premios, detalles, totalesListeros, pick3, pick4) {
    const loteria = cargarUltimaLoteria(adminPhone);
    const listerosPorciento = cargarListerosPorciento(adminPhone, loteria);
    
    let tike = `✏️🗒️Cortes de Listeros: \n\n`;
    
    for (const [listero, tipos] of Object.entries(premios)) {
        const totalListero = totalesListeros[listero] || 0;
        tike += `📋Listero: ${listero} \n`;
        tike += `#Ganadores: ${pick3} ${pick4} \n`;
        
        let totalJugado = 0;
        if (listeros[listero]) {
            for (const tipoJugada of Object.values(listeros[listero])) {
                totalJugado += Object.values(tipoJugada).reduce((a, b) => a + b, 0);
            }
        }
        tike += `💰Total recogido: ${totalJugado} cup \n`;
        
        const datosListero = listerosPorciento[listero] || { porciento: 0, deuda: 0 };
        const porcentaje = datosListero.porciento || 0;
        const montoPorcentaje = totalJugado - (totalJugado * porcentaje / 100);
        
        tike += `📝Recogido - ${porcentaje}%: ${Math.round(montoPorcentaje)} cup \n`;
        tike += `🏆Total premio: ${totalListero} cup \n`;
        
        for (const [tipo, monto] of Object.entries(tipos)) {
            const montosVistos = new Set();
            let montoJugado = 0;
            if (detalles[listero]?.[tipo]) {
                for (const detalle of detalles[listero][tipo]) {
                    if (!montosVistos.has(detalle)) {
                        montosVistos.add(detalle);
                        const partes = detalle.split('-');
                        montoJugado += parseInt(partes[partes.length - 1]) || 0;
                    }
                }
            }
            tike += `  ${tipo}: ${montoJugado} -> ${monto} CUP\n`;
            if (detalles[listero]?.[tipo]) {
                for (const det of detalles[listero][tipo]) tike += `     ${det}\n`;
            }
        }
        tike += `\n`;
        
        const balance = montoPorcentaje - totalListero;
        if (balance > 0) tike += `🫵🫰 Debes: ${Math.round(balance)} CUP\n`;
        else if (balance < 0) tike += `🥳🎉 Ganaste: ${Math.abs(Math.round(balance))} CUP\n`;
        else tike += `Balance neutro en lista\n`;
        tike += `⚡⚡⚡⚡⚡⚡⚡⚡\n\n\n`;
    }
    
    const listerosConPremio = new Set(Object.keys(premios));
    for (const [listero, tipos] of Object.entries(listeros)) {
        if (listerosConPremio.has(listero)) continue;
        let totalJugado = 0;
        for (const tipoJugada of Object.values(tipos)) totalJugado += Object.values(tipoJugada).reduce((a, b) => a + b, 0);
        const datosListero = listerosPorciento[listero] || { porciento: 0, deuda: 0 };
        const porcentaje = datosListero.porciento || 0;
        let montoPorcentaje = totalJugado - (totalJugado * porcentaje / 100);
        if (montoPorcentaje === 0) montoPorcentaje = totalJugado;
        tike += `📋Listeros: ${listero} \n#Ganadores: ${pick3} ${pick4} \n💰Total recogido: ${totalJugado} cup \n📝Recogido - ${porcentaje}%: ${Math.round(montoPorcentaje)} cup \n🏆Total premio: 👌Sin premio \n\n🫵🫰 Debes: ${Math.round(montoPorcentaje)} cup \n⚡⚡⚡⚡⚡⚡⚡⚡ \n\n\n`;
    }
    return tike.trim();
}

// ============================================
// PROCESAR RESULTADOS DE UN GRUPO (FIXED: usa conn pasado)
// ============================================
async function procesarResultadosGrupo(groupId, turno, drawTime, resultados, connOverride) {
    // 🔧 FIX: Usar conn pasado o globalConn como fallback
    const conn = connOverride || globalConn;
    
    const config = cargarConfigGrupo(groupId);
    const adminPhone = config.adminPhone;
    if (!adminPhone || !conn) return;
    
    const loteria = config.loteriaActual || 'Florida';
    const jornadaId = generarIdJornada(loteria, turno);
    const jornada = cargarJornada(groupId, jornadaId);
    
    if (!jornada || jornada.premiosProcesados) return;
    
    const { pick3, pick4 } = resultados;
    const groupJid = groupId.includes('@g.us') ? groupId : groupId + '@g.us';
    
    // 🔧 FIX: Si no hay jugadas, enviar mensaje con resultados
    if (!jornada.listeros || Object.keys(jornada.listeros).length === 0) {
        console.log(`[SCHEDULER] ⚠️ Jornada ${jornadaId} sin jugadas, enviando resultados sin premios`);
        
        jornada.pick3 = pick3;
        jornada.pick4 = pick4;
        jornada.premiosProcesados = true;
        guardarJornada(groupId, jornadaId, jornada);
        
        let msg = `🎰 *RESULTADOS — ${loteria} ${turno}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `🏆 Pick3: *${pick3}* | Pick4: *${pick4}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `\n😊 *Sin jugadas registradas en esta jornada.*\n`;
        msg += `📝 Usa \`.premios ${pick3} ${pick4}\` cuando tengas jugadas.`;
        
        try {
            await conn.sendMessage(groupJid, { text: msg });
            console.log(`[SCHEDULER] ✅ Mensaje de sin jugadas enviado`);
        } catch (e) {
            console.error('[SCHEDULER] ❌ Error enviando mensaje:', e.message);
        }
        return;
    }
    
    // Si HAY jugadas, procesar normalmente
    sincronizarPorcientoGrupo(groupId, adminPhone);
    
    const configPremios = cargarConfiguracionPremios(adminPhone, loteria);
    const { premios, detalles, ganadorFijo, ganadorCentena, corridos, parletsGanadores } = 
        calcularPremios(adminPhone, jornada.listeros, pick3, pick4, configPremios);
    
    let totalGeneral = 0;
    const totalesListeros = {};
    for (const [listero, tipos] of Object.entries(premios)) {
        const total = Object.values(tipos).reduce((acc, val) => acc + val, 0);
        totalesListeros[listero] = total;
        totalGeneral += total;
    }
    
    jornada.pick3 = pick3;
    jornada.pick4 = pick4;
    jornada.premiosProcesados = true;
    jornada.premios = premios;
    guardarJornada(groupId, jornadaId, jornada);
    
    let msg = `🎰 *RESULTADOS AUTOMÁTICOS — ${loteria} ${turno}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏆 Pick3: *${pick3}* | Pick4: *${pick4}*\n`;
    msg += `✔️ Fijo: ${ganadorFijo} | Centena: ${ganadorCentena}\n`;
    msg += `✔️ Corridos: ${corridos.join(', ')}\n`;
    msg += `✔️ Parlets: ${parletsGanadores.join(', ')}\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    
    if (totalGeneral > 0) {
        msg += `💰 *Total a pagar: ${totalGeneral} CUP*\n\n`;
        for (const [listero, tipos] of Object.entries(premios)) {
            const totalListero = totalesListeros[listero];
            let totalJugado = 0;
            if (jornada.listeros[listero]) {
                for (const tipoJ of Object.values(jornada.listeros[listero])) {
                    totalJugado += Object.values(tipoJ).reduce((a, b) => a + b, 0);
                }
            }
            const listerosPorciento = cargarListerosPorciento(adminPhone, loteria);
            const datosL = listerosPorciento[listero] || { porciento: 0 };
            const porcentaje = datosL.porciento || 0;
            const despuesPorc = totalJugado - (totalJugado * porcentaje / 100);
            const balance = despuesPorc - totalListero;
            
            msg += `📋 *${listero}* — Premio: ${totalListero} CUP\n`;
            if (balance > 0) msg += `   📈 Ganancia: ${Math.round(balance)} CUP\n`;
            else if (balance < 0) msg += `   📉 Pérdida: ${Math.abs(Math.round(balance))} CUP\n`;
        }
    } else {
        msg += `\n😊 *¡Sin premios!* Todos ganan.\n`;
    }
    
    try {
        await conn.sendMessage(groupJid, { text: msg });
    } catch (e) {
        console.error('[SCHEDULER] Error enviando resultados:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    const tike = generarTikeResultados(adminPhone, jornada.listeros, premios, detalles, totalesListeros, pick3, pick4);
    if (tike) {
        try {
            await conn.sendMessage(groupJid, { text: tike });
        } catch (e) {
            console.error('[SCHEDULER] Error enviando tike:', e.message);
        }
    }
    
    console.log(`[SCHEDULER] ✅ Resultados procesados para grupo ${groupId} - ${turno}`);
}

// ============================================
// CICLO PRINCIPAL DE VERIFICACIÓN (CON LOGS)
// ============================================
async function check() {
    cleanupHandled();
    
    const { time, date, day } = getCurrentTime();
    const groupIds = getAllGroupIds();
    
    // Log cada 5 minutos para confirmar que está vivo
    if (time.endsWith(':00') || time.endsWith(':30')) {
        console.log(`[SCHEDULER] ⏰ Vivo | Havana: ${time} | ${date} | ${day} | Grupos: ${groupIds.length}`);
    }
    
    for (const groupId of groupIds) {
        try {
            const config = cargarConfigGrupo(groupId);

            // CHECK 2: FALTA ADMIN PHONE
            if (!config.adminPhone) {
                const warnKey = `${groupId}_warn_admin_${date}`;
                if (!isHandled(warnKey)) {
                    console.error(`[SCHEDULER] ❌ SALTANDO ${groupId}: Falta adminPhone.`);
                    markHandled(warnKey);
                }
                continue;
            }            
            // CHECK 1: Jornadas automáticas desactivadas
            if (!config.jornadaAutomatica) continue;
            
            
            
            const loteria = config.loteriaActual || 'Florida';
            const horarios = cargarHorariosGrupo(groupId);
            const turnoHorarios = horarios[loteria];
            
            // CHECK 3: FALTAN HORARIOS
            if (!turnoHorarios) {
                const warnKey = `${groupId}_warn_horario_${date}`;
                if (!isHandled(warnKey)) {
                    console.error(`[SCHEDULER] ❌ SALTANDO ${groupId}: Sin horarios para "${loteria}".`);
                    markHandled(warnKey);
                }
                continue;
            }
            
            for (const [turno, horario] of Object.entries(turnoHorarios)) {
                // 🔧 FIX: Normalizar días para comparar sin tildes
                const diasNorm = (horario.dias || []).map(d => d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
                if (!diasNorm.length || !diasNorm.includes(day)) continue;
                
                const inicioKey = `${groupId}_${turno}_inicio_${date}`;
                const finKey = `${groupId}_${turno}_fin_${date}`;
                const resultadosKey = `${groupId}_${turno}_resultados_${date}`;
                
                // ────── INICIO ──────
                if (time >= horario.inicio && time < horario.fin && !isHandled(inicioKey)) {
                    console.log(`[SCHEDULER] 🔄 [INICIO] ${time} >= ${horario.inicio} | Grupo: ${groupId} | Turno: ${turno}`);
                    
                    const configFresh = cargarConfigGrupo(groupId);
                    // 🔧 FIX: Si falta adminPhone, no crear jornada
                    if (!configFresh.adminPhone) {
                        const warnKeyNoAdmin = `${groupId}_warn_noadmin_${date}`;
                        if (!isHandled(warnKeyNoAdmin)) {
                            console.error(`[SCHEDULER] ❌ SALTANDO ${groupId}: Falta adminPhone. Usa .suma inicio primero.`);
                            markHandled(warnKeyNoAdmin);
                        }
                        continue;
                    }                    
                    if (!configFresh.jornadaActivaId) {
                        sincronizarPorcientoGrupo(groupId, configFresh.adminPhone);
                        
                        const jornada = crearJornada(groupId, loteria, turno);
                        markHandled(inicioKey);
                        
                        console.log(`[SCHEDULER] 🌅 JORNADA INICIADA: ${jornada.id}`);
                        
                        const groupJid = groupId.includes('@g.us') ? groupId : groupId + '@g.us';
                        if (globalConn) {
                            try {
                                await globalConn.sendMessage(groupJid, { 
                                    text: `🌅 *Jornada de ${loteria} (${turno}) INICIADA automáticamente*\n\n📩 Los listeros pueden enviar jugadas.\n⏰ Cierra a las ${horario.fin}` 
                                });
                                console.log(`[SCHEDULER] ✅ Mensaje de inicio enviado`);
                            } catch (e) {
                                console.error(`[SCHEDULER] ❌ Error enviando mensaje inicio:`, e.message);
                            }
                        } else {
                            console.error(`[SCHEDULER] ❌ globalConn es NULL`);
                        }
                    } else {
                        console.log(`[SCHEDULER] ⏭️ Ya existe jornada activa: ${configFresh.jornadaActivaId}`);
                        markHandled(inicioKey);
                    }
                }
                
                // ────── FIN ──────
                if (time >= horario.fin && !isHandled(finKey)) {
                    console.log(`[SCHEDULER] 🔄 [FIN] ${time} >= ${horario.fin} | Grupo: ${groupId} | Turno: ${turno}`);
                    
                    const configFresh = cargarConfigGrupo(groupId);
                    if (configFresh.jornadaActivaId) {
                        cerrarJornada(groupId, configFresh.jornadaActivaId);
                        markHandled(finKey);
                        
                        console.log(`[SCHEDULER] ⛔ JORNADA CERRADA`);
                        
                        const groupJid = groupId.includes('@g.us') ? groupId : groupId + '@g.us';
                        if (globalConn) {
                            try {
                                await globalConn.sendMessage(groupJid, { 
                                    text: `⛔ *Jornada cerrada automáticamente*\n\n⏳ Resultados a las ${horario.resultados}...` 
                                });
                                console.log(`[SCHEDULER] ✅ Mensaje de cierre enviado`);
                            } catch (e) {
                                console.error(`[SCHEDULER] ❌ Error enviando mensaje cierre:`, e.message);
                            }
                        }
                    } else {
                        console.log(`[SCHEDULER] ⏭️ No hay jornada activa para cerrar`);
                        markHandled(finKey);
                    }
                }
                
                // ────── RESULTADOS ──────
                if (time >= horario.resultados && !isHandled(resultadosKey)) {
                    console.log(`[SCHEDULER] 🔄 [RESULTADOS] ${time} >= ${horario.resultados} | Grupo: ${groupId}`);
                    
                    const drawTime = horario.drawTime || (turno === 'mañana' ? 'MIDDAY' : 'EVENING');
                    const jornadaId = generarIdJornada(loteria, turno);
                    const jornada = cargarJornada(groupId, jornadaId);
                    
                    if (jornada && !jornada.premiosProcesados && jornada.estado === 'cerrada') {
                        console.log(`[SCHEDULER] 🌐 Consultando API ${drawTime}...`);
                        const resultados = await obtenerResultados(drawTime);
                        
                        if (resultados) {
                            markHandled(resultadosKey);
                            delete resultAttempts[resultadosKey];
                            await procesarResultadosGrupo(groupId, turno, drawTime, resultados);
                        } else {
                            const attempts = (resultAttempts[resultadosKey] || 0) + 1;
                            resultAttempts[resultadosKey] = attempts;
                            console.log(`[SCHEDULER] ⏳ Intento ${attempts}/10 sin resultados`);
                            
                            if (attempts >= 10) {
                                markHandled(resultadosKey);
                                delete resultAttempts[resultadosKey];
                                
                                const groupJid = groupId.includes('@g.us') ? groupId : groupId + '@g.us';
                                if (globalConn) {
                                    try {
                                        await globalConn.sendMessage(groupJid, { 
                                            text: `⚠️ *No se pudieron obtener los resultados automáticamente*\n\n📝 Usa \`.premios XXX XXXX\` manualmente.` 
                                        });
                                    } catch (e) {}
                                }
                            }
                        }
                    } else {
                        console.log(`[SCHEDULER] ⏭️ Resultados ya procesados o jornada no cerrada`);
                        markHandled(resultadosKey);
                    }
                }
            }
        } catch (err) {
            console.error(`[SCHEDULER] ❌ Error en grupo ${groupId}:`, err.message);
        }
    }
}

// ============================================
// START / STOP (FIXED: No sobreescribir globalConn)
// ============================================
function start(conn) {
    // 🔧 FIX: Si ya está corriendo, NO reemplazar globalConn
    // (el conn del handler no tiene sendMessage)
    if (checkIntervalId) {
        console.log('[SCHEDULER] ⚠️ Scheduler ya corriendo, conexión ignorada.');
        return;
    }
    
    // Verificar que conn tenga sendMessage
    if (!conn || typeof conn.sendMessage !== 'function') {
        console.error('[SCHEDULER] ❌ conn no tiene sendMessage, no se puede iniciar.');
        return;
    }
    
    globalConn = conn;
    
    const testTime = getCurrentTime();
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║        🕐 SCHEDULER DE JORNADAS ACTIVADO           ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  🌍 Timezone: ${TIMEZONE.padEnd(37)}║`);
    console.log(`║  🕐 Hora Cuba: ${testTime.time.padEnd(36)}║`);
    console.log(`║  📅 Fecha Cuba: ${testTime.date.padEnd(35)}║`);
    console.log(`║  📆 Día Cuba: ${testTime.day.padEnd(38)}║`);
    console.log(`║  ⏱️  Intervalo: Cada ${String(CHECK_INTERVAL / 1000).padEnd(29)}s ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    
    // 🔧 FIX: Bloqueo inteligente de catch-up
    // - Si hay jornada activa: solo bloqueamos "inicio" (ya está iniciada)
    // - Si NO hay jornada activa: bloqueamos todo (evitar crear a destiempo)
    // - "fin" y "resultados" NUNCA se bloquean para jornadas activas
    const today = getCurrentTime().date;
    const allGroups = getAllGroupIds();
    let bloqueadosInicio = 0;
    let bloqueadosTodo = 0;
    
    for (const gid of allGroups) {
        const config = cargarConfigGrupo(gid);
        const loteria = config.loteriaActual || 'Florida';
        
        for (const turno of ['mañana', 'tarde']) {
            const jornadaId = generarIdJornada(loteria, turno);
            const jornada = cargarJornada(gid, jornadaId);
            
            if (jornada && jornada.estado === 'activa') {
                // ✅ Jornada activa: solo bloqueamos inicio, dejamos fin+resultados
                handledToday[`${gid}_${turno}_inicio_${today}`] = today;
                bloqueadosInicio++;
            } else {
                // 🛡️ Sin jornada activa: bloqueamos todo (catch-up total)
                handledToday[`${gid}_${turno}_inicio_${today}`] = today;
                handledToday[`${gid}_${turno}_fin_${today}`] = today;
                handledToday[`${gid}_${turno}_resultados_${today}`] = today;
                bloqueadosTodo++;
            }
        }
    }
    console.log(`[SCHEDULER] 🛡️ Catch-up bloqueado → ${bloqueadosInicio} turnos activos protegidos, ${bloqueadosTodo} turnos inactivos bloqueados`);
    
    // Primera verificación en 30 segundos
    setTimeout(() => {
        check();
        checkIntervalId = setInterval(check, CHECK_INTERVAL);
    }, 30000);
}

function stop() {
    if (checkIntervalId) {
        clearInterval(checkIntervalId);
        checkIntervalId = null;
    }
    console.log('[SCHEDULER] 🛑 Programador detenido');
}

function forceCheck() {
    console.log('[SCHEDULER] 🔄 Verificación forzada...');
    return check();
}

function determinarTurno() {
    const { time } = getCurrentTime();
    const [hora] = time.split(':').map(Number);
    
    if (hora < 13) return { turno: 'mañana', drawTime: 'MIDDAY' };
    return { turno: 'tarde', drawTime: 'EVENING' };
}

module.exports = { 
    start, stop, forceCheck, check, 
    obtenerResultados, getCurrentTime, determinarTurno,
    procesarResultadosGrupo
};
