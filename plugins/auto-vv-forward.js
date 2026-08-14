// SARWAR-MD
// ═══════════════════════════════════════════════════════════
//  AUTO ONE-VIEW (VV) INBOX FORWARD SYSTEM — REAL WORKING
//  ─────────────────────────────────────────────────────────
//  .vvon      → ON  : har one-view img/video/voice auto forward ⏩
//  .vvoff     → OFF : band
//  .vvstatus  → status dekho
//  + Automatic listener: har aane wala message scan hota hai
//    (anti-once.js jaisa system jo already chalta hai)
// ═══════════════════════════════════════════════════════════
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd } from '../command.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ══════════ FANCY BOT NAME STYLES (SARWAR-MD ping structure) ══════════
const botNameStyles = [
    "𝘚𝘈𝘙𝘞𝘈𝘙-𝘔𝘋",
    "𝙎𝘼𝙍𝙒𝘼𝙍-𝙈𝘿",
    "🆂🅰🆁🆆🅰🆁-🅼🅳",
    "🅂🄰🅁🅒🄰🅁-🄼🄳",
    "𝕊𝔸ℝ𝕎𝔸ℝ-𝕄𝔻",
    "𝑺𝑨𝑹𝑾𝑨𝑹-𝑴𝑫",
    "ⓈⒶⓇⓌⒶⓇ-ⓂⒹ",
    "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
    "ＳＡＲＷＡＲ-ＭＤ",
    "𝚂𝙰𝚁𝚆𝙰𝚁-𝙼𝙳"
];

const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
const textEmojis     = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

function fancyBotName() {
    return botNameStyles[Math.floor(Math.random() * botNameStyles.length)];
}

function pickEmoji(pool, exclude = null) {
    let e = pool[Math.floor(Math.random() * pool.length)];
    while (e === exclude) e = pool[Math.floor(Math.random() * pool.length)];
    return e;
}

function sarwarContext(sender) {
    return {
        mentionedJid: sender ? [sender] : [],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363407310860031@newsletter',
            newsletterName: "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
            serverMessageId: 143
        }
    };
}

// ══════════ AUTO-FORWARD STATE ══════════
let AUTO_VV_ON = false;

function getOwnerNumber() {
    try {
        const shapes = [
            config?.OWNER, config?.owner, config?.ownerNumber,
            config?.NUMBERS?.OWNER, config?.owner_number, config?.mod,
        ];
        for (const v of shapes) {
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                return String(v).replace(/[^0-9]/g, '');
            }
        }
        return '';
    } catch (e) {
        return '';
    }
}

// ══════════ HELPERS ══════════

// Extract the raw message content (handles viewOnce wrappers + normalized)
function extractViewOnceMedia(msgObj) {
    // msgObj: message.message structure
    if (!msgObj) return null;

    // 1. Wrapped viewOnce messages
    const wrappers = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
    for (const w of wrappers) {
        if (msgObj[w]) {
            const inner = msgObj[w].message || {};
            for (const t of ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']) {
                if (inner[t]) return { mtype: t, candidate: inner[t], raw: msgObj };
            }
        }
    }

    // 2. Normalized: top-level keys (Baileys-style after handler normalization)
    for (const t of ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']) {
        const c = msgObj[t];
        if (c && c.viewOnce === true) return { mtype: t, candidate: c, raw: msgObj };
    }
    return null;
}

// ══════════ COMMANDS ══════════

cmd({
    pattern: "vvon",
    alias: ["vv on", "vv-on", "autovv on", "autovvon", "vv-on"],
    react: "✅",
    desc: "Auto one-view forward system ON",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isCreator, sender, reply }) => {
    try {
        if (!isCreator) {
            return await conn.sendMessage(from, {
                text: `> *${fancyBotName()} 📛 OWNER ONLY COMMAND*`,
                contextInfo: sarwarContext(sender)
            }, { quoted: mek });
        }

        AUTO_VV_ON = true;
        const owner = getOwnerNumber();
        const ownerTag = owner ? `\n👤 *Owner Inbox:* +${owner}` : '\n⚠️ *config mein OWNER number set nahi mila!*';

        await conn.sendMessage(from, { react: { text: pickEmoji(textEmojis), key: mek.key } });
        await conn.sendMessage(from, {
            text: `> *${fancyBotName()} AUTO VV SYSTEM* ✅\n\n🟢 *ON ho gaya!*\n\n📩 *Ab se koi bhi one-view:*\n├ 🖼️ Image\n├ 🎥 Video\n└ 🎤 Voice note\n\n*Owner inbox mein auto forward hogi* ⏩${ownerTag}`,
            contextInfo: sarwarContext(sender)
        }, { quoted: mek });
    } catch (e) {
        console.error("vvon Error:", e);
        if (reply) await reply(`❌ Error: ${e.message}`);
    }
});

