// SARWAR-MD
// ═══════════════════════════════════════════════════════════
//  AUTO ONE-VIEW (VV) INBOX FORWARD SYSTEM
//  ─────────────────────────────────────────────────────────
//  .vv on      → ON  : koi bhi one-view img/video/voice aaye
//                  to automatically OWNER ke inbox mein forward ⏩
//  .vv off     → OFF : auto forward band
//  .vv status  → current status dekho
//  Owner only commands | Private chat + Group dono mein kaam
//  SARWAR-MD ping structure: fancy name rotation + random
//  emoji reactions + newsletter context info + quoted reply
// ═══════════════════════════════════════════════════════════
const config = require('../config');
const { cmd } = require('../command');

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

// Random reaction & text emojis (SARWAR-MD ping structure)
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

// SARWAR-MD newsletter forwarding context
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

// ══════════ AUTO-FORWARD STATE (memory) ══════════
let AUTO_VV_ON = false;

// Get owner number safely from config (various possible shapes)
function getOwnerNumber() {
    try {
        if (config && config.OWNER) return String(config.OWNER).replace(/[^0-9]/g, '');
        if (config && config.owner) return String(config.owner).replace(/[^0-9]/g, '');
        if (config && config.ownerNumber) return String(config.ownerNumber).replace(/[^0-9]/g, '');
        if (config && config.NUMBERS && config.NUMBERS.OWNER) return String(config.NUMBERS.OWNER).replace(/[^0-9]/g, '');
        if (config && config.botNumber) return String(config.botNumber).replace(/[^0-9]/g, '');
        return '';
    } catch (e) {
        return '';
    }
}

// ══════════ COMMANDS ══════════

// ---------- .vv on ----------
cmd({
    pattern: "vv on",
    alias: ["vvon", "vv-on", "autovv on", "autovvon"],
    react: "✅",
    desc: "Auto one-view forward system ON — every once-viewing media auto forwards to owner inbox",
    category: "owner",
    filename: __filename
},
async (client, message, match, { from, isCreator, sender }) => {
    const reactionEmoji = pickEmoji(reactionEmojis);
    const textEmoji = pickEmoji(textEmojis, reactionEmoji);

    try {
        if (!isCreator) {
            await client.sendMessage(from, {
                text: `> *${fancyBotName()} 📛 OWNER ONLY COMMAND* ${reactionEmoji}`,
                contextInfo: sarwarContext(sender)
            }, { quoted: message });
            return;
        }

        AUTO_VV_ON = true;

        await client.sendMessage(from, { react: { text: textEmoji, key: message.key } });

        const owner = getOwnerNumber();
        const ownerTag = owner ? `\n👤 *Owner Inbox:* +${owner}` : '';

        await client.sendMessage(from, {
            text: `> *${fancyBotName()} AUTO VV INBOX FORWARD SYSTEM* ${reactionEmoji}\n\n✅ *Status:* 🟢 *ON*\n📩 *Ab se koi bhi one-view:*\n├ 🖼️ Image\n├ 🎥 Video\n├ 🎤 Voice note\n└ 📄 Document\n\n*Auto owner inbox mein forward hoga* ⏩${ownerTag}`,
            contextInfo: sarwarContext(sender)
        }, { quoted: message });
    } catch (e) {
        console.error("vv on Error:", e);
    }
});

// ---------- .vv off ----------
cmd({
    pattern: "vv off",
    alias: ["vvoff", "vv-off", "autovv off", "autovvoff"],
    react: "🛑",
    desc: "Auto one-view forward system OFF",
    category: "owner",
    filename: __filename
},
async (client, message, match, { from, isCreator, sender }) => {
    const reactionEmoji = pickEmoji(reactionEmojis);
    const textEmoji = pickEmoji(textEmojis, reactionEmoji);

    try {
        if (!isCreator) {
            await client.sendMessage(from, {
                text: `> *${fancyBotName()} 📛 OWNER ONLY COMMAND* ${reactionEmoji}`,
                contextInfo: sarwarContext(sender)
            }, { quoted: message });
            return;
        }

        AUTO_VV_ON = false;

        await client.sendMessage(from, { react: { text: textEmoji, key: message.key } });

        await client.sendMessage(from, {
            text: `> *${fancyBotName()} AUTO VV SYSTEM* ${reactionEmoji}\n\n🔴 *Status:* OFF\n\n*One-view auto forward band ho gaya.*`,
            contextInfo: sarwarContext(sender)
        }, { quoted: message });
    } catch (e) {
        console.error("vv off Error:", e);
    }
});

