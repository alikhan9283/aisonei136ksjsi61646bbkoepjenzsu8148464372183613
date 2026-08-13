const fs = require('fs');
const path = require('path');
const { cmd } = require("../command");
const { isOwner: isOwnerNumber } = require('../lib/owner');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'voice');
const DATA_FILE = path.join(__dirname, '..', 'data', 'av2.json');

// ── Helpers ──────────────────────────────────────────────
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error('AV2 loadData error:', e.message);
    }
    return { enabled: false };
}

function saveData(data) {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('AV2 saveData error:', e.message);
    }
}

function getFiles() {
    try {
        if (!fs.existsSync(ASSETS_DIR)) return [];
        return fs.readdirSync(ASSETS_DIR).filter(f => /\.(m4a|mp3|mp4|ogg|jpg|jpeg|png|webp)$/i.test(f));
    } catch (e) {
        return [];
    }
}

function findFile(query) {
    const files = getFiles();
    const q = query.toLowerCase();
    return files.find(f =>
        f.toLowerCase().replace(/\.(m4a|mp3|mp4|ogg|jpg|jpeg|png|webp)$/i, '') === q ||
        f.toLowerCase().startsWith(q)
    );
}

const FOOTER = `‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

async function sendMedia(conn, from, mek, fileName) {
    const filePath = path.join(ASSETS_DIR, fileName);
    const buffer = fs.readFileSync(filePath);
    const isVideo = /\.mp4$/i.test(fileName);
    const isOgg = /\.ogg$/i.test(fileName);
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(fileName);

    if (isVideo) {
        await conn.sendMessage(from, {
            video: buffer,
            mimetype: 'video/mp4',
            caption: FOOTER
        }, { quoted: mek });
    } else if (isImage) {
        await conn.sendMessage(from, {
            image: buffer,
            caption: FOOTER
        }, { quoted: mek });
    } else if (isOgg) {
        await conn.sendMessage(from, {
            audio: buffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: mek });
    } else {
        await conn.sendMessage(from, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: fileName
        }, { quoted: mek });
    }
}

// ── Self-registering keyword auto-trigger ──────────────────
// Attaches a messages.upsert listener directly on the given `conn`, so that
// when .av2 is ON, typing just a bare keyword (no "." prefix) sends the
// matching audio/video/image. This lives entirely inside this file —
// server.js is never touched. A flag is stashed on the conn object itself so
// the listener is only attached once per connection, even though the
// command handler runs on every .av2 call.
function attachAutoTrigger(conn) {
    if (conn.__av2AutoTriggerAttached) return;
    conn.__av2AutoTriggerAttached = true;

    conn.ev.on('messages.upsert', async (upsert) => {
        try {
            const data = loadData();
            if (!data.enabled) return;

            for (const message of upsert.messages || []) {
                try {
                    if (!message.message) continue;

                    // NOTE: messages sent from the owner's own linked number
                    // (including "Message yourself" self-chat, which ALWAYS
                    // has fromMe === true) must still trigger — otherwise
                    // testing the bot by messaging yourself looks broken.
                    // Only reactions/protocol/status messages are skipped,
                    // since those have no meaningful text body anyway and
                    // skipping them prevents any reaction-loop risk.
                    if (message.message.reactionMessage || message.message.protocolMessage) continue;
                    if (message.key.remoteJid === 'status@broadcast') continue;

                    const body =
                        message.message.conversation ||
                        message.message.extendedTextMessage?.text ||
                        message.message.imageMessage?.caption ||
                        message.message.videoMessage?.caption ||
                        '';

                    const text = body.trim();
                    if (!text) continue;

                    // Don't trigger on actual bot commands (anything starting
                    // with a command prefix character) so this never fights
                    // with normal command dispatch.
                    if (/^[.!/#]/.test(text)) continue;

                    const match = findFile(text.toLowerCase());
                    if (!match) continue;

                    await sendMedia(conn, message.key.remoteJid, message, match);
                } catch (innerErr) {
                    console.error('AV2 auto-trigger (per-message) error:', innerErr.message);
                }
            }
        } catch (e) {
            console.error('AV2 auto-trigger error:', e.message);
        }
    });
}

cmd({
  pattern: "av2",
  alias: ["voice2", "audio2"],
  desc: "Audio/Video/Image keyword-trigger system",
  react: '🎵',
  category: 'owner',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  sender,
  reply
}) => {
  try {
    // Self-register the keyword auto-trigger listener the first time this
    // command runs on a given connection.
    attachAutoTrigger(conn);

    // Owner check done entirely inside this file, independent of what the
    // dispatcher passes through.
    const botSelfNum = conn.user.id.split(':')[0].split('@')[0];
    const senderRaw = sender || m.key.participant || m.key.remoteJid || '';
    const senderNum = String(senderRaw).split('@')[0].split(':')[0];
    const isOwner = !!m.key.fromMe || senderNum === botSelfNum || isOwnerNumber(senderNum) || isOwnerNumber(senderRaw);

    if (!isOwner) {
      return reply("❌ *Sirf Owner use kar sakta hai!*");
    }

    const sub = (args[0] || "").toLowerCase();
    const data = loadData();
    const files = getFiles();

    // .av2 on
    if (sub === 'on') {
      data.enabled = true;
      saveData(data);
      const list = files.map(f => f.replace(/\.(m4a|mp3|mp4|ogg|jpg|jpeg|png|webp)$/i, '')).join(', ');
      return reply(`‎*_ᴀᴠ2 sʏsᴛᴇᴍ_* 🎵
