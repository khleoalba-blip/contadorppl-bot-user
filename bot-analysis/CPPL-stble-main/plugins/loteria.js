console.log('[LOTERIA-INIT] 🎰 Plugin .loteria cargándose...');

const { pnix } = require('../lib/commands');
const { cargarUltimaLoteria, guardarUltimaLoteria, LOTERIAS, verificarAccesoUsuario } = require('../lib/jugadas.cjs');
const { cargarConfigGrupo, guardarConfigGrupo } = require('../lib/grupo_config.cjs');

function getUserId(m) {
    const sender = m.sender || 'unknown';
    if (sender.includes('@lid')) return sender;
    return sender.replace('@s.whatsapp.net', '').replace(':0', '');
}

function getGroupId(m) {
    const chat = m.from || m.chat || '';
    if (chat.includes('@g.us')) return chat.replace('@g.us', '');
    return null;
}

const LOTERIA_DISPLAY = {
    'Florida': 'Florida 🦩',
    'Georgia': 'Georgia 🍑',
    'New_York': 'New York 🗽'
};

pnix({
    command: 'loteria',
    fromMe: false,
    desc: 'Cambia la lotería (por grupo o por usuario)',
    type: 'command'
}, async (m, conn) => {
    const rawId = getUserId(m);
    const groupId = getGroupId(m);

    const acceso = verificarAccesoUsuario(rawId);
    if (!acceso.autorizado) {
        if (rawId.includes('@lid') && groupId) {
            return m.reply('❌ *Acceso denegado*\n\nUsa `.vincular TU_NUMERO` en este grupo.');
        }
        return m.reply(acceso.mensaje);
    }

    const userId = acceso.realPhone;

    if (groupId) {
        const configGrupo = cargarConfigGrupo(groupId);
        if (configGrupo.adminPhone && configGrupo.adminPhone !== userId) {
            const isAdmin = configGrupo.adminPhone === userId || rawId.includes(configGrupo.adminPhone);
            if (!isAdmin) return m.reply('❌ Solo el admin del grupo puede cambiar la lotería.');
        }
    }

    const args = (m.text || m.body || '').trim().split(/\s+/);
    const loteArg = args[1]?.toLowerCase();

    if (loteArg) {
        const match = LOTERIAS.find(l => l.toLowerCase() === loteArg.replace(/_/g, '_'));
        if (!match) {
            let resp = `❌ *Lotería no válida*\n\n📋 Opciones:\n`;
            for (const lot of LOTERIAS) {
                resp += `• \`.loteria ${lot.replace('_', ' ').toLowerCase()}\` — ${LOTERIA_DISPLAY[lot]}\n`;
            }
            return m.reply(resp);
        }

        if (groupId) {
            const configGrupo = cargarConfigGrupo(groupId);
            configGrupo.loteriaActual = match;
            guardarConfigGrupo(groupId, configGrupo);
            return m.reply(`✅ *Lotería del grupo cambiada a ${LOTERIA_DISPLAY[match]}*`);
        } else {
            guardarUltimaLoteria(userId, match);
            m.react('✅').catch(() => {});
            return m.reply(`✅ *Tu lotería cambió a ${LOTERIA_DISPLAY[match]}*`);
        }
    }

    if (groupId) {
        const configGrupo = cargarConfigGrupo(groupId);
        const actual = configGrupo.loteriaActual || 'Florida';
        let resp = `🎰 *Lotería del grupo*\n\n📌 Actual: *${LOTERIA_DISPLAY[actual] || actual}*\n\n`;
        for (const lot of LOTERIAS) {
            resp += `• \`.loteria ${lot.replace('_', ' ').toLowerCase()}\` — ${LOTERIA_DISPLAY[lot]}\n`;
        }
        return m.reply(resp);
    } else {
        const actual = cargarUltimaLoteria(userId);
        let resp = `🎰 *Tu lotería personal*\n\n📌 Actual: *${LOTERIA_DISPLAY[actual] || actual}*\n\n`;
        for (const lot of LOTERIAS) {
            resp += `• \`.loteria ${lot.replace('_', ' ').toLowerCase()}\` — ${LOTERIA_DISPLAY[lot]}\n`;
        }
        return m.reply(resp);
    }
});

console.log('[LOTERIA-INIT] ✅ Plugin .loteria registrado');
module.exports = {};
