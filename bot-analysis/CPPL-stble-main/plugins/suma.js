console.log('[SUMA-INIT] 📦 Archivo suma.js cargandose...');

const { pnix } = require('../lib/commands');

const {
    procesarMensajeConContexto,
    formatearResultados,
    formatearErrores,
    cargarUltimaLoteria,
    guardarUltimaLoteria,
    cargarConfiguracionPremios,
    guardarConfiguracionPremios,
    cargarListerosPorciento,
    guardarListerosPorciento,
    LOTERIAS,
    DEFAULT_CONFIG,
    calcularPremios,
    verificarAccesoUsuario
} = require('../lib/jugadas.cjs');

const { cargarConfigGrupo, guardarConfigGrupo, cargarListerosGrupo, guardarListerosGrupo, registrarListero, eliminarListero, cargarHorariosGrupo, guardarHorariosGrupo } = require('../lib/grupo_config.cjs');
const { cargarLimites, guardarLimites } = require('../lib/limits.cjs');
const { crearJornada, cerrarJornada, cargarJornada, cargarJornadaEnMemoria } = require('../lib/jornadas.cjs');
const scheduler = require('../lib/scheduler.cjs');
console.log('[SUMA-INIT] ✅ Dependencias cargadas');

// ============================================
// SESIONES INTERACTIVAS PARA .SUMA
// ============================================
const sesionesSuma = {};
const ESTADO_SUMA = { ESPERANDO_PREMIOS: 'esperando_premios' };
const TIMEOUT_SESION_SUMA = 5 * 60 * 1000;

function crearSesionSuma(userId, datos) { sesionesSuma[userId] = { ...datos, timestamp: Date.now() }; }
function cerrarSesionSuma(userId) { delete sesionesSuma[userId]; }
function tieneSesionActivaSuma(userId) {
    const s = sesionesSuma[userId];
    if (!s) return false;
    if (Date.now() - s.timestamp > TIMEOUT_SESION_SUMA) { cerrarSesionSuma(userId); return false; }
    return true;
}
function renovarSesionSuma(userId) { if (sesionesSuma[userId]) sesionesSuma[userId].timestamp = Date.now(); }

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function getUserId(m) {
    const sender = m.sender || 'unknown';
    if (sender.includes('@lid')) return sender; 
    return sender.replace('@s.whatsapp.net', '').replace(':0', '');
}

function getQuotedId(m) {
    return m.quoted?.sender || m.quoted?.key?.participant || m.quoted?.data?.key?.participant || m.msg?.contextInfo?.participant || m.data?.message?.extendedTextMessage?.contextInfo?.participant || null;
}

function getGroupId(m) {
    const chat = m.from || m.chat || '';
    if (chat.includes('@g.us')) return chat.replace('@g.us', '');
    return null;
}

function generarTikeSinDeuda(userId, listeros, premios, detalles, totalesListeros, pick3, pick4) {
    const loteriaActual = typeof cargarUltimaLoteria === 'function' ? cargarUltimaLoteria(userId) : 'Florida';
    const listerosPorciento = typeof cargarListerosPorciento === 'function' ? cargarListerosPorciento(userId, loteriaActual) : {};
    const fmt = (num) => Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const getLoteriaDisplay = (lot) => {
        const lotLower = (lot || '').toLowerCase().replace(/_/g, ' ').trim();
        if (lotLower === 'florida') return `Florida 🦩`;
        if (lotLower === 'georgia') return `Georgia 🍑`;
        if (lotLower === 'new york') return `New York 🗽`;
        return `🎰 ${lot}`;
    };
    const fecha = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaStr = `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;

    let tike = `\`\`\` ${fechaStr} \`\`\`\n\n> \`\`\`ContadorPPL\`\`\` 🪀\n\n\`${getLoteriaDisplay(loteriaActual)}\`: *${pick3 || '000'}* • *${pick4 || '0000'}*\n______________________\n`;

    for (const [listero, tipos] of Object.entries(premios)) {
        const totalListero = totalesListeros[listero] || 0;
        let totalJugado = 0;
        if (listeros[listero]) { for (const tipoJugada of Object.values(listeros[listero])) { totalJugado += Object.values(tipoJugada).reduce((a, b) => a + b, 0); } }
        const datosListero = listerosPorciento[listero] || { porciento: 0, deuda: 0 };
        const porcentaje = datosListero.porciento || 0;
        const montoPorcentaje = totalJugado - (totalJugado * porcentaje / 100);
        const balance = montoPorcentaje - totalListero;

        tike += `👤 *${listero}*\n💰 REC: *${fmt(totalJugado)} $* \n       - ${porcentaje}%: *${fmt(montoPorcentaje)} $* \n______________________\n🏆 PREM: *${fmt(totalListero)} $*\n\n`;
        for (const [tipo, monto] of Object.entries(tipos)) {
            tike += `🎯 ${tipo}: ${fmt(monto)} $\n`;
            if (detalles[listero]?.[tipo]) { for (const det of detalles[listero][tipo]) tike += `- \`${det}\`\n`; }
            tike += `\n`;
        }
        tike += `______________________\n🧮 *${fmt(totalListero)}-${fmt(montoPorcentaje)} :*\n\n`;
        if (balance > 0) { tike += ` 🫵 *DEUDA*\n\n 💸*${fmt(Math.abs(Math.round(balance)))} $*\n`; }
        else if (balance < 0) { tike += ` 🥳 *FONDO*\n\n 💰*${fmt(Math.abs(Math.round(balance)))} $*\n`; }
        else { tike += ` ⚖️ *NEUTRO*\n\n 💰*0 $*\n`; }
        tike += `\n`;
        
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
        const balance = montoPorcentaje - 0;

        tike += `👤 *${listero}*\n💰 REC: *${fmt(totalJugado)} $* \n       - ${porcentaje}%: *${fmt(montoPorcentaje)} $* \n______________________\n🏆 PREM: *👌Sin premio* \n\n______________________\n🧮 *0-${fmt(montoPorcentaje)} :*\n\n`;
        if (balance > 0)  { tike += ` 🫵 *DEUDA*\n\n 💸*${fmt(Math.abs(Math.round(balance)))} $*\n`; }
        else { tike += ` ⚖️ *NEUTRO*\n\n 💰*0 $*\n`; }
        tike += `\n`;
    }
    return tike.trim();
}

