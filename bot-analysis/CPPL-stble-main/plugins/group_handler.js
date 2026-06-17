console.log('[GROUP-HANDLER] 🤖 Motor Automático de Alto Rendimiento cargándose...');

const { pnix } = require('../lib/commands');
const { 
    procesarMensajeConContexto, verificarAccesoUsuario, corregirSeriesVerticales
} = require('../lib/jugadas.cjs');
const { cargarConfigGrupo, cargarListerosGrupo, guardarListerosGrupo } = require('../lib/grupo_config.cjs');
const { cargarLimites, validarLimites } = require('../lib/limits.cjs');
const { cargarJornadaEnMemoria, agregarMensajeJornadaRapido } = require('../lib/jornadas.cjs');

const fs = require('fs');
const path = require('path');
const https = require('https');

// 🆕 Importar scheduler
const scheduler = require('../lib/scheduler.cjs');

// 🆕 Importar sync de porciento
const { cargarListerosPorciento, guardarListerosPorciento, cargarUltimaLoteria } = require('../lib/jugadas.cjs');

let downloadContentFromMessage = null;
try {
    import('@whiskeysockets/baileys/lib/Utils/messages-media.js').then(mod => {
        downloadContentFromMessage = mod.downloadContentFromMessage;
    }).catch(e => {});
} catch (e) {}

// 🆕 Flag para iniciar scheduler solo una vez
let schedulerStarted = false;

// ============================================
// SISTEMA DE COLAS
// ============================================
const groupQueues = {};
function encolarMensaje(groupId, task) {
    if (!groupQueues[groupId]) groupQueues[groupId] = Promise.resolve();
    groupQueues[groupId] = groupQueues[groupId].then(() => task()).catch(err => {
        console.error(`[GROUP-QUEUE] ❌ Error:`, err);
    });
}

// ============================================
// HELPERS & OCR
// ============================================
function getGroupId(m) {
    const chat = m.from || m.chat || '';
    return chat.includes('@g.us') ? chat.replace('@g.us', '') : null;
}

function esComando(m) {
    const t = m.text || m.body || '';
    return /^[•·#!.,\/\\$%^&*()_=+~`;:'"<>?|]/.test(t.trim());
}

async function descargarImagen(m) {
    try {
        let imgMsg = m.data?.message?.imageMessage || m.msg || m.quoted?.data?.message?.imageMessage || m.quoted?.msg;
        if (!imgMsg?.mediaKey) return null;
        if (downloadContentFromMessage) {
            const stream = await downloadContentFromMessage(imgMsg, 'image', { mediaKey: imgMsg.mediaKey, url: imgMsg.url });
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
                const tempDir = './temp_images';
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                const fp = path.join(tempDir, `grp_${Date.now()}.jpg`);
                fs.writeFileSync(fp, buffer);
                return fp;
            }
        }
        return null;
    } catch (e) { return null; }
}

async function ocrShforge(filePath) {
    return new Promise((resolve) => {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const boundary = '----OCR' + Math.random().toString(36).substring(2);
            const postData = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="img.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`), fileBuffer, Buffer.from(`\r\n--${boundary}--\r\n`)]);
            const req = https.request({
                hostname: 'api-image-to-text.shforge.com', path: '/api/ocr/recognize', method: 'POST',
                headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'accept': 'application/json', 'X-API-Key': '9f3a1e7c-4b2d-4f89-b6e3-1a8c7d5e0b42', 'Content-Length': postData.length }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => { try { const json = JSON.parse(data); resolve(json.success ? json.text : null); } catch (e) { resolve(null); } });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(30000, () => { req.destroy(); resolve(null); });
            req.write(postData); req.end();
        } catch (e) { resolve(null); }
    });
}

function corregirTextoOcr(texto) {
    texto = texto.replace(/(\d{2,3})x(\d{2,3})/g, '$1+$2');
    texto = texto.replace(/(4l\s*>|41\s*>|A1\s*>)/gi, 'AL>');
    texto = texto.replace(/(\d{2})\s*(4l|41|A1)\s*(\d{2})/gi, '$1Al$3');
    if (typeof corregirSeriesVerticales === 'function') texto = corregirSeriesVerticales(texto);
    return texto;
}

// ============================================
// 🆕 SINCRONIZAR PORCIENTO grupo → admin
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
        console.error('[GROUP-HANDLER] Error sync porciento:', e.message);
    }
}

