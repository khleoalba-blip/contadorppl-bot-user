// ============================================
// lib/db.cjs — Capa de persistencia con CACHÉ SÍNCRONO
// Todas las lecturas son síncronas (del caché)
// Las escrituras actualizan caché + MongoDB en background
// ============================================

const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let mongoDisponible = false;

// 🆕 CACHÉ EN MEMORIA (síncrono)
const cache = {
    users: null,
    user_data: {},
    group_data: {},
    jornadas: {}
};

// ============================================
// CONEXIÓN + CARGAR TODO A CACHÉ
// ============================================
async function init() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('[DB] ⚠️ Sin MONGODB_URI, usando archivos locales');
        return false;
    }
    
    try {
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        
        await client.connect();
        db = client.db('contadorppl');
        
        // 🆕 Cargar TODO de MongoDB a caché
        await cargarTodoACache();
        
        mongoDisponible = true;
        console.log('[DB] ✅ Conectado a MongoDB Atlas (caché sincrono)');
        return true;
    } catch (e) {
        console.error('[DB] ❌ Error MongoDB:', e.message);
        console.log('[DB] ⚠️ Usando archivos locales');
        return false;
    }
}

async function cargarTodoACache() {
    let countUsers = 0;
    let countUserData = 0;
    let countGroupData = 0;
    let countJornadas = 0;
    
    // Cargar usuarios
    try {
        const doc = await db.collection('users').findOne({ _id: 'main' });
        if (doc?.usuarios) {
            cache.users = doc.usuarios;
            countUsers = doc.usuarios.length;
        }
    } catch (e) {}
    
    // Cargar user_data
    try {
        const docs = await db.collection('user_data').find({}).toArray();
        for (const doc of docs) {
            cache.user_data[`${doc.userId}|${doc.clave}`] = doc.datos;
            countUserData++;
        }
    } catch (e) {}
    
    // Cargar group_data
    try {
        const docs = await db.collection('group_data').find({}).toArray();
        for (const doc of docs) {
            cache.group_data[`${doc.groupId}|${doc.clave}`] = doc.datos;
            countGroupData++;
            
            // Forzar actualización de horarios (agregar domingo)
            if (doc.clave === 'horarios' && doc.datos) {
                let actualizado = false;
                for (const [loteria, turnos] of Object.entries(doc.datos)) {
                    for (const [turno, horario] of Object.entries(turnos)) {
                        if (horario.dias && !horario.dias.includes('domingo')) {
                            horario.dias.push('domingo');
                            actualizado = true;
                        }
                    }
                }
                if (actualizado) {
                    db.collection('group_data').updateOne(
                        { groupId: doc.groupId, clave: 'horarios' },
                        { $set: { datos: doc.datos } }
                    ).catch(() => {});
                }
            }
        }
    } catch (e) {}
    
    // Cargar jornadas (no todas, solo las recientes)
    try {
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        
        const docs = await db.collection('jornadas').find({
            'datos.estado': { $in: ['activa', 'cerrada'] }
        }).toArray();
        for (const doc of docs) {
            cache.jornadas[`${doc.groupId}|${doc.jornadaId}`] = doc.datos;
            countJornadas++;
        }
    } catch (e) {}
    
    // 🆕 LIMPIAR JORNADAS VIEJAS
    await limpiarJornadasViejas();
    
    console.log(`[DB] 📦 Caché cargado: ${countUsers} usuarios, ${countUserData} configs usuario, ${countGroupData} configs grupo, ${countJornadas} jornadas (últimos 7 días)`);
}

async function cerrar() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        mongoDisponible = false;
    }
}

function estaDisponible() {
    return mongoDisponible;
}

// ============================================
// FUNCIONES SÍNCRONAS (leen de caché, escriben en ambos)
// ============================================

function cargarUsuarios() {
    return cache.users;
}

function guardarUsuarios(usuarios) {
    cache.users = usuarios;
    if (db) {
        db.collection('users').updateOne(
            { _id: 'main' }, 
            { $set: { usuarios } }, 
            { upsert: true }
        ).catch(() => {});
    }
}

function obtenerUserData(userId, clave) {
    return cache.user_data[`${userId}|${clave}`] || null;
}

function guardarUserData(userId, clave, datos) {
    cache.user_data[`${userId}|${clave}`] = datos;
    if (db) {
        db.collection('user_data').updateOne(
            { userId, clave }, 
            { $set: { datos } }, 
            { upsert: true }
        ).catch(() => {});
    }
}

function obtenerGroupData(groupId, clave) {
    return cache.group_data[`${groupId}|${clave}`] || null;
}

function guardarGroupData(groupId, clave, datos) {
    cache.group_data[`${groupId}|${clave}`] = datos;
    if (db) {
        db.collection('group_data').updateOne(
            { groupId, clave }, 
            { $set: { datos } }, 
            { upsert: true }
        ).catch(() => {});
    }
}

function obtenerJornada(groupId, jornadaId) {
    return cache.jornadas[`${groupId}|${jornadaId}`] || null;
}

function guardarJornadaDoc(groupId, jornadaId, datos) {
    cache.jornadas[`${groupId}|${jornadaId}`] = datos;
    if (db) {
        db.collection('jornadas').updateOne(
            { groupId, jornadaId }, 
            { $set: { datos } }, 
            { upsert: true }
        ).catch(() => {});
    }
}
// ============================================
// LIMPIEZA AUTOMÁTICA DE JORNADAS VIEJAS
// Se ejecuta al iniciar, borra jornadas cerradas de más de 2 días
// ============================================
async function limpiarJornadasViejas() {
    if (!db) return 0;
    
    try {
        const hace2Dias = new Date();
        hace2Dias.setDate(hace2Dias.getDate() - 2);
        
        const resultado = await db.collection('jornadas').deleteMany({
            'datos.estado': 'cerrada',
            'datos.finReal': { $lt: hace2Dias.toISOString() }
        });
        
        if (resultado.deletedCount > 0) {
            console.log(`[DB] 🧹 Limpiadas ${resultado.deletedCount} jornadas viejas`);
        }
        
        return resultado.deletedCount;
    } catch (e) {
        console.error('[DB] Error limpiando jornadas:', e.message);
        return 0;
    }
}
module.exports = {
    init,
    cerrar,
    estaDisponible,
    cargarUsuarios,
    guardarUsuarios,
    obtenerUserData,
    guardarUserData,
    obtenerGroupData,
    guardarGroupData,
    obtenerJornada,
    guardarJornadaDoc
};