// ============================================
// COMANDO .suma
// ============================================
pnix({
    'command': 'suma',
    'fromMe': false,
    'desc': 'Procesa jugadas de lotería',
    'type': 'command'
}, async (m, conn) => {
    const rawId = getUserId(m);
    const groupId = getGroupId(m);
    const acceso = verificarAccesoUsuario(rawId);
    if (!acceso.autorizado) {
        if (rawId.includes('@lid') && groupId) return m.reply(`❌ *Acceso denegado (Dispositivo Vinculado)*\n\nPara usar el bot, escribe en este grupo:\n\n\`.vincular TU_NUMERO\``);
        return m.reply(acceso.mensaje);
    }
    
    const userId = acceso.realPhone;
    
    let textoCompleto = m.text || m.body || '';
    let textoLimpio = textoCompleto.replace(/^\.[a-zA-Z]+\s*/, '').replace(/^\.[a-zA-Z]+$/, '');
    
    if (!textoLimpio || textoLimpio.trim().length === 0) return m.reply(`⚠️ *Uso incorrecto*\n\n📝 \`.suma <jugadas>\`\n📊 \`.suma config\` para ver opciones\n⏳ Licencia: ${acceso.tiempoRestante}`);
    
    const partes = textoLimpio.trim().split(/\s+/);
    const primerArg = partes[0]?.toLowerCase();
    
    if (groupId) {
        if (primerArg === 'inicio') {
            const loteria = cargarUltimaLoteria(userId);
            let turno = partes[1]?.toLowerCase();
            if (!turno || !['mañana', 'tarde'].includes(turno)) { const deteccion = scheduler.determinarTurno(); turno = deteccion.turno; }
            const configCheck = cargarConfigGrupo(groupId);
            if (configCheck.jornadaActivaId) { const jornadaExistente = cargarJornada(groupId, configCheck.jornadaActivaId); if (jornadaExistente?.estado === 'activa') return m.reply(`⚠️ Ya hay una jornada activa: *${configCheck.jornadaActivaId}*\n\n📌 Usa \`.suma fin\` para cerrarla primero.`); }
            crearJornada(groupId, loteria, turno);
            const config = cargarConfigGrupo(groupId);
            if (!config.adminPhone) config.adminPhone = userId;
            config.loteriaActual = loteria;
            guardarConfigGrupo(groupId, config);
            try { const listerosGrupo = cargarListerosGrupo(groupId); const porcientoAdmin = cargarListerosPorciento(userId, loteria); for (const [phone, data] of Object.entries(listerosGrupo)) { const nombre = data.nombre; if (!nombre) continue; if (!porcientoAdmin[nombre]) porcientoAdmin[nombre] = { porciento: 0, deuda: 0 }; porcientoAdmin[nombre].porciento = data.porciento || 0; } guardarListerosPorciento(userId, porcientoAdmin, loteria); } catch (e) {}
            const horarios = cargarHorariosGrupo(groupId); const horario = horarios[loteria]?.[turno]; const horaFin = horario?.fin || '??:??'; const horaResult = horario?.resultados || '??:??'; const emoji = turno === 'mañana' ? '🌅' : '🌇';
            return m.reply(`${emoji} *Jornada de ${loteria} (${turno}) INICIADA*\n\n📩 Los listeros pueden enviar jugadas.\n⏰ Cierra: ${horaFin}\n🎯 Resultados: ${horaResult}\n\n_${config.jornadaAutomatica ? '🤖 Cierre automático activado' : '✋ Cierre manual con .suma fin'}_`);
        }
        if (primerArg === 'fin') {
            const config = cargarConfigGrupo(groupId); if (!config.adminPhone) { config.adminPhone = userId; guardarConfigGrupo(groupId, config); }
            if (!config.jornadaActivaId) return m.reply(`❌ No hay jornada activa.\n\n📌 Usa \`.suma inicio\` para iniciar una.`);
            const jornada = cargarJornadaEnMemoria(groupId, config.jornadaActivaId); const turno = jornada?.turno || 'mañana'; const loteria = jornada?.loteria || config.loteriaActual || 'Florida'; const tieneJugadas = jornada?.listeros && Object.keys(jornada.listeros).length > 0;
            cerrarJornada(groupId, config.jornadaActivaId);
            if (!tieneJugadas) return m.reply(`⛔ *Jornada cerrada*\n\n⚠️ No había jugadas registradas.`);
            const horarios = cargarHorariosGrupo(groupId); const horario = horarios[loteria]?.[turno]; const { time } = scheduler.getCurrentTime(); const horaResultados = horario?.resultados || (turno === 'mañana' ? '13:36' : '21:51'); const drawTime = horario?.drawTime || (turno === 'mañana' ? 'MIDDAY' : 'EVENING');
            if (time >= horaResultados) { await m.reply(`⛔ *Jornada cerrada*\n\n🔄 Buscando resultados de ${drawTime}...`); try { const resultados = await scheduler.obtenerResultados(drawTime); if (resultados) { await scheduler.procesarResultadosGrupo(groupId, turno, drawTime, resultados); } else { await m.reply(`⛔ *Jornada cerrada*\n\n⚠️ Los resultados aún no están disponibles en la API.\n\n📌 Opciones:\n   • Espera unos minutos y usa \`.resultados\`\n   • Usa \`.premios XXX XXXX\` manualmente`); } } catch (err) { await m.reply(`⛔ *Jornada cerrada*\n\n❌ Error buscando resultados: ${err.message}\n\n📌 Usa \`.premios XXX XXXX\` manualmente`); } } else { await m.reply(`⛔ *Jornada cerrada*\n\n⏳ Los resultados se obtendrán automáticamente a las *${horaResultados}*.\n📋 Turno: ${turno} | Sorteo: ${drawTime}\n\n💡 También puedes usar \`.premios XXX XXXX\` cuando tengas los números.`); }
            return;
        }
        if (primerArg === 'comprobar') {
            const config = cargarConfigGrupo(groupId); let jornada = null; let jornadaLabel = ''; if (config.jornadaActivaId) { jornada = cargarJornadaEnMemoria(groupId, config.jornadaActivaId); jornadaLabel = `activa (${config.jornadaActivaId})`; } else if (config.ultimaJornadaCerrada) { jornada = cargarJornada(groupId, config.ultimaJornadaCerrada); jornadaLabel = `cerrada (${config.ultimaJornadaCerrada})`; }
            if (!jornada) return m.reply(`❌ No hay jornada activa ni reciente.\n\n📌 Usa \`.suma inicio\` para iniciar una.`);
            let texto = `📋 *COMPROBACIÓN DE JORNADA*\n📌 Estado: ${jornada.estado === 'activa' ? '🟢 Activa' : '🔴 Cerrada'}\n📅 ${jornadaLabel}\n🎰 Lotería: ${jornada.loteria} | Turno: ${jornada.turno}\n💬 Mensajes: ${jornada.mensajes?.length || 0}\n`; if (jornada.pick3) texto += `🏆 Premios: Pick3=${jornada.pick3} Pick4=${jornada.pick4}\n`; if (jornada.premiosProcesados) texto += `✅ Premios procesados\n`; texto += `\n`;
            if (jornada.listeros && Object.keys(jornada.listeros).length > 0) { for (const [listero, tipos] of Object.entries(jornada.listeros)) { let totalListero = 0; texto += `👤 *${listero}*\n`; for (const [tipo, nums] of Object.entries(tipos)) { if (Object.keys(nums).length > 0) { texto += `  ${tipo}:\n`; for (const [num, monto] of Object.entries(nums)) { texto += `    ${num} → ${monto}\n`; totalListero += monto; } } } texto += `  💰 Total: ${totalListero}\n\n`; } } else { texto += `⚠️ Sin jugadas registradas\n`; }
            return m.reply(texto);
        }
    }

    // ============================================
    // COMANDO UNIFICADO .suma config
    // ============================================
    if (primerArg === 'config') {
        const loteria = cargarUltimaLoteria(userId);
        const config = cargarConfiguracionPremios(userId, loteria);
        
        if (!partes[1]) {
            return m.reply(`⚙️ *TU CONFIGURACIÓN*\n👤 Usuario: *${userId}*\n🎰 Lotería: *${loteria}*\n\n💰 *Premios:*\n   • Parlet: ${config.Parlet} CUP\n   • Centena: ${config.Centena} CUP\n   • Fijo: ${config.Fijo} CUP\n   • Corrido: ${config.Corrido} CUP\n\n⚙️ *Opciones:*\n   • Barra /: ${config.barra_interpretacion}\n   • Gestión deuda: ${config.usar_gestion_deuda ? '✅ ON' : '❌ OFF'}\n   • Porciento listeros: \`.suma config porciento\``);
        }

        const tipo = partes[1]?.toLowerCase();
        const valor = partes[2]?.toLowerCase();

        // --- SUBCOMANDOS EXCLUSIVOS DE GRUPO ---
        if (groupId) {
            if (tipo === 'limits') {
                const limites = cargarLimites(groupId, loteria);
                if (!valor) return m.reply(`⚙️ *LÍMITES - ${loteria}*\n\n• Fijo: ${limites.Fijo || 'Sin límite'}\n• Corrido: ${limites.Corrido || 'Sin límite'}\n• Centena: ${limites.Centena || 'Sin límite'}\n• Parlet: ${limites.Parlet || 'Sin límite'}\n\n\`.suma config limits <tipo> <monto>\``);
                const monto = parseInt(partes[3]);
                if (['fijo', 'corrido', 'centena', 'parlet'].includes(valor) && partes[3]) { limites[valor.charAt(0).toUpperCase() + valor.slice(1)] = isNaN(monto) ? 0 : monto; guardarLimites(groupId, loteria, limites); return m.reply(`✅ *Límite actualizado: ${valor} = ${isNaN(monto) ? 'Sin límite' : monto}*`); }
                return m.reply(`❌ Uso: \`.suma config limits <fijo|corrido|centena|parlet> <monto> 0=SinLímite\``);
            }
            if (tipo === 'listeros') {
                const listeros = cargarListerosGrupo(groupId); const accion = partes[2]?.toLowerCase();
                if (!accion || accion === 'list') { const lista = Object.entries(listeros).map(([id, d]) => `👤 ${d.nombre}`).join('\n'); return m.reply(`👥 *LISTEROS REGISTRADOS*\n\n${lista || 'No hay listeros.'}\n\n📌 Para agregar:\n\`.suma config listeros add <nombre>\` _(citando mensaje)_\n📌 Para eliminar:\n\`.suma config listeros remove\` _(citando mensaje)_`); }
                if (accion === 'add') { if (!m.quoted) return m.reply(`❌ Debes responder (citar) a un mensaje del listero.\n\nUso: \`.suma config listeros add <nombre>\``); const quotedId = getQuotedId(m); if (!quotedId) return m.reply('❌ No pude identificar al remitente del mensaje citado.'); const nombre = partes.slice(3).join(' ') || 'Listero'; registrarListero(groupId, quotedId, nombre); return m.reply(`✅ *Listero registrado: ${nombre}*\n🆔 ID: ${quotedId.split('@')[0]}`); }
                if (accion === 'remove') { if (!m.quoted) return m.reply(`❌ Debes responder (citar) a un mensaje del listero.\n\nUso: \`.suma config listeros remove\``); const quotedId = getQuotedId(m); if (!quotedId) return m.reply('❌ No pude identificar al remitente del mensaje citado.'); eliminarListero(groupId, quotedId); return m.reply(`🗑️ *Listero eliminado*`); }
                return m.reply(`❌ Acción no válida. Usa *add* o *remove*.`);
            }
            if (tipo === 'banco') {
                if (!valor) { const cfg = cargarConfigGrupo(groupId); if (!cfg.bancoGroupJid) return m.reply(`🏦 *BANCO NO CONFIGURADO*\n\nPara configurar:\n1. Crea un grupo de WhatsApp y agrega al bot y al banquero.\n2. Escribe aquí: \`.suma config banco iniciar\`\n3. Ve a ese grupo y escribe: \`.vincularbanco <código>\``); return m.reply(`🏦 *BANCO CONFIGURADO*\n\n✅ Las jugadas se reenvían al grupo de banca configurado.\n\n📌 Para desvincular: \`.suma config banco remove\``); }
                if (valor === 'iniciar') { const { generarCodigoBanco } = require('./vincularbanco.js'); const codigo = generarCodigoBanco(groupId); return m.reply(`🏦 *CÓDIGO DE BANCA GENERADO*\n\nTu código es: *${codigo}*\n\n📌 *Instrucciones:*\n1. Ve al grupo de WhatsApp donde está el banquero.\n2. Escribe: \`.vincularbanco ${codigo}\`\n\n⏳ Este código expira en 5 minutos.`); }
                if (valor === 'remove') { const cfg = cargarConfigGrupo(groupId); cfg.bancoGroupJid = null; guardarConfigGrupo(groupId, cfg); return m.reply(`🗑️ *Banco desvinculado.* Ya no se reenviarán jugadas.`); }
                return m.reply(`❌ Uso:\n• \`.suma config banco iniciar\`\n• \`.suma config banco remove\``);
            }     
            if (tipo === 'horario') {
                const horarios = cargarHorariosGrupo(groupId);
                if (!valor || valor === 'list') { let msg = `🕐 *HORARIOS DE JORNADAS — ${loteria}*\n\n`; const turnoHorarios = horarios[loteria] || {}; for (const [turno, h] of Object.entries(turnoHorarios)) { const emoji = turno === 'mañana' ? '🌅' : '🌇'; msg += `${emoji} *${turno.charAt(0).toUpperCase() + turno.slice(1)}:*\n   • Inicio: ${h.inicio}\n   • Cierre: ${h.fin}\n   • Resultados: ${h.resultados}\n   • Sorteo: ${h.drawTime || (turno === 'mañana' ? 'MIDDAY' : 'EVENING')}\n   • Días: ${(h.dias || []).join(', ')}\n\n`; } msg += `📌 Para modificar:\n   • \`.suma config horario <turno> inicio 08:00\`\n   • \`.suma config horario <turno> fin 13:10\`\n   • \`.suma config horario <turno> resultados 13:36\``; return m.reply(msg); }
                const turno = valor; const campo = partes[3]; const valorCampo = partes[4];
                if (!['mañana', 'tarde'].includes(turno)) return m.reply(`❌ Turno inválido. Usa: *mañana* o *tarde*`);
                if (!['inicio', 'fin', 'resultados'].includes(campo)) return m.reply(`❌ Campo inválido. Usa: *inicio*, *fin*, o *resultados*`);
                if (!valorCampo || !/^\d{2}:\d{2}$/.test(valorCampo)) return m.reply(`❌ Formato inválido. Usa HH:MM (ej: 08:00, 13:36)`);
                if (!horarios[loteria]) horarios[loteria] = {}; if (!horarios[loteria][turno]) horarios[loteria][turno] = { inicio: '08:00', fin: '13:10', resultados: '13:36', drawTime: turno === 'mañana' ? 'MIDDAY' : 'EVENING', dias: ['lunes','martes','miércoles','jueves','viernes','sábado'] }; horarios[loteria][turno][campo] = valorCampo; guardarHorariosGrupo(groupId, horarios); return m.reply(`✅ *Horario actualizado*\n\n${turno} ${campo}: ${valorCampo}`);
            }
            if (tipo === 'auto') {
                const configGrupo = cargarConfigGrupo(groupId);
                if (!valor) return m.reply(`${configGrupo.jornadaAutomatica ? '🟢' : '🔴'} *Jornadas automáticas: ${configGrupo.jornadaAutomatica ? '✅ ACTIVADAS' : '⏸️ DESACTIVADAS'}*\n\n📌 \`.suma config auto on\` — Activar\n📌 \`.suma config auto off\` — Desactivar`);
                if (valor === 'on' || valor === 'si' || valor === '1') { configGrupo.jornadaAutomatica = true; guardarConfigGrupo(groupId, configGrupo); return m.reply(`✅ *Jornadas automáticas ACTIVADAS*`); }
                if (valor === 'off' || valor === 'no' || valor === '0') { configGrupo.jornadaAutomatica = false; guardarConfigGrupo(groupId, configGrupo); return m.reply(`⏸️ *Jornadas automáticas DESACTIVADAS*`); }
                return m.reply(`❌ Usa *on* u *off*.`);
            }
        }

        // --- SUBCOMANDOS GLOBALES (Privado y Grupo) ---
        
        // 🆕 PORCIENTO ACCESIBLE DESDE CUALQUIER LADO
        if (tipo === 'porciento') {
            const porcientoAdmin = cargarListerosPorciento(userId, loteria);
            const accion = valor;
            
            if (!accion || accion === 'list') {
                let msg = `👥 *PORCIENTOS DE LISTEROS — ${loteria}*\n\n`;
                if (Object.keys(porcientoAdmin).length === 0) {
                    msg += `⚠️ No hay listeros configurados aún.\n`;
                } else {
                    for (const [nombre, data] of Object.entries(porcientoAdmin)) {
                        msg += `👤 ${nombre}: ${data.porciento || 0}%\n`;
                    }
                }
                msg += `\n📌 Para cambiar:\n   • \`.suma config porciento set <nombre> <%>\``;
                if (groupId) msg += `\n   • \`.suma config porciento set 10\` _(citando mensaje)_`;
                return m.reply(msg);
            }
            
            if (accion === 'set') {
                let nombreListero = null;
                let porciento = null;
                
                // Grupo: set por citando mensaje
                if (groupId && partes[3] && !isNaN(parseInt(partes[3])) && m.quoted) {
                    porciento = parseInt(partes[3]);
                    const listerosGrupo = cargarListerosGrupo(groupId);
                    const quotedId = getQuotedId(m);
                    if (quotedId && listerosGrupo[quotedId]) nombreListero = listerosGrupo[quotedId].nombre;
                    else return m.reply(`❌ No pude identificar al listero en este grupo. Cita un mensaje suyo.`);
                }
                // Global: set por nombre
                else if (partes[4] && !isNaN(parseInt(partes[4]))) {
                    nombreListero = partes[3];
                    porciento = parseInt(partes[4]);
                }
                else {
                    let errorMsg = `❌ *Uso:*\n\n• \`.suma config porciento set <nombre> <porciento>\`\n   Ejemplo: \`.suma config porciento set Juan 10\`\n`;
                    if (groupId) errorMsg += `\n• \`.suma config porciento set <porciento>\` _(citando mensaje)_\n   Ejemplo: Cita mensaje + \`.suma config porciento set 10\``;
                    return m.reply(errorMsg);
                }
                
                if (porciento === null || isNaN(porciento) || porciento < 0 || porciento > 100) return m.reply(`❌ El porciento debe ser un número entre 0 y 100`);
                
                // Guardar en la base de datos principal del admin (Fuente de la verdad)
                if (!porcientoAdmin[nombreListero]) porcientoAdmin[nombreListero] = { porciento: 0, deuda: 0 };
                porcientoAdmin[nombreListero].porciento = porciento;
                guardarListerosPorciento(userId, porcientoAdmin, loteria);
                
                // Si estamos en grupo, sincronizar también hacia la config del grupo
                if (groupId) {
                    const listerosGrupo = cargarListerosGrupo(groupId);
                    for (const [id, data] of Object.entries(listerosGrupo)) {
                        if (data.nombre.toLowerCase() === nombreListero.toLowerCase()) {
                            data.porciento = porciento;
                        }
                    }
                    guardarListerosGrupo(groupId, listerosGrupo);
                }
                
                return m.reply(`✅ *Porciento actualizado*\n\n👤 ${nombreListero}: ${porciento}%\n\n💡 Esto afectará el cálculo en todos los métodos (OCR, premios, suma).`);
            }
            return m.reply(`❌ Usa: \`.suma config porciento list\` o \`.suma config porciento set <nombre> <%>\``);
        }

        if (['parlet', 'centena', 'fijo', 'corrido'].includes(tipo) && valor) { 
            const numValor = parseInt(valor); 
            if (isNaN(numValor) || numValor <= 0) return m.reply(`❌ *Valor inválido*`); 
            config[tipo.charAt(0).toUpperCase() + tipo.slice(1)] = numValor; 
            guardarConfiguracionPremios(userId, config, loteria); 
            return m.reply(`✅ *Configuración actualizada: ${tipo} ${numValor} CUP*`); 
        }
        if (tipo === 'barra' && valor) { 
            if (!['error', 'mas', 'menos'].includes(valor)) return m.reply(`❌ *Valor inválido*`); 
            config.barra_interpretacion = valor; 
            guardarConfiguracionPremios(userId, config, loteria); 
            return m.reply(`✅ *Barra actualizada: ${valor}*`); 
        }
        if (tipo === 'deuda' && valor) { 
            if (!['on', 'off'].includes(valor)) return m.reply(`❌ *Valor inválido*`); 
            config.usar_gestion_deuda = (valor === 'on'); 
            guardarConfiguracionPremios(userId, config, loteria); 
            return m.reply(`✅ *Deuda actualizada: ${valor}*`); 
        }

        return m.reply(`❌ Opción no reconocida.\n\nConfiguraciones disponibles:\n• parlet, centena, fijo, corrido\n• barra, deuda, porciento${groupId ? '\n• limits, listeros, banco, horario, auto (Solo grupo)' : ''}`);
    }
    
    if (primerArg === 'loteria' && partes[1]) {
        const loteria = partes[1].charAt(0).toUpperCase() + partes[1].slice(1).toLowerCase();
        if (LOTERIAS.includes(loteria)) { guardarUltimaLoteria(userId, loteria); return m.reply(`✅ *Lotería cambiada a: ${loteria}*`); }
        else return m.reply(`❌ *Lotería no válida*\n\nOpciones: ${LOTERIAS.join(', ')}`);
    }
    
    try {
        const resultado = procesarMensajeConContexto(userId, textoLimpio);
        const { listeros, errores, tieneErrores } = resultado;
        const totalJugadas = Object.values(listeros).reduce((acc, tipos) => acc + Object.values(tipos).reduce((a, nums) => a + Object.keys(nums).length, 0), 0);
        if (totalJugadas === 0) return m.reply(`❌ *No se encontraron jugadas válidas*\n\n` + (tieneErrores ? `⚠️ Errores:\n${formatearErrores(errores)}` : 'Verifica el formato.'));
        
        if (!globalThis.jugadasPorUsuario) globalThis.jugadasPorUsuario = {};
        globalThis.jugadasPorUsuario[userId] = { listeros, errores };
        
        let respuesta = formatearResultados(listeros);
        if (tieneErrores) respuesta += '\n' + formatearErrores(errores);
        respuesta += `\n🎰 _Lotería: ${cargarUltimaLoteria(userId)}_`;
        respuesta += `\n⏳ _Licencia: ${acceso.tiempoRestante}_`;
        respuesta += `\n\n🏆 *Envía los números ganadores para calcular premios*\n📝 *Formato:* pick3 pick4\n📋 *Ejemplo:* \`234 4556\`\n📌 Escribe *listo* para terminar sin calcular`;
        
        await m.reply(respuesta);
        crearSesionSuma(userId, { estado: ESTADO_SUMA.ESPERANDO_PREMIOS, listeros: listeros, loteria: cargarUltimaLoteria(userId) });
    } catch (error) {
        console.error('[SUMA] ❌ Error:', error);
        m.reply(`❌ *Error:* ${error.message}`);
    }
});