‎╭───────────────━┈⊷
‎│▸✅ *sᴛᴀᴛᴜs:* AV2 ON!
‎│▸ℹ️ Ab sirf naam likho, media aayega
‎│▸📂 *ғɪʟᴇs:* ${files.length}
‎│▸📝 ${list || 'koi file nahi'}
‎╰───────────────━┈⊷
${FOOTER}`);
    }

    // .av2 off
    if (sub === 'off') {
      data.enabled = false;
      saveData(data);
      return reply(`‎*_ᴀᴠ2 sʏsᴛᴇᴍ_* 🎵
‎╭───────────────━┈⊷
‎│▸⛔ *sᴛᴀᴛᴜs:* AV2 OFF!
‎╰───────────────━┈⊷
${FOOTER}`);
    }

    // .av2 <filename> — direct send
    if (sub && sub !== 'list') {
      const match = findFile(sub);
      if (!match) {
        const list = files.map(f => f.replace(/\.(m4a|mp3|mp4|ogg|jpg|jpeg|png|webp)$/i, '')).join('\n│ ');
        return reply(`‎*_ᴀᴠ2 sʏsᴛᴇᴍ_* 🎵
‎╭───────────────━┈⊷
‎│▸❌ *"${sub}"* nahi mila!
‎│▸📝 *ᴀᴠᴀɪʟᴀʙʟᴇ:*
‎│ ${list || 'koi file nahi'}
‎╰───────────────━┈⊷
${FOOTER}`);
      }
      try {
        await store.react('⌛');
        await sendMedia(conn, from, m, match);
        await store.react('✅');
      } catch (e) {
        await store.react('❌');
        reply(`⚠️ Error: ${e.message}`);
      }
      return;
    }

    // .av2 list ya .av2 (no args)
    const status = data.enabled ? '🟢 ON' : '🔴 OFF';
    const list = files.length
      ? files.map((f, i) => `‎│ ${i + 1}. ${f.replace(/\.(m4a|mp3|mp4|ogg|jpg|jpeg|png|webp)$/i, '')}`).join('\n')
      : '‎│ ❌ Koi file nahi!';

    reply(`‎*_ᴀᴠ2 sʏsᴛᴇᴍ_* 🎵
‎╭───────────────━┈⊷
‎│▸📊 *sᴛᴀᴛᴜs:* ${status}
‎│▸📂 *ғɪʟᴇs:* ${files.length}
‎│
${list}
‎│
‎│▸⚙️ *ᴄᴏᴍᴍᴀɴᴅs:*
‎│ .av2 on — Enable
‎│ .av2 off — Disable
‎│ .av2 <name> — Direct send
‎│ .av2 list — Ye list
‎╰───────────────━┈⊷
${FOOTER}`);

  } catch (error) {
    console.error("❌ AV2 Command Error:", error);
    reply(`⚠️ Error: ${error.message}`);
  }
});
