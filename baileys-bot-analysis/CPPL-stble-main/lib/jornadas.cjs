const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const db = require('./db.cjs');
const { join } = require('path');
const { cargarConfigGrupo, guardarConfigGrupo } = require('./grupo_config.cjs');

const GROUPS_DIR = './data/groups';

function obtenerRutaGrupo(groupId) {
    const dir = join(GROUPS_DIR, groupId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
}

// 🆕 Generar ID con timezone de La Habana (consistente con el scheduler)
function generarIdJornada(loteria, turno) {
    const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Havana',
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const fecha = formatter.format(new Date()); // YYYY-MM-DD
    return `${fecha}_${loteria.toLowerCase()}_${turno}`;
}

function cargarJornada(groupId, jornadaId) {
    const datos = db.obtenerJornada(groupId, jornadaId);
    if (datos) return datos;
    
    const ruta = join(obtenerRutaGrupo(groupId), 'jornadas', `${jornadaId}.json`);
    if (existsSync(ruta)) {
        try { return JSON.parse(readFileSync(ruta, 'utf-8')); } catch (e) {}
    }
    return null;
}

function guardarJornada(groupId, jornadaId, data) {
    db.guardarJornadaDoc(groupId, jornadaId, data);
    
    const dir = join(obtenerRutaGrupo(groupId), 'jornadas');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ruta = join(dir, `${jornadaId}.json`);
    writeFileSync(ruta, JSON.stringify(data, null, 2));
}
function crearJornada(groupId, loteria, turno) {
    const jornadaId = generarIdJornada(loteria, turno);
    let jornada = cargarJornada(groupId, jornadaId);
    
    if (jornada && jornada.estado === 'activa') return jornada;
    
    jornada = {
        id: jornadaId, fecha: new Date().toISOString(),
        loteria, turno, estado: 'activa',
        inicioReal: new Date().toISOString(), finReal: null,
        mensajes: [],
        acumulacion: { Fijo: {}, Corrido: {}, Centena: {}, Parlet: {} },
        listeros: {},
        premios: null, pick3: null, pick4: null,
        premiosProcesados: false          // 🆕 Campo para el scheduler
    };
    
    guardarJornada(groupId, jornadaId, jornada);
    
    const config = cargarConfigGrupo(groupId);
    config.jornadaActivaId = jornadaId;
    guardarConfigGrupo(groupId, config);
    
    return jornada;
}

function cerrarJornada(groupId, jornadaId) {
    limpiarCacheJornada(groupId, jornadaId);
    const jornada = cargarJornada(groupId, jornadaId);
    if (!jornada) return null;
    
    jornada.estado = 'cerrada';
    jornada.finReal = new Date().toISOString();
    guardarJornada(groupId, jornadaId, jornada);
    
    const config = cargarConfigGrupo(groupId);
    if (config.jornadaActivaId === jornadaId) {
        config.jornadaActivaId = null;
        config.ultimaJornadaCerrada = jornadaId; // 🆕 Guardar referencia
        guardarConfigGrupo(groupId, config);
    }
    
    return jornada;
}

function agregarMensajeJornada(groupId, jornadaId, msgData) {
    const jornada = cargarJornada(groupId, jornadaId);
    if (!jornada || jornada.estado !== 'activa') return null;
    
    msgData.numero = jornada.mensajes.length + 1;
    jornada.mensajes.push(msgData);
    
    if (msgData.valido && msgData.jugadas) {
        for (const [tipo, nums] of Object.entries(msgData.jugadas)) {
            if (!jornada.acumulacion[tipo]) jornada.acumulacion[tipo] = {};
            for (const [num, monto] of Object.entries(nums)) {
                jornada.acumulacion[tipo][num] = (jornada.acumulacion[tipo][num] || 0) + monto;
            }
        }
        
        const listero = msgData.listeroNombre;
        if (!jornada.listeros[listero]) jornada.listeros[listero] = { Fijo: {}, Corrido: {}, Centena: {}, Parlet: {} };
        for (const [tipo, nums] of Object.entries(msgData.jugadas)) {
            if (!jornada.listeros[listero][tipo]) jornada.listeros[listero][tipo] = {};
            for (const [num, monto] of Object.entries(nums)) {
                jornada.listeros[listero][tipo][num] = (jornada.listeros[listero][tipo][num] || 0) + monto;
            }
        }
    }
    
    guardarJornada(groupId, jornadaId, jornada);
    return msgData.numero;
}

// ============================================
// SISTEMA DE CACHÉ EN MEMORIA (ALTO RENDIMIENTO)
// ============================================
const jornadasCache = {};
let saveTimers = {};

function cargarJornadaEnMemoria(groupId, jornadaId) {
    const key = `${groupId}_${jornadaId}`;
    if (jornadasCache[key]) return jornadasCache[key];
    const data = cargarJornada(groupId, jornadaId);
    if (data) jornadasCache[key] = data;
    return data;
}

function guardarJornadaDebounced(groupId, jornadaId) {
    const key = `${groupId}_${jornadaId}`;
    if (!saveTimers[key]) saveTimers[key] = {};
    
    // 🔧 FIX: Solo como RESPALDO si MongoDB falla
    if (saveTimers[key][jornadaId]) return;
    
    saveTimers[key][jornadaId] = setTimeout(() => {
        delete saveTimers[key][jornadaId];
        // Solo guardar en archivo si MongoDB no guardó
        const datosCache = jornadasCache[key];
        if (!datosCache) return;
        
        const dir = join(obtenerRutaGrupo(groupId), 'jornadas');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const ruta = join(dir, `${jornadaId}.json`);
        writeFileSync(ruta, JSON.stringify(datosCache, null, 2));
        console.log(`[CACHE-FILE] 💾 Jornada ${jornadaId} respaldo guardado en archivo`);
    }, 500);
}
function agregarMensajeJornadaRapido(groupId, jornadaId, msgData) {
    const jornada = cargarJornadaEnMemoria(groupId, jornadaId);
    if (!jornada || jornada.estado !== 'activa') return null;
    
    if (!jornada.mensajes) jornada.mensajes = [];
    if (!jornada.acumulacion) jornada.acumulacion = { Fijo: {}, Corrido: {}, Centena: {}, Parlet: {} };
    if (!jornada.listeros) jornada.listeros = {};
    msgData.numero = jornada.mensajes.length + 1;
    jornada.mensajes.push(msgData);
    
    // 🔧 FIX: Verificar que jugadas exista y sea objeto
    const tieneJugadas = msgData.valido && 
                         msgData.jugadas !== null && 
                         typeof msgData.jugadas === 'object' &&
                         Object.keys(msgData.jugadas).length > 0;
    
    if (tieneJugadas) {
        // Acumulación global
        for (const [tipo, nums] of Object.entries(msgData.jugadas)) {
            if (!jornada.acumulacion[tipo]) jornada.acumulacion[tipo] = {};
            for (const [num, monto] of Object.entries(nums)) {
                jornada.acumulacion[tipo][num] = (jornada.acumulacion[tipo][num] || 0) + monto;
            }
        }
        
        // Por listero
        const listero = msgData.listeroNombre;
        if (listero && typeof listero === 'string') {
            if (!jornada.listeros[listero]) {
                jornada.listeros[listero] = { Fijo: {}, Corrido: {}, Centena: {}, Parlet: {} };
            }
            for (const [tipo, nums] of Object.entries(msgData.jugadas)) {
                if (!jornada.listeros[listero][tipo]) {
                    jornada.listeros[listero][tipo] = {};
                }
                for (const [num, monto] of Object.entries(nums)) {
                    jornada.listeros[listero][tipo][num] = (jornada.listeros[listero][tipo][num] || 0) + monto;
                }
            }
        }
    }
    
    // Guardar en MongoDB inmediatamente
    guardarJornada(groupId, jornadaId, jornada);
    
    // Guardar en archivo como respaldo (500ms delay)
    guardarJornadaDebounced(groupId, jornadaId);
    
    return msgData.numero;
}
    



function limpiarCacheJornada(groupId, jornadaId) {
    const key = `${groupId}_${jornadaId}`;
    if (jornadasCache[key]) {
        if (saveTimers[key]) clearTimeout(saveTimers[key]);
        guardarJornada(groupId, jornadaId, jornadasCache[key]);
        delete jornadasCache[key];
        delete saveTimers[key];
    }
}

module.exports = { 
    generarIdJornada, cargarJornada, guardarJornada, crearJornada, cerrarJornada, 
    agregarMensajeJornada,
    cargarJornadaEnMemoria, agregarMensajeJornadaRapido, limpiarCacheJornada 
};