// ============================================
// HANDLER INTERACTIVO - ESPERAR PREMIOS (.suma)
// ============================================
pnix({
    on: 'text',
    fromMe: false,
    desc: 'Handler interactivo Suma Premios',
    type: 'handler'
}, async (m, conn) => {
    try {
        const rawId = getUserId(m);
        const acceso = verificarAccesoUsuario(rawId);
        if (!acceso.autorizado) return;
        const userId = acceso.realPhone;
        if (!tieneSesionActivaSuma(userId)) return;
        const texto = (m.text || m.body || '').trim();
        if (!texto || texto.length === 0) return;
        if (/^\.[a-zA-Z]/.test(texto)) return;
        
        renovarSesionSuma(userId);
        const sesion = sesionesSuma[userId];
        const textoLower = texto.toLowerCase();
        
        if (textoLower === 'listo' || textoLower === 'ok' || textoLower === 'fin' || textoLower === 'hecho' || textoLower === 'cancelar') {
            cerrarSesionSuma(userId);
            return m.reply('✅ *Sesión terminada.* Usa `.premios <pick3> <pick4>` cuando quieras.');
        }
        
        const partes = texto.trim().split(/\s+/);
        if (partes.length >= 2) {
            const pick3 = partes[0].replace(/\D/g, '');
            const pick4 = partes[1].replace(/\D/g, '');
            if (pick3.length === 3 && pick4.length === 4) {
                try { await m.react('🏆'); } catch (e) {}
                const listeros = sesion.listeros;
                const loteriaActual = sesion.loteria || cargarUltimaLoteria(userId);
                const configPremios = cargarConfiguracionPremios(userId, loteriaActual);
                const { premios, detalles, ganadorFijo, ganadorCentena, corridos, parletsGanadores } = calcularPremios(userId, listeros, pick3, pick4, configPremios);
                let totalGeneral = 0; const totalesListeros = {};
                for (const [listero, tipos] of Object.entries(premios)) { const total = Object.values(tipos).reduce((acc, val) => acc + val, 0); totalesListeros[listero] = total; totalGeneral += total; }
                const tike = generarTikeSinDeuda(userId, listeros, premios, detalles, totalesListeros, pick3, pick4);
                if (totalGeneral === 0) { await m.reply(`😔 *Sin premios para Pick3=${pick3} Pick4=${pick4}*\n\n✔️ Fijo: ${ganadorFijo}\n✔️ Centena: ${ganadorCentena}\n✔️ Corridos: ${corridos.join(', ')}\n✔️ Parlets: ${parletsGanadores.join(', ')}`); } 
                else { await m.reply(`🏆 *PREMIOS Pick3=${pick3} Pick4=${pick4}*\n\n✔️ Fijo ganador: ${ganadorFijo}\n✔️ Centena: ${ganadorCentena}\n✔️ Corridos: ${corridos.join(', ')}\n✔️ Parlets: ${parletsGanadores.join(', ')}\n━━━━━━━━━━━━━━━━━━\n💰 *Total a pagar: ${totalGeneral} CUP*\n━━━━━━━━━━━━━━━━━━`); }
                await new Promise(r => setTimeout(r, 800));
                await m.reply(tike);
                cerrarSesionSuma(userId);
                return;
            }
        }
        await m.reply(`❌ *Formato inválido*\n\n📝 Envía: \`pick3 pick4\`\n📋 Ejemplo: \`234 4556\`\n\n📌 Escribe *listo* para terminar`);
    } catch (error) {
        console.error('[SUMA-INTERACTIVO] ❌ Error:', error);
        const rawId = getUserId(m); const acceso = verificarAccesoUsuario(rawId); if (acceso.autorizado) cerrarSesionSuma(acceso.realPhone);
    }
});

