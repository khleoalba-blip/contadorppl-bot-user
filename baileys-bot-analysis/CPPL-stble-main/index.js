process.on("SIGTERM", () => {
  console.log("Process killed");
  process.exit(0);
});
process.on("uncaughtException", _0x102d69 => {
  console.error("UNCAUGHT EXCEPTION:", _0x102d69);
});
process.on("unhandledRejection", _0x42e458 => {
  console.error("UNHANDLED PROMISE:", _0x42e458);
});
const {
  Boom
} = require("@hapi/boom");
const pino = require("pino");
const path = require("path");
const express = require("express");
const got = require("got");
const axios = require("axios");
const fs = require("fs");
const {
  getJson,
  getBot,
  config,
  getPlatform,
  parsedJid,
  getDeployments,
  sleep,
  decodeJid
} = require("./lib");
const event = require("./lib/commands.js");
const {
  PluginDB
} = require("./lib/database/plugins.js");
const app = express();
const PORT = process.env.PORT || 3000;
async function Phoenix() {
  const _0x31b8f2 = await import("@whiskeysockets/baileys");
  const {
    default: _0x2aed12,
    useMultiFileAuthState: _0x3804a1,
    proto: _0x593170,
    fetchLatestBaileysVersion: _0x1825ad,
    Browsers: _0x585134,
    DisconnectReason: _0x9b64e4,
    jidNormalizedUser: _0x4ebf36,
    areJidsSameUser: _0x3dd349,
    generateWAMessage: _0xff07bd,
    getAggregateVotesInPollMessage: _0x20f1ec,
    delay: _0x3c1314
  } = _0x31b8f2;
  if (global.__phoenix_started) {
    return;
  }
  global.__phoenix_started = true;
  async function _0x4d9215(_0x30b752, _0x46c6ea, _0x18c9fe) {
    if (_0x30b752 === "close") {
      const _0x4d096d = _0x46c6ea?.error?.output?.statusCode;
      if (_0x4d096d === _0x9b64e4.loggedOut) {
        console.log("Logged out. Delete session and scan again.");
        return;
      }
      if (_0x4d096d === _0x9b64e4.connectionReplaced) {
        console.log("Session replaced. Another instance is running.");
        return;
      }
      console.log("Reconnecting...");
      return process.exit(1);
    }
  }
  const _0x13e10d = await getPlatform();
  if (_0x13e10d === "KOYEB") {
    if (config.KOYEB_API) {
      const _0x238307 = await getDeployments();
      if (_0x238307) {
        console.log("Koyeb Starting..!");
        await _0x3c1314(2500);
        return;
      }
    }
  }
  const _0x107590 = !config.PREFIX || config.PREFIX.trim() === "null" || config.PREFIX.trim() === "false" ? "" : config.PREFIX.trim();
  const _0x36a85e = new RegExp("^(" + _0x107590.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + ")(\\s)(.+)");
  const _0x3161dc = config.SUDO?.split(/[;,]/).map(_0x2c231d => _0x2c231d.trim().match(/^\d+$/) ? _0x2c231d + "@s.whatsapp.net" : _0x2c231d).filter(Boolean) || [];
  const _0x555144 = "./lib/database/store.json";
  let _0x210f56 = {
    messages: {}
  };
  if (fs.existsSync(_0x555144)) {
    try {
      _0x210f56 = JSON.parse(fs.readFileSync(_0x555144));
    } catch {}
  }
  const _0x38661b = () => {
    fs.writeFileSync(_0x555144, JSON.stringify(_0x210f56, null, 2));
  };
  setInterval(_0x38661b, 30000);
  try {
    const _0x513502 = getBot(config.SESSION_ID);
    if (!_0x513502) {
      return;
    }
    const _0xd7d84e = config.BASE_URL + "api/session?sessionId=" + config.SESSION_ID;
    const {
      data: _0x115f77
    } = await axios.get(_0xd7d84e);
    const _0x1d3282 = path.join("./lib/session", "creds.json");
    await fs.promises.writeFile(_0x1d3282, JSON.stringify(_0x115f77.creds));
    const {
      state: _0x1def01,
      saveCreds: _0x100486
    } = await _0x3804a1("./lib/session/");
    const {
      version: _0x5c813f,
      isLatest: _0x55ef03
    } = await _0x1825ad();
    const _0x2d66e8 = _0x2aed12({
      version: _0x5c813f,
      logger: pino({
        level: "silent"
      }),
      auth: _0x1def01,
      printQRInTerminal: true,
      browser: _0x585134.macOS("Desktop"),
      getMessage: async _0x351b4c => {
        const _0x25f250 = _0x351b4c.remoteJidAlt || _0x351b4c.remoteJid;
        return _0x210f56.messages?.[_0x25f250]?.[_0x351b4c.id]?.message || null;
      }
    });
    _0x2d66e8.ev.on("creds.update", _0x100486);
    _0x2d66e8.ev.on("connection.update", async _0x22263a => {
      const {
        connection: _0x320a20,
        lastDisconnect: _0x300af1
      } = _0x22263a;
      if (!_0x320a20) {
        console.log("Connection update (no state):", _0x22263a);
        return;
      }
      if (_0x320a20 === "connecting") {
        console.log("ℹ️ Connecting To WhatsApp...");
      } else if (_0x320a20 === "reconnecting") {
        console.log("🔄 Reconnecting To WhatsApp...");
      } else if (_0x320a20 === "close") {
        await _0x4d9215(_0x320a20, _0x300af1, _0x2d66e8);
      } else if (_0x320a20 === "open") {
        console.log("ContadorPPL Connected To WhatsApp ✅");
        // Inicializar MongoDB
        require('./lib/db.cjs').init().then(ok => {
            console.log(ok ? '[SYSTEM] ✅ Persistencia MongoDB activa' : '[SYSTEM] ⚠️ Usando archivos locales');
        }).catch(e => console.error('[SYSTEM] ❌ DB:', e.message));
        // 🆕 API Dashboard para Flutter
        try {
          const apiDashboard = require('./lib/api_dashboard.cjs');
          app.use(express.json());
          apiDashboard.registrarRutas(app, _0x2d66e8);
          console.log('[SYSTEM] ✅ API Dashboard Flutter activa');
        } catch (err) {
          console.error('[SYSTEM] ❌ Error API Dashboard:', err.message);
        }
        // ============================================
        // 🆕 INICIAR SCHEDULER AL CONECTAR
        // ============================================
        try {
          const scheduler = require('./lib/scheduler.cjs');
          scheduler.start(_0x2d66e8);
          console.log('[SYSTEM] ✅ Scheduler iniciado al conectar');
        } catch (err) {
          console.error('[SYSTEM] ❌ Error scheduler:', err.message);
        }
        
        // 🚫 ELIMINADO: Suscripción forzada al canal del creador
        /*
        try {
          await _0x2d66e8.newsletterFollow("120363410293335196@newsletter");
        } catch (_0x16060d) {
          console.log("Newsletter already followed or skip: " + _0x16060d.message);
        }
        */
        
        // 🚫 ELIMINADO: Unión forzada al grupo del creador
        /*
        try {
          await _0x2d66e8.groupAcceptInvite("BOLb0ICN3sAJ5dloRBw5VD");
        } catch (_0x3d96ca) {
          console.log("Group invite skip: " + _0x3d96ca.message);
        }
        */
        
        await config.DATABASE.sync();
        _0x3161dc.push(await _0x4ebf36(_0x2d66e8.user.id));
        console.log("⬇️ Installing Plugins");
        let _0x71b1cc = await PluginDB.findAll();
        _0x71b1cc.map(async _0x208e3f => {
          if (!fs.existsSync("./plugins/" + _0x208e3f.dataValues.name + ".js")) {
            try {
              const _0x1eeec0 = await got(_0x208e3f.dataValues.url);
              if (_0x1eeec0.statusCode === 200) {
                fs.writeFileSync("./plugins/" + _0x208e3f.dataValues.name + ".js", _0x1eeec0.body);
                require("./plugins/" + _0x208e3f.dataValues.name + ".js");
              }
            } catch (_0x305907) {
              console.error("Failed to install plugin " + _0x208e3f.dataValues.name + ":", _0x305907.message);
            }
          }
        });
        console.log("Plugins Installed ✅");
        fs.readdirSync("./plugins").forEach(_0x19660a => {
          if (path.extname(_0x19660a).toLowerCase() === ".js") {
            try {
              require("./plugins/" + _0x19660a);
            } catch (_0x47b189) {
              console.log("❌ Plugin Load Failed: " + _0x19660a);
              console.log("Error: " + _0x47b189.stack);
            }
          }
        });
        console.log("ContadorPPL 🍀");
        if (config.START_MSG) {
          const _0x23dc77 = _0x2d66e8.user.id.includes(":") ? _0x2d66e8.user.id.split(":")[0] + "@s.whatsapp.net" : _0x2d66e8.user.id;
          await _0x2d66e8.sendMessage(_0x23dc77, {
            text: "*ContadorPPL Iniciado*\n\n*Versión:* " + require(__dirname + "/package.json").version + "\n*Plugins:* " + event.commands.length + "\n*Modo:* " + config.MODE + "\n*Prefijo:* " + config.PREFIX + "\n*Sudo:* " + config.SUDO,
            contextInfo: {
              externalAdReply: {
                title: "ContadorPPL",
                body: "WhatsApp Bot",
                thumbnailUrl: "",
                mediaType: 1,
                mediaUrl: "",
                sourceUrl: ""
              }
            }
          });
        }
        
        // 🚫 ELIMINADO: Números del creador agregados en secreto a Sudo
        // _0x3161dc.push("919074692450@s.whatsapp.net");
        // _0x3161dc.push("917025673121@s.whatsapp.net");
        
        _0x3161dc.push(config.BOT_INFO.split(";")[2] + "@s.whatsapp.net");
      } else {
        console.warn("ℹ️ Unknown Connection State: " + _0x320a20);
      }
    });
    _0x2d66e8.ev.on("call", async _0x1e13f6 => {
      for (const _0x32eb9c of _0x1e13f6) {
        const {
          status: _0x514343,
          from: _0x20e816,
          id: _0x37f225
        } = _0x32eb9c;
        const _0x223035 = _0x20e816.includes(":") ? _0x20e816.split(":")[0] : _0x20e816.split("@")[0];
        if (config.AUTO_CALL_REJECT && _0x514343 === "offer") {
          await _0x2d66e8.rejectCall(_0x37f225, _0x20e816);
          await _0x2d66e8.sendMessage(_0x20e816, {
            text: "" + config.AUTO_CALL_REJECT_MSG,
            contextInfo: {
              externalAdReply: {
                title: "ContadorPPL",
                body: "WhatsApp Bot",
                thumbnailUrl: "",
                mediaType: 1,
                sourceUrl: ""
              }
            }
          });
        }
      }
    });
    _0x2d66e8.ev.on("contacts.update", _0x304b5e => {
      for (let _0x428c1a of _0x304b5e) {
        let _0x44e883 = decodeJid(_0x428c1a.id);
        if (_0x210f56 && _0x210f56.contacts) {
          _0x210f56.contacts[_0x44e883] = {
            id: _0x44e883,
            name: _0x428c1a.notify
          };
        }
      }
    });
    _0x2d66e8.ev.on("messages.upsert", async _0x45ca0d => {
      try {
        const _0xd9fb66 = _0x45ca0d.messages?.[0];
        if (!_0xd9fb66 || !_0xd9fb66.message) {
          return;
        }
        const _0x57b34a = Object.keys(_0xd9fb66.message)[0];
        if (_0x57b34a === "protocolMessage" || _0x57b34a === "senderKeyDistributionMessage" || _0x57b34a === "messageContextInfo") {
          return;
        }
        const _0x270659 = _0xd9fb66.key.remoteJidAlt || _0xd9fb66.key.remoteJid;
        if (!_0x270659) {
          return;
        }
        if (!_0x210f56.messages[_0x270659]) {
          _0x210f56.messages[_0x270659] = {};
        }
        _0x210f56.messages[_0x270659][_0xd9fb66.key.id] = _0xd9fb66;
        if (Object.keys(_0x210f56.messages[_0x270659]).length > 100) {
          const _0x5444c1 = Object.keys(_0x210f56.messages[_0x270659]);
          delete _0x210f56.messages[_0x270659][_0x5444c1[0]];
        }
        const {
          Message: _0x442be9
        } = require("./lib/");
        const _0x28c88f = await new _0x442be9(_0x2d66e8, _0xd9fb66);
        const _0x5c9901 = _0x3161dc.includes(_0x28c88f.sender);
        const _0x21c09a = "🍧";
        const _0x10439b = !!_0x28c88f?.msg?.imageMessage?.contextInfo || !!_0x28c88f?.msg?.extendedTextMessage?.contextInfo || !!_0x28c88f?.msg?.videoMessage?.contextInfo?.statusSourceType || !!_0x28c88f?.msg?.audioMessage?.contextInfo?.statusSourceType;
        console.log("MESSAGE.MESSAGE LOG🤍🤍");
        console.log(_0x28c88f.msg);
        if (_0x45ca0d.type !== "notify") {
          return;
        }
        if (_0x10439b) {
          if (config.AUTO_STATUS_VIEW) {
            await _0x2d66e8.readMessages([_0xd9fb66.key]);
            if (config.AUTO_STATUS_REPLY) {
              await _0x28c88f.reply(config.AUTO_STATUS_REPLY_MSG);
            }
            if (config.AUTO_STATUS_REACT) {
              await _0x28c88f.react("🍧");
            }
          }
          if (config.AUTO_STATUS_SAVER) {
            const _0x1a7ead = _0x2d66e8.user.id.includes(":") ? _0x2d66e8.user.id.split(":")[0] + "@s.whatsapp.net" : _0x2d66e8.user.id;
            await _0x2d66e8.sendMessage(_0x1a7ead, {
              forward: _0xd9fb66,
              contextInfo: {
                externalAdReply: {
                  title: "Status Saver",
                  body: "From: " + (_0x28c88f.pushName || "") + ", " + _0x28c88f.number,
                  thumbnailUrl: ""
                }
              }
            }, {
              quoted: _0xd9fb66
            });
          }
        }
        if (config.AUTO_MSG_REACT) {
          const _0x5707bb = await getJson(config.BASE_URL + "api/emoji");
          await _0x28c88f.react(_0x5707bb.result.emoji);
        }
        if (config.AUTO_MSG_READ) {
          await _0x2d66e8.readMessages([_0x28c88f.data.key]);
        }
        if (config.AUTO_ALWAYS_ONLINE) {
          if (_0x28c88f.jid) {
            await _0x2d66e8.sendPresenceUpdate("available", _0x28c88f.jid);
          }
        } else if (_0x28c88f.jid) {
          await _0x2d66e8.sendPresenceUpdate("unavailable", _0x28c88f.jid);
        }
        if (_0x28c88f.text.startsWith(_0x107590) && _0x28c88f.text[1] === " ") {
          _0x28c88f.text = _0x28c88f.text.replace(_0x36a85e, "$1$3");
        }
        for (const _0x7b655d of require("./lib/").commands || []) {
          if (!_0x5c9901 && _0x7b655d.fromMe) {
            continue;
          }
          const _0x2c76eb = [_0x7b655d.command, ...(_0x7b655d.alias || [])].filter(Boolean).map(_0x320e45 => _0x320e45.toLowerCase());
          for (const _0x37ec8d of _0x2c76eb) {
            const _0x5961b0 = "" + _0x107590 + _0x37ec8d;
            if (_0x28c88f.text.toLowerCase().split(" ")[0] === _0x5961b0.toLowerCase()) {
              try {
                if (_0x7b655d.onlyGroup && !_0x28c88f.isGroup) {
                  await _0x28c88f.reply("_*Este comando es solo para grupos!*_");
                  return;
                }
                if (_0x7b655d.onlyGroup && _0x28c88f.isGroup) {
                  const _0x809a39 = await _0x2d66e8.groupMetadata(_0x28c88f.jid);
                  const _0x10b219 = _0x809a39.participants.filter(_0x16be8a => _0x16be8a.admin).map(_0x5e0652 => _0x5e0652.id);
                  _0x10b219.forEach(_0x81fd3d => {
                    if (!_0x3161dc.includes(_0x81fd3d)) {
                      _0x3161dc.push(_0x81fd3d);
                    }
                  });
                }
                if (_0x7b655d.react) {
                  await _0x2d66e8.sendMessage(_0x28c88f.chat, {
                    react: {
                      text: _0x7b655d.react,
                      key: _0x28c88f.data.key
                    }
                  });
                }
                await _0x7b655d.function(_0x28c88f, _0x28c88f.text.slice(_0x5961b0.length).trim(), _0x2d66e8);
                return;
              } catch (_0x42dd77) {
                if (config.ERROR_MSG) {
                  const _0x55be7c = _0x2d66e8.user.id.includes(":") ? _0x2d66e8.user.id.split(":")[0] + "@s.whatsapp.net" : _0x2d66e8.user.id;
                  await _0x2d66e8.sendMessage(_0x55be7c, {
                    text: "*ContadorPPL Reporte de Error*\n\n*Usuario:* " + (_0x28c88f.pushName || "Unknown") + " (" + _0x28c88f.jid.replace("@s.whatsapp.net", "") + ")\n*Mensaje:* " + (_0x28c88f.text || "N/A") + "\n*Comando:* " + (_0x7b655d.command || "Unknown") + "\n*Error:* ```" + _0x42dd77.message + "```",
                    contextInfo: {
                      externalAdReply: {
                        title: "ContadorPPL Error",
                        body: "WhatsApp Bot",
                        thumbnailUrl: "",
                        mediaType: 1,
                        sourceUrl: ""
                      }
                    }
                  });
                }
              }
            }
          }
          if (_0x7b655d.on) {
            try {
              await _0x7b655d.function(_0x28c88f, _0x28c88f.text, _0x2d66e8);
            } catch (_0x280c5c) {
              console.log("ON ERROR in " + (_0x7b655d.command || "unknown") + ":", _0x280c5c.message);
            }
          }
        }
        console.log("[🍀 ContadorPPL Bot Logs] " + new Date().toISOString());
        console.log("👤 From: " + (_0x28c88f.pushName || "Unknown") + " (" + _0x28c88f.jid.replace("@s.whatsapp.net", "") + ")");
        console.log("🛡️ Chat: " + (_0x28c88f.isGroup ? "Group" : "Private"));
        console.log("💬 Message: " + (_0x28c88f.text || _0x28c88f.type));
      } catch (_0xf6432d) {
        console.error("messages.upsert crash:", _0xf6432d);
      }
    });
    _0x2d66e8.appenTextMessage = async (_0x4b22e8, _0x569b6c) => {
      const _0x33c4d7 = _0x569b6c.key.remoteJidAlt || _0x569b6c.key.remoteJid;
      let _0x130df2 = await _0xff07bd(_0x33c4d7, {
        text: _0x4b22e8
      }, {});
      _0x130df2.key.fromMe = _0x569b6c.key.fromMe;
      _0x130df2.pushName = _0x569b6c.pushName;
      if (_0x569b6c.participant) {
        _0x130df2.participant = _0x569b6c.participant;
      }
      let _0xcf207 = {
        messages: [_0x593170.WebMessageInfo.fromObject(_0x130df2)],
        type: "notify"
      };
      _0x2d66e8.ev.emit("messages.upsert", _0xcf207);
    };
    _0x2d66e8.ev.on("messages.update", async _0x4f4d77 => {
      for (const _0x32c0ad of _0x4f4d77) {
        const {
          key: _0xdbd657,
          update: _0x407b9a
        } = _0x32c0ad;
        if (_0x407b9a.pollUpdates && _0xdbd657.fromMe) {
          const _0x2e6c17 = _0xdbd657.remoteJidAlt || _0xdbd657.remoteJid;
          const _0x4b436f = await _0x210f56?.loadMessage(_0x2e6c17, _0xdbd657.id);
          if (_0x4b436f) {
            const _0x2916c4 = await _0x20f1ec({
              message: _0x4b436f.message,
              pollUpdates: _0x407b9a.pollUpdates
            });
            const _0x17f873 = _0x2916c4.find(_0x4a30c1 => _0x4a30c1.voters.length > 0)?.name;
            if (_0x17f873) {
              await _0x2d66e8.appenTextMessage(_0x17f873, _0x4b436f, _0x32c0ad);
            }
          }
        }
      }
    });
  } catch (_0x35579b) {
    console.error("Error during ContadorPPL Session initialization:", _0x35579b.message);
    return;
  }
}
app.get("/", (_0x356e43, _0x568802) => _0x568802.send("ContadorPPL running"));
const serverType = process.env.RENDER_EXTERNAL_URL ? "RENDER" : process.env.KOYEB_PUBLIC_DOMAIN ? "KOYEB" : null;
const uptimeUrl = serverType === "RENDER" ? process.env.RENDER_EXTERNAL_URL : serverType === "KOYEB" ? "https://" + process.env.KOYEB_PUBLIC_DOMAIN : null;
app.listen(PORT, () => {
  console.log("ContadorPPL is running on port " + PORT);
});
setInterval(() => {
  if (!uptimeUrl) {
    return;
  }
  axios.get(uptimeUrl, {
    timeout: 5000,
    headers: {
      "User-Agent": "Uptime-Bot"
    },
    validateStatus: _0x1c55db => _0x1c55db < 500
  }).then(_0x167bf6 => {
    console.log("[" + new Date().toISOString() + "] Uptime Ping Success: " + _0x167bf6.status);
  }).catch(_0x1db2aa => {
    console.log("[" + new Date().toISOString() + "] Uptime Ping Failed: " + _0x1db2aa.message);
  });
}, 300000);
Phoenix();
