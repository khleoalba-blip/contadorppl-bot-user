const { pnix } = require('../lib/commands');
const { verificarAccesoUsuario } = require('../lib/jugadas.cjs');
const { cargarConfigGrupo, guardarConfigGrupo } = require('../lib/grupo_config.cjs');

// Almacén temporal de códigos
const CODIGOS_BANCO = {};

// Función para generar el código (se llama desde suma.js)
module.exports.generarCodigoBanco = function(groupId) {
    const codigo = 'BANCO-' + Math.floor(1000 + Math.random() * 9000);
    CODIGOS_BANCO[codigo] = { workGroupId: groupId, expira: Date.now() + (5 * 60 * 1000) };
    return codigo;
};

// 🆕 Función robusta para detectar grupos (igual que en suma.js)
function getGroupId(m) {
    const chat = m.from || m.chat || '';
    if (chat.includes('@g.us')) return chat.replace('@g.us', '');
    return null;
}

pnix({
    command: 'vincularbanco',
    fromMe: false,
    desc: 'Vincula este grupo como grupo de la banca',
    type: 'command'
}, async (m, conn) => {
    const groupId = getGroupId(m); // Usar la función robusta
    
    if (!groupId) {
        return m.reply('⚠️ *Este comando se usa en el grupo de la banca.*');
    }

    const args = (m.text || m.body || '').trim().split(/\s+/);
    const codigo = args[1];

    if (!codigo) {
        return m.reply('⚠️ *Uso:*\n\n`.vincularbanco TU_CODIGO`\n\nEjemplo: `.vincularbanco BANCO-7392`');
    }

    const datosCodigo = CODIGOS_BANCO[codigo.toUpperCase()];
    if (!datosCodigo) {
        return m.reply('❌ Código inválido o expirado. Genera uno nuevo en tu grupo de trabajo con `.suma config banco iniciar`');
    }

    if (Date.now() > datosCodigo.expira) {
        delete CODIGOS_BANCO[codigo.toUpperCase()];
        return m.reply('❌ El código ha expirado. Genera uno nuevo.');
    }

    const rawId = m.sender || '';
    const acceso = verificarAccesoUsuario(rawId);
    if (!acceso.autorizado) return m.reply('❌ No tienes licencia activa.');

    // 1. Guardar en la configuración del GRUPO DE TRABAJO
    const workConfig = cargarConfigGrupo(datosCodigo.workGroupId);
    workConfig.bancoGroupJid = groupId + '@g.us'; // Guardar el ID completo del grupo de banca
    guardarConfigGrupo(datosCodigo.workGroupId, workConfig);

    // 2. Guardar en la configuración de ESTE GRUPO DE BANCA
    // Esto evita que el bot procese jugadas de listeros aquí por error
    const bankConfig = cargarConfigGrupo(groupId);
    bankConfig.esGrupoBanca = true;
    bankConfig.workGroupJid = datosCodigo.workGroupId; // De dónde viene
    guardarConfigGrupo(groupId, bankConfig);

    delete CODIGOS_BANCO[codigo.toUpperCase()];

    return m.reply(
        `✅ *¡Grupo de Banca vinculado exitosamente!*\n\n` +
        `📩 A partir de ahora, las jugadas válidas del grupo de trabajo se reenviarán aquí automáticamente.`
    );
});