// ============================================
// COMANDO .premios
// ============================================
pnix({
    'command': 'premios',
    'fromMe': false,
    'desc': 'Calcula premios y envía tike automáticamente',
    'type': 'command'
}, async (m, conn) => {
    const rawId = getUserId(m); const acceso = verificarAccesoUsuario(rawId); if (!acceso.autorizado) return m.reply(acceso.mensaje);
    const userId = acceso.realPhone; const groupId = getGroupId(m); const textoCompleto = m.text || m.body || ''; let textoLimpio = textoCompleto.replace(/^\.[a-zA-Z]+\s*/, '').replace(/^\.[a-zA-Z]+$/, '');    const args = textoLimpio.trim().split(/\s+/);
    if (!args[0] || !args[1]) return m.reply(`🏆 *CALCULAR PREMIOS*\n\n📝 *Formato:*\n\`.premios <pick3> <pick4>\``);
    const pick3 = args[0].trim(); const pick4 = args[1].trim();
    if (!/^\d{3}$/.test(pick3) || !/^\d{4}$/.test(pick4)) return m.reply(`❌ *Formato inválido*`);
    let listeros = null;
    if (groupId) { const configGrupo = cargarConfigGrupo(groupId); if (configGrupo.jornadaActivaId) { const jornada = cargarJornadaEnMemoria(groupId, configGrupo.jornadaActivaId); if (jornada && jornada.listeros && Object.keys(jornada.listeros).length > 0) listeros = jornada.listeros; } if (!listeros && configGrupo.ultimaJornadaCerrada) { const jornadaCerrada = cargarJornada(groupId, configGrupo.ultimaJornadaCerrada); if (jornadaCerrada?.listeros && Object.keys(jornadaCerrada.listeros).length > 0) listeros = jornadaCerrada.listeros; } }
    if (!listeros && globalThis.jugadasPorUsuario && globalThis.jugadasPorUsuario[userId]) { listeros = globalThis.jugadasPorUsuario[userId].listeros; }
    if (!listeros || Object.keys(listeros).length === 0) return m.reply(`❌ *No hay jugadas procesadas*\n\nAsegúrate de que la jornada esté iniciada y haya jugadas.`);
    try {
        const loteriaActual = cargarUltimaLoteria(userId); const configPremios = cargarConfiguracionPremios(userId, loteriaActual); const listerosPorciento = cargarListerosPorciento(userId, loteriaActual);
        const { premios, detalles, ganadorFijo, ganadorCentena, corridos, parletsGanadores } = calcularPremios(userId, listeros, pick3, pick4, configPremios);
        let totalGeneral = 0; const totalesListeros = {};
        for (const [listero, tipos] of Object.entries(premios)) { const total = Object.values(tipos).reduce((acc, val) => acc + val, 0); totalesListeros[listero] = total; totalGeneral += total; }
        if (totalGeneral === 0) { const tike = generarTikeSinDeuda(userId, listeros, {}, {}, {}, pick3, pick4); await m.reply(`😔 *Sin premios para Pick3=${pick3} Pick4=${pick4}*\n\n✔️ Fijo: ${ganadorFijo}\n✔️ Centena: ${ganadorCentena}\n✔️ Corridos: ${corridos.join(', ')}\n✔️ Parlets: ${parletsGanadores.join(', ')}`); await new Promise(r => setTimeout(r, 800)); await m.reply(tike); return; }
        let respuesta = `🏆 *PREMIOS Pick3=${pick3} Pick4=${pick4}*\n\n✔️ Fijo ganador: ${ganadorFijo}\n✔️ Centena: ${ganadorCentena}\n✔️ Corridos: ${corridos.join(', ')}\n✔️ Parlets: ${parletsGanadores.join(', ')}\n━━━━━━━━━━━━━━━━━━\n💰 *Total a pagar: ${totalGeneral} CUP*\n━━━━━━━━━━━━━━━━━━\n\n`;
        for (const [listero, tipos] of Object.entries(premios)) { const totalListero = totalesListeros[listero]; let totalJugado = 0; if (listeros[listero]) { for (const tipoJugada of Object.values(listeros[listero])) totalJugado += Object.values(tipoJugada).reduce((a, b) => a + b, 0); } const datosListero = listerosPorciento[listero] || { porciento: 0, deuda: 0 }; const porcentaje = datosListero.porciento || 0; const montoDespuesPorcentaje = totalJugado - (totalJugado * porcentaje / 100); const balance = montoDespuesPorcentaje - totalListero;
        respuesta += `📋 *${listero}* - Premio: ${totalListero} CUP\n`; if (balance > 0) respuesta += `   📈 Ganancia: ${Math.round(balance)} CUP\n`; else if (balance < 0) respuesta += `   📉 Pérdida: ${Math.abs(Math.round(balance))} CUP\n`; else respuesta += `   ➖ Balance neutro\n`;
        for (const [tipo, monto] of Object.entries(tipos)) { const montosVistos = new Set(); let montoJugado = 0; if (detalles[listero]?.[tipo]) { for (const detalle of detalles[listero][tipo]) { if (!montosVistos.has(detalle)) { montosVistos.add(detalle); const partes = detalle.split('-'); montoJugado += parseInt(partes[partes.length - 1]) || 0; } } } respuesta += `   🟢 ${tipo}: ${montoJugado} → ${monto} CUP\n`; if (detalles[listero]?.[tipo]) { for (const det of detalles[listero][tipo]) respuesta += `      ${det}\n`; } } respuesta += '\n'; }
        await m.reply(respuesta); await new Promise(r => setTimeout(r, 800)); const tike = generarTikeSinDeuda(userId, listeros, premios, detalles, totalesListeros, pick3, pick4); await m.reply(tike);
    } catch (error) { console.error('[PREMIOS] ❌ Error:', error); m.reply(`❌ *Error:* ${error.message}`); }
});

