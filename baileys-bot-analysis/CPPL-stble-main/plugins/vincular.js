const { pnix } = require('../lib/commands');
const { verificarAccesoUsuario, cargarUsuariosAcceso, guardarUsuariosAcceso } = require('../lib/jugadas.cjs');
const { cargarConfigGrupo, guardarConfigGrupo } = require('../lib/grupo_config.cjs');

const PENDIENTES = {};

function generarCodigo() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function getGroupId(m) {
    const chat = m.from || m.chat || m.key?.remoteJid || '';
    if (chat.includes('@g.us')) return chat.replace('@g.us', '');
    return null;
}

async function enviarCodigoPrivado(socket, phone, code) {
    if (!socket || typeof socket.sendMessage !== 'function') return;
    await socket.sendMessage(phone + '@s.whatsapp.net', {
        text: `🔐 *Código de Vinculación — ContadorPPL*\n\n` +
              `📋 *Código:* *${code}*\n` +
              `⏰ Válido 5 minutos\n\n` +
              `Volvé al grupo y escribí solo el código de 4 dígitos.\n\n` +
              `⚠️ Si no fuiste vos, ignorá este mensaje.`
    }).catch(() => {});
}

pnix({
    command: 'vincular',
    fromMe: false,
    desc: 'Vincula tu ID de grupo con tu número de licencia',
    type: 'command'
}, async (m, conn) => {
    const groupId = getGroupId(m);
    const senderId = m.sender || '';
    
    if (!groupId) return m.reply('⚠️ *Este comando se usa en el grupo.*');

    const args = (m.text || m.body || '').trim().split(/\s+/);
    const phoneNumber = args[1];
    if (!phoneNumber) return m.reply('⚠️ *Uso:* `.vincular TU_NUMERO`');

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    const usuarios = cargarUsuariosAcceso();
    const idx = usuarios.findIndex(u => u.phone === cleanPhone);
    if (idx === -1) return m.reply(`❌ El número *${cleanPhone}* no tiene licencia activa.`);

    if (usuarios[idx].groupLids && usuarios[idx].groupLids.includes(senderId)) {
        return m.reply(`✅ Este dispositivo ya está vinculado a *${cleanPhone}*.`);
    }

    const clave = `${groupId}|${cleanPhone}`;
    const existente = PENDIENTES[clave];
    
    if (existente && Date.now() < existente.expira) {
        console.log('[VINCULAR] ♻️ Reusando código existente:', existente.code);
        await enviarCodigoPrivado(m.client, cleanPhone, existente.code);
        return;
    }

    const codigo = generarCodigo();
    PENDIENTES[clave] = {
        phone: cleanPhone,
        code: codigo,
        groupId: groupId,
        senderIds: [senderId],
        expira: Date.now() + (5 * 60 * 1000)
    };

    try {
        await enviarCodigoPrivado(m.client, cleanPhone, codigo);
        
        await m.reply(
            `📩 *Código enviado al privado de ${cleanPhone}*\n\n` +
            `🔐 Escribí *solo el código de 4 dígitos* aquí.\n` +
            `⏰ 5 minutos | ❌ *cancelar* para cancelar`
        );
    } catch (e) {
        delete PENDIENTES[clave];
        console.error('[VINCULAR] Error:', e.message);
        return m.reply(`❌ No se pudo enviar el código al privado.`);
    }
});

pnix({
    on: 'text',
    fromMe: false,
    type: 'handler'
}, async (m, text, conn) => {
    const groupId = getGroupId(m);
    const senderId = m.sender || '';
    if (!groupId || m.fromMe || m.key?.fromMe) return;
    
    const msgText = (m.text || m.body || '').trim();
    if (/^[•·#!.,\/\\$%^&*()_=+~`;:'"<>?|]/.test(msgText)) return;
    
    let pendiente = null;
    for (const [clave, datos] of Object.entries(PENDIENTES)) {
        if (datos.groupId === groupId && datos.senderIds && datos.senderIds.includes(senderId)) {
            pendiente = datos;
            break;
        }
    }
    if (!pendiente) return;
    
    if (msgText.toLowerCase() === 'cancelar') {
        delete PENDIENTES[`${pendiente.groupId}|${pendiente.phone}`];
        return m.reply('❌ *Vinculación cancelada.*');
    }
    
    if (!/^\d{4}$/.test(msgText)) return;
    
    if (Date.now() > pendiente.expira) {
        delete PENDIENTES[`${pendiente.groupId}|${pendiente.phone}`];
        return m.reply(`⏰ *Código expirado.* Usá \`.vincular ${pendiente.phone}\` de nuevo.`);
    }
    
    if (msgText !== pendiente.code) {
        return m.reply(`❌ *Código incorrecto.* Escribí *cancelar* para cancelar.`);
    }
    
    const usuarios = cargarUsuariosAcceso();
    const idx = usuarios.findIndex(u => u.phone === pendiente.phone);
    
    if (idx === -1) {
        delete PENDIENTES[`${pendiente.groupId}|${pendiente.phone}`];
        return m.reply(`❌ La licencia de ${pendiente.phone} ya no está activa.`);
    }
    
    if (!usuarios[idx].groupLids) usuarios[idx].groupLids = [];
    if (!usuarios[idx].groupLids.includes(senderId)) {
        usuarios[idx].groupLids.push(senderId);
        guardarUsuariosAcceso(usuarios);
    }
    
    const configGrupo = cargarConfigGrupo(pendiente.groupId);
    configGrupo.adminPhone = pendiente.phone;
    guardarConfigGrupo(pendiente.groupId, configGrupo);
    
    const nombre = usuarios[idx].name || 'Usuario';
    delete PENDIENTES[`${pendiente.groupId}|${pendiente.phone}`];
    
    await m.react('✅').catch(() => {});
    await m.reply(
        `✅ *¡Vinculación confirmada!*\n\n` +
        `👤 *${nombre}* — ${pendiente.phone}\n` +
        `🤖 Admin del grupo configurado.`
    );
});

module.exports = {};