// ============================================
// MOTOR PRINCIPAL
// ============================================
async function procesarMensajeGrupo(m, conn, esImagen = false) {
    const groupId = getGroupId(m);
    if (!groupId || esComando(m)) return;
    
    // 🆕 Iniciar scheduler la primera vez que recibimos un mensaje con conn
    if (!schedulerStarted && conn) {
        schedulerStarted = true;
        scheduler.start(conn);
    }

    encolarMensaje(groupId, async () => {
        try {
            const configGrupo = cargarConfigGrupo(groupId);
            if (configGrupo.esGrupoBanca) return;
            const rawId = m.sender || '';
            // Ignorar mensajes del propio bot y ecos del grupo
            if (!rawId || rawId.includes('@g.us') || m.fromMe || m.key?.fromMe) return;
            
            if (!configGrupo.jornadaActivaId) {
                console.log(`[GROUP-HANDLER] ⚠️ Sin jornada activa para grupo ${groupId}`);
                return;
            }
            if (!configGrupo.adminPhone) {
                console.log(`[GROUP-HANDLER] ⚠️ Sin adminPhone para grupo ${groupId}`);
                return;
            }
            
            const jornada = cargarJornadaEnMemoria(groupId, configGrupo.jornadaActivaId);
            if (!jornada) {
                console.log(`[GROUP-HANDLER] ⚠️ Jornada no encontrada: ${configGrupo.jornadaActivaId}`);
                return;
            }
            if (jornada.estado !== 'activa') {
                console.log(`[GROUP-HANDLER] ⚠️ Jornada no activa (${jornada.estado}): ${configGrupo.jornadaActivaId}`);
                return;
            }

            const accesoAdmin = verificarAccesoUsuario(rawId);
            if (accesoAdmin.autorizado && accesoAdmin.realPhone === configGrupo.adminPhone) return;

            const datosListero = cargarListerosGrupo(groupId)[rawId]
                || cargarListerosGrupo(groupId)[rawId.replace('@s.whatsapp.net', '')]
                || cargarListerosGrupo(groupId)[rawId.split('@')[0]];
            if (!datosListero) {
                console.log(`[GROUP-HANDLER] ⚠️ Listero no registrado: ${rawId}`);
                return;
            }
            if (!datosListero.activo) {
                console.log(`[GROUP-HANDLER] ⚠️ Listero inactivo: ${datosListero.nombre} (${rawId})`);
                return;
            }

            let textoProcesar = '';
            let textoOriginalListero = '';
            
            if (esImagen) {
                const tieneImg = m.msg?.mimetype?.startsWith('image/') || m.data?.message?.imageMessage;
                if (!tieneImg) return;
                
                m.react('⏳').catch(()=>{});
                const filePath = await descargarImagen(m);
                if (!filePath) { m.reply('❌ Error descargando imagen.').catch(()=>{}); return; }
                
                let textoOcr = await ocrShforge(filePath);
                try { fs.unlinkSync(filePath); } catch (e) {}
                
                if (!textoOcr) { m.reply('❌ No se pudo leer la imagen.').catch(()=>{}); return; }
                textoProcesar = corregirTextoOcr(textoOcr);
                textoOriginalListero = textoProcesar;
            } else {
                textoProcesar = (m.text || m.body || '').trim();
                if (!textoProcesar) return;
                textoOriginalListero = textoProcesar;
            }

            if (!textoProcesar.includes(':')) textoProcesar = `${datosListero.nombre}: ${textoProcesar}`;

            const resultado = procesarMensajeConContexto(configGrupo.adminPhone, textoProcesar);
            
            if (resultado.tieneErrores && resultado.errores.length > 0) {
                const errDet = resultado.errores.map(e => `• \`${e.jugada}\`: ${e.tipo}`).join('\n');
                m.reply(`❌ *Inválido - ${datosListero.nombre}*\n\n${errDet}`).catch(()=>{});
                return;
            }

            // 🔧 FIX: Verificar que resultado.listeros existe y tiene datos
            const tieneListeros = resultado.listeros && 
                               typeof resultado.listeros === 'object' &&
                               Object.keys(resultado.listeros).length > 0;
            
            if (!tieneListeros) return;
            
            // Buscar si el listero tiene jugadas válidas
            const listeroNombre = datosListero.nombre;
            const jugadasListero = resultado.listeros[listeroNombre] || null;
            
            if (!jugadasListero || !Object.values(jugadasListero).some(t => Object.keys(t).length > 0)) return;

            const limites = cargarLimites(groupId, jornada.loteria);
            const validacion = validarLimites(jornada.acumulacion, jugadasListero, limites);
            
            
            if (validacion.excede) {
                let msgLimite = `🚫 *¡Límite! - ${datosListero.nombre}*\n\n`;
                for (const det of validacion.detalles) msgLimite += `• *${det.tipo} ${det.numero}*: ${det.totalSeria} (Límite: ${det.limite})\n`;
                m.reply(msgLimite).catch(()=>{});
                return;
            }

            const msgData = {
                listeroId: rawId, listeroNombre: datosListero.nombre,
                timestamp: new Date().toISOString(), tipo: esImagen ? 'imagen' : 'texto',
                textoOriginal: textoProcesar, valido: true, errores: [], excedeLimites: [],
                jugadas: jugadasListero
            };

            const numeroMensaje = agregarMensajeJornadaRapido(groupId, configGrupo.jornadaActivaId, msgData);

            if (numeroMensaje) {
                m.react('✅').catch(()=>{});
                m.reply(`✅ *OK #${numeroMensaje}* - ${datosListero.nombre}`).catch(()=>{});
                
                // 🏦 REENVÍO AL GRUPO DE BANCA
                const configGrupoActual = cargarConfigGrupo(groupId);
                
                if (configGrupoActual.bancoGroupJid) {
                    let msgBanco = textoOriginalListero;
                    
                    try {
                        const client = m.client || conn;
                        
                        if (client && typeof client.sendMessage === 'function') {
                            await client.sendMessage(configGrupoActual.bancoGroupJid, { text: msgBanco });
                            console.log(`[BANCO] ✅ Mensaje original enviado al grupo de banca.`);
                        }
                    } catch (errBanco) {
                        console.error('[BANCO] ❌ Error enviando a la banca:', errBanco.message);
                    }
                }
                
                await new Promise(r => setTimeout(r, 150)); 
            }

        } catch (error) {
            console.error('[GROUP-HANDLER] ❌ ERROR EN COLA:', error);
        }
    });
}

// ============================================
// REGISTRO DE HANDLERS
// ============================================
if (typeof pnix === 'function') {
    pnix({ on: 'text', fromMe: false, type: 'handler' }, async (m, text, conn) => {
        if (m.msg?.mimetype?.startsWith('image/')) return;
        procesarMensajeGrupo(m, conn, false);
    });
    pnix({ on: 'image', fromMe: false, type: 'handler' }, async (m, text, conn) => {
        procesarMensajeGrupo(m, conn, true);
    });
    console.log('[GROUP-HANDLER] ✅ Motor de Alto Rendimiento + Scheduler registrado');
}
module.exports = {};