// ============================================
// COMANDO .resultados
// ============================================
pnix({
    'command': 'resultados',
    'fromMe': false,
    'desc': 'Obtiene resultados de la API y calcula premios',
    'type': 'command'
}, async (m, conn) => {
    const rawId = getUserId(m); const acceso = verificarAccesoUsuario(rawId); if (!acceso.autorizado) return m.reply(acceso.mensaje);
    const userId = acceso.realPhone; const groupId = getGroupId(m);
    if (!groupId) return m.reply('⚠️ Este comando se usa en el grupo de trabajo.');
    const configGrupo = cargarConfigGrupo(groupId);
    if (!configGrupo.adminPhone) { configGrupo.adminPhone = userId; guardarConfigGrupo(groupId, configGrupo); }
    const esAdmin = configGrupo.adminPhone === userId || configGrupo.adminPhone === rawId || rawId.includes(configGrupo.adminPhone);
    if (!esAdmin) return m.reply(`❌ Solo el admin del grupo puede usar este comando.`);
    await m.reply('⏳ *Buscando resultados en la API...*');
    try {
        const { obtenerResultados } = require('../lib/scheduler.cjs'); const textoCompleto = m.text || m.body || ''; let textoLimpio = textoCompleto.replace(/^\.[a-zA-Z]+\s*/, '').replace(/^\.[a-zA-Z]+$/, ''); const args = textoLimpio.trim().split(/\s+/); const turnoArg = (args[0] || '').toLowerCase(); let turno = 'mañana'; let drawTime = 'MIDDAY';
        if (turnoArg === 'tarde' || turnoArg === 'noche') { turno = 'tarde'; drawTime = 'EVENING'; }
        const resultados = await obtenerResultados(drawTime);
        if (!resultados) return m.reply(`❌ *No se pudieron obtener los resultados para ${drawTime}*\n\nIntenta de nuevo en unos minutos o usa \`.premios XXX XXXX\` manualmente.`);
        const { procesarResultadosGrupo } = require('../lib/scheduler.cjs'); await procesarResultadosGrupo(groupId, turno, drawTime, resultados, conn);
    } catch (error) { console.error('[RESULTADOS] ❌ Error:', error); m.reply(`❌ *Error:* ${error.message}`); }
});