cmd({
    pattern: "vvoff",
    alias: ["vv off", "vv-off", "autovv off", "autovvoff"],
    react: "🛑",
    desc: "Auto one-view forward system OFF",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isCreator, sender, reply }) => {
    try {
        if (!isCreator) {
            return await conn.sendMessage(from, {
                text: `> *${fancyBotName()} 📛 OWNER ONLY COMMAND*`,
                contextInfo: sarwarContext(sender)
            }, { quoted: mek });
        }

        AUTO_VV_ON = false;
        await conn.sendMessage(from, { react: { text: pickEmoji(textEmojis), key: mek.key } });
        await conn.sendMessage(from, {
            text: `> *${fancyBotName()} AUTO VV SYSTEM* 🛑\n\n🔴 *OFF ho gaya.*\n\n*One-view forward band.*`,
            contextInfo: sarwarContext(sender)
        }, { quoted: mek });
    } catch (e) {
        console.error("vvoff Error:", e);
        if (reply) await reply(`❌ Error: ${e.message}`);
    }
});

cmd({
    pattern: "vvstatus",
    alias: ["vv status", "vv-status", "autovv", "autovvstatus", "vvstat"],
    react: "🔍",
    desc: "Auto one-view forward status",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const status = AUTO_VV_ON ? "🟢 *ON*" : "🔴 *OFF*";
        await conn.sendMessage(from, { react: { text: pickEmoji(textEmojis), key: mek.key } });
        await conn.sendMessage(from, {
            text: `> *${fancyBotName()} AUTO VV STATUS* 🔍\n\n📩 *Auto One-View Forward:* ${status}\n\n*ON karne ke liye:* \`.vvon\`\n*OFF karne ke liye:* \`.vvoff\``,
            contextInfo: sarwarContext(sender)
        }, { quoted: mek });
    } catch (e) {
        console.error("vvstatus Error:", e);
        if (reply) await reply(`❌ Error: ${e.message}`);
    }
});

// ══════════ AUTO LISTENER — REAL WORKING (anti-once.js pattern) ══════════
// Anti-once jaisa hi system — wo chalta hai, ye bhi chalega.
// Har message par trigger; viewOnce detect kare; owner inbox forward ⏩
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
},
async (client, message, match, { from, body, isCreator, sender }) => {
    try {
        if (!AUTO_VV_ON) return;

        const ownerNum = getOwnerNumber();
        if (!ownerNum) return;
        const ownerJid = ownerNum + "@s.whatsapp.net";

        // Apne inbox par khud forward nahi hoga (loop prevention)
        if (from === ownerJid) return;

        // ---- Step 1: check raw message for viewOnce ----
        const rawMsg = message.message || {};

        // viewOnce wrapper detection
        const wrappers = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
        let mtype = null;
        let candidate = null;

        for (const w of wrappers) {
            if (rawMsg[w] && rawMsg[w].message) {
                const inner = rawMsg[w].message;
                for (const t of ['imageMessage', 'videoMessage', 'audioMessage']) {
                    if (inner[t]) { mtype = t; candidate = inner[t]; break; }
                }
                break;
            }
        }

        // ---- Step 2: normalized mtype detection (handler may resolve it) ----
        if (!mtype) {
            const detected = message.mtype || (rawMsg ? Object.keys(rawMsg)[0] : null);
            if (detected && rawMsg[detected] && rawMsg[detected].viewOnce === true &&
                ["imageMessage", "videoMessage", "audioMessage"].includes(detected)) {
                mtype = detected;
                candidate = rawMsg[detected];
            }
        }

        if (!mtype || !candidate) return;

        // ---- Step 3: sender jid ----
        const senderJid = (message.key && message.key.participant)
            ? message.key.participant
            : (message.sender || from);
        const senderNum = String(senderJid).replace(/[^0-9]/g, '');

        // ---- Step 4: download media ----
        let buffer = null;
        try {
            if (typeof message.download === "function") {
                buffer = await message.download();
            } else {
                buffer = await client.downloadMediaMessage(message);
            }
        } catch (derr) {
            console.error("[AUTO VV] download error:", derr);
        }
        if (!buffer) return;

        // ---- Step 5: build & forward to owner inbox ----
        const timeStr = new Date().toLocaleString();
        const typeLabel = mtype === "imageMessage" ? "🖼️ IMAGE" : mtype === "videoMessage" ? "🎥 VIDEO" : "🎤 VOICE NOTE";
        const caption = `╔═══════════════════════════\n║ *${fancyBotName()} AUTO VV INBOX* ⏩\n╠═══════════════════════════\n║ 📩 *One-View Media Saved!*\n║ 👤 *Sender:* +${senderNum}\n║ ${typeLabel}\n║ 🕐 *Time:* ${timeStr}\n╚═══════════════════════════`;

        let content = {};
        if (mtype === "imageMessage") {
            content = { image: buffer, caption, mimetype: candidate.mimetype || "image/jpeg" };
        } else if (mtype === "videoMessage") {
            content = { video: buffer, caption, mimetype: candidate.mimetype || "video/mp4" };
        } else {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: candidate.ptt || true };
        }

        await client.sendMessage(ownerJid, content);
        console.log(`[AUTO VV SARWAR-MD] ✅ ${typeLabel} from +${senderNum} → owner inbox`);
    } catch (e) {
        console.error("[AUTO VV SARWAR-MD] Error:", e);
    }
});
