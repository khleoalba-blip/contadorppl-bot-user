const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const db = require('./db.cjs');
const { join } = require('path');

const GROUPS_DIR = './data/groups';

function obtenerRutaGrupo(groupId) {
    const dir = join(GROUPS_DIR, groupId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
}

function cargarJSON(ruta, defecto = {}) {
    if (existsSync(ruta)) {
        try { return JSON.parse(readFileSync(ruta, 'utf-8')); } catch (e) {}
    }
    return defecto;
}

function guardarJSON(ruta, datos) {
    writeFileSync(ruta, JSON.stringify(datos, null, 2));
}

// ===== CONFIGURACIÓN GENERAL DEL GRUPO =====
function cargarConfigGrupo(groupId) {
    const datos = db.obtenerGroupData(groupId, 'config');
    if (datos) {
        const defecto = {
            adminPhone: null,
            loteriaActual: "Florida",
            modo: "automatico",
            jornadaAutomatica: true,
            listerosRegistrados: [],
            configPremios: { Parlet: 400, Centena: 400, Fijo: 80, Corrido: 20 },
            barra_interpretacion: "error",
            bancoGroupJid: null,
            ultimaJornadaCerrada: null
        };
        return { ...defecto, ...datos };
    }
    
    // Fallback a archivo
    const ruta = join(obtenerRutaGrupo(groupId), 'config.json');
    const defecto = {
        adminPhone: null,
        loteriaActual: "Florida",
        modo: "automatico",
        jornadaAutomatica: true,
        listerosRegistrados: [],
        configPremios: { Parlet: 400, Centena: 400, Fijo: 80, Corrido: 20 },
        barra_interpretacion: "error",
        bancoGroupJid: null,
        ultimaJornadaCerrada: null
    };
    return cargarJSON(ruta, defecto);
}

function guardarConfigGrupo(groupId, config) {
    db.guardarGroupData(groupId, 'config', config);
    const ruta = join(obtenerRutaGrupo(groupId), 'config.json');
    guardarJSON(ruta, config);
}

function cargarListerosGrupo(groupId) {
    const datos = db.obtenerGroupData(groupId, 'listeros');
    if (datos) return datos;
    const ruta = join(obtenerRutaGrupo(groupId), 'listeros.json');
    return cargarJSON(ruta, {});
}

function guardarListerosGrupo(groupId, listeros) {
    db.guardarGroupData(groupId, 'listeros', listeros);
    const ruta = join(obtenerRutaGrupo(groupId), 'listeros.json');
    guardarJSON(ruta, listeros);
}

function registrarListero(groupId, phone, nombre) {
    const listeros = cargarListerosGrupo(groupId);
    listeros[phone] = { nombre, porciento: 0, deuda: 0, horarioPermitido: "ambos", activo: true };
    guardarListerosGrupo(groupId, listeros);
    return listeros[phone];
}

function eliminarListero(groupId, phone) {
    const listeros = cargarListerosGrupo(groupId);
    delete listeros[phone];
    guardarListerosGrupo(groupId, listeros);
}

// ===== HORARIOS (🆕 ACTUALIZADO con drawTime y nuevas horas) =====
function cargarHorariosGrupo(groupId) {
    const datos = db.obtenerGroupData(groupId, 'horarios');
    if (datos) return datos;
    const ruta = join(obtenerRutaGrupo(groupId), 'horarios.json');
    const defecto = {
        "Florida": {
            "mañana": { inicio: "08:00", fin: "13:10", resultados: "13:36", drawTime: "MIDDAY", dias: ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"] },
            "tarde": { inicio: "14:00", fin: "21:00", resultados: "21:51", drawTime: "EVENING", dias: ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"] }
        }
    };
    return cargarJSON(ruta, defecto);
}


function guardarHorariosGrupo(groupId, horarios) {
    db.guardarGroupData(groupId, 'horarios', horarios);
    const ruta = join(obtenerRutaGrupo(groupId), 'horarios.json');
    guardarJSON(ruta, horarios);
}

module.exports = {
    cargarConfigGrupo, guardarConfigGrupo,
    cargarListerosGrupo, guardarListerosGrupo, registrarListero, eliminarListero,
    cargarHorariosGrupo, guardarHorariosGrupo
};