// ============================================
// COMANDO .status — Diagnóstico completo de jornada
// ============================================
pnix({
    'command': 'status',
    'fromMe': false,
    'desc': 'Muestra el estado de la jornada activa o última cerrada',
    'type': 'command'
}, async (m, conn) => {
    const rawId = getUserId(m);
    const acceso = verificarAccesoUsuario(rawId);
    if (!acceso.autorizado) return m.reply(acceso.mensaje);
    
    const userId = acceso.realPhone;
    const groupId = getGroupId(m);
    if (!groupId) return m.reply('⚠️ Este comando se usa en el grupo de trabajo.');
    
    const configGrupo = cargarConfigGrupo(groupId);
    const horarios = cargarHorariosGrupo(groupId);
    
    let msg = `📊 *ESTADO DEL GRUPO*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Admin: ${configGrupo.adminPhone || '❌ No configurado'}\n`;
    msg += `🎰 Lotería: ${configGrupo.loteriaActual || 'Florida'}\n`;
    msg += `🤖 Automático: ${configGrupo.jornadaAutomatica ? '✅ Activado' : '✋ Manual'}\n`;
    msg += `🏦 Banca: ${configGrupo.bancoGroupJid ? '✅ Configurada' : '❌ No configurada'}\n`;
    msg += `📋 Listeros: ${Object.keys(cargarListerosGrupo(groupId)).length} registrados\n\n`;
    
    let jornada = null;
    let tipoJornada = '';
    
    if (configGrupo.jornadaActivaId) {
        jornada = cargarJornadaEnMemoria(groupId, configGrupo.jornadaActivaId);
        tipoJornada = '🟢 ACTIVA';
    } else if (configGrupo.ultimaJornadaCerrada) {
        jornada = cargarJornada(groupId, configGrupo.ultimaJornadaCerrada);
        tipoJornada = '🔴 CERRADA';
    }
    
    if (jornada) {
        const loteria = jornada.loteria || configGrupo.loteriaActual || 'Florida';
        const turno = jornada.turno || 'mañana';
        const horario = (horarios[loteria] || {})[turno] || {};
        
        msg += `📅 *Jornada ${tipoJornada}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🆔 ID: ${jornada.id}\n`;
        msg += `🎰 Lotería: ${loteria} | ${turno === 'mañana' ? '🌅 Mañana' : '🌇 Tarde'}\n`;
        msg += `⏰ Inicio real: ${new Date(jornada.inicioReal).toLocaleTimeString('es-CU', {timeZone: 'America/Havana'})}\n`;
        msg += `⏰ Cierre prog.: ${horario.fin || '??:??'}\n`;
        msg += `🎯 Resultados: ${horario.resultados || '??:??'}\n`;
        if (jornada.finReal) msg += `🔒 Cerrada: ${new Date(jornada.finReal).toLocaleTimeString('es-CU', {timeZone: 'America/Havana'})}\n`;
        if (jornada.pick3) msg += `🎯 Pick3: ${jornada.pick3} | Pick4: ${jornada.pick4}\n`;
        msg += `\n`;
        
        const totalMensajes = (jornada.mensajes || []).length;
        const listerosJornada = jornada.listeros || {};
        const nombresListeros = Object.keys(listerosJornada);
        
        msg += `👥 *Jugadas registradas*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📩 Mensajes: ${totalMensajes}\n`;
        msg += `👤 Listeros que enviaron: ${nombresListeros.length}\n\n`;
        
        if (nombresListeros.length > 0) {
            let totalGlobal = 0;
            const listerosGrupo = cargarListerosGrupo(groupId);
            
            for (const nombre of nombresListeros) {
                const datos = listerosJornada[nombre] || {};
                let totalListero = 0;
                let detalle = [];
                
                for (const [tipo, nums] of Object.entries(datos)) {
                    const montoTipo = Object.values(nums || {}).reduce((a, b) => a + b, 0);
                    if (montoTipo > 0) {
                        totalListero += montoTipo;
                        detalle.push(`${tipo}: ${montoTipo}`);
                    }
                }
                
                totalGlobal += totalListero;
                
                const encontrado = Object.entries(listerosGrupo).find(([k, v]) => v.nombre === nombre);
                const activo = encontrado ? encontrado[1].activo : true;
                const icono = activo === false ? '🔴' : '🟢';
                
                msg += `${icono} *${nombre}*: ${totalListero} CUP\n`;
                if (detalle.length > 0) msg += `   ${detalle.join(' | ')}\n`;
            }
            msg += `\n💰 *Total acumulado: ${totalGlobal} CUP*\n`;
        } else {
            msg += `😴 Sin jugadas todavía\n`;
        }
        
        if (jornada.premios) {
            msg += `\n🏆 *PREMIOS CALCULADOS*\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n`;
            let totalPremios = 0;
            for (const [nombre, tipos] of Object.entries(jornada.premios)) {
                const total = Object.values(tipos).reduce((a, b) => a + b, 0);
                totalPremios += total;
                msg += `👤 ${nombre}: ${total} CUP\n`;
            }
            msg += `💰 Total premios: ${totalPremios} CUP\n`;
        }
        
        const limites = cargarLimites(groupId, loteria);
        const tieneLimites = Object.entries(limites).some(([k, v]) => k !== 'porNumero' && v > 0);
        if (tieneLimites) {
            msg += `\n🚫 *Límites*\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n`;
            for (const [tipo, valor] of Object.entries(limites)) {
                if (tipo !== 'porNumero' && valor > 0) msg += `• ${tipo}: ${valor} CUP\n`;
            }
        }
        
    } else {
        msg += `📅 *Sin jornadas*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `😴 No hay jornada activa ni cerrada.\n`;
        msg += `📝 Usá \`.suma inicio\` para comenzar.\n`;
    }
    
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🕐 Hora Cuba: ${new Date().toLocaleTimeString('es-CU', {timeZone: 'America/Havana'})}\n`;
    
    await m.reply(msg);
});