// ---------- .vv status ----------
cmd({
    pattern: "vv status",
    alias: ["vvstatus", "vv-stat", "autovv", "autovvstatus"],
    react: "🔍",
    desc: "Check auto one-view forward system status",
    category: "owner",
    filename: __filename
},
async (client, message, match, { from, sender }) => {
    const reactionEmoji = pickEmoji(reactionEmojis);
    const textEmoji = pickEmoji(textEmojis, reactionEmoji);

    try {
        await client.sendMessage(from, { react: { text: textEmoji, key: message.key } });

        const status = AUTO_VV_ON ? "🟢 *ON*" : "🔴 *OFF*";

        await client.sendMessage(from, {
            text: `> *${fancyBotName()} AUTO VV STATUS* ${reactionEmoji}\n\n📩 *Auto One-View Forward:* ${status}\n\n*On hone par har one-view img/video/voice*\n*owner inbox mein auto forward hogi* ⏩`,
            contextInfo: sarwarContext(sender)
        }, { quoted: message });
    } catch (e) {
        console.error("vv status Error:", e);
    }
});

// ══════════ AUTO ONE-VIEW FORWARD LISTENER ══════════
// on: "all" — har message par trigger hota hai (command handler ke saath
// auto register hota hai). Private chat + Group dono handle hote hain.
cmd({
    on: "all",
    dontAddCommandList: true,
    filename: __filename
},
async (client, message, match, { from, body, isGroup, sender }) => {
    try {
        if (!AUTO_VV_ON) return;

        const ownerNum = getOwnerNumber();
        if (!ownerNum) return;
        const ownerJid = ownerNum + "@s.whatsapp.net";

        // Apne khud ke jid par forward nahi hoga (loop prevention)
        if (from === ownerJid) return;

        // Baileys message structure — view once detection
        const msg = message.message || message;

        const viewOnceMsg =
            msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension || null;

        let inner = null;
        let mtype = null;
        let candidate = null;

        if (viewOnceMsg) {
            inner = viewOnceMsg.message || {};
            if (inner.imageMessage) { mtype = "imageMessage"; candidate = inner.imageMessage; }
            else if (inner.videoMessage) { mtype = "videoMessage"; candidate = inner.videoMessage; }
            else if (inner.audioMessage) { mtype = "audioMessage"; candidate = inner.audioMessage; }
            else if (inner.documentMessage) { mtype = "documentMessage"; candidate = inner.documentMessage; }
        } else {
            // Normalized handler: mtype already resolved on message object
            const detected = message.mtype || message.type || (msg ? Object.keys(msg)[0] : null);
            const cand = msg ? msg[detected] : null;
            if (detected && cand && cand.viewOnce === true) {
                if (["imageMessage", "videoMessage", "audioMessage", "documentMessage"].includes(detected)) {
                    mtype = detected;
                    candidate = cand;
                }
            }
        }

        if (!mtype || !candidate) return;

        // Sirf img/video/voice forward karenge
        const supported = ["imageMessage", "videoMessage", "audioMessage"];
        if (!supported.includes(mtype)) return;

        // Sender number
        const senderJid = message.key && message.key.participant
            ? message.key.participant
            : (message.sender || from);
        const senderNum = String(senderJid).replace(/[^0-9]/g, '');

        // Media download karo (one-view media bhi download ho jata hai receive par)
        const buffer = await message.download();
        if (!buffer) return;

        const timeStr = new Date().toLocaleString();
        const typeLabel = mtype === "imageMessage" ? "🖼️ IMAGE" : mtype === "videoMessage" ? "🎥 VIDEO" : "🎤 VOICE NOTE";
        const caption = `╔═══════════════════════\n║ *${fancyBotName()} AUTO VV INBOX* ⏩\n╠═══════════════════════\n║ 📩 *One-View Media Saved!*\n║ 👤 *Sender:* +${senderNum}\n║ ${typeLabel}\n║ 🕐 *Time:* ${timeStr}\n║ 📍 *Chat:* ${isGroup ? "Group" : "Private"}\n╚═══════════════════════`;

        let content = {};
        if (mtype === "imageMessage") {
            content = { image: buffer, caption, mimetype: candidate.mimetype || "image/jpeg" };
        } else if (mtype === "videoMessage") {
            content = { video: buffer, caption, mimetype: candidate.mimetype || "video/mp4" };
        } else {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: candidate.ptt || true };
        }

        // Owner ke inbox mein forward ⏩
        await client.sendMessage(ownerJid, content);
        console.log(`[AUTO VV SARWAR-MD] ✅ ${typeLabel} from +${senderNum} forwarded to owner inbox`);
    } catch (e) {
        console.error("[AUTO VV SARWAR-MD] Error:", e);
    }
});
