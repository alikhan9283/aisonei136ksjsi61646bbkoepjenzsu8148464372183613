const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  VVV AUTO ONE-VIEW INBOX FORWARD SYSTEM — REAL WORKING ⏩
//  ─────────────────────────────────────────────────────────
//  .vvv on      → ON
//  .vvv off     → OFF
//  .vvv status  → status
//  Ye EXACT anti-once.js wale TESTED system par hai.
//  Structure mirror: cmd({ on: "body" }, async (client, message, match, { from, body, isCreator }))
//  Detection wahi tarike se jo framework anti-once mein karta hai:
//  - incoming media message ka mtype = message.mtype (framework resolved)
//  - viewOnce flag = message.message.<mtype>.viewOnce
// ═══════════════════════════════════════════════════════════

let AUTO_VV_ON = false;
let CACHED_OWNER = "";

// ── Owner inbox jid — AUTO DETECTION ──
function getOwnerJid(client, message, from) {
    try {
        const shapes = [
            config && config.OWNER,
            config && config.owner,
            config && config.ownerNumber,
            config && config.owner_number,
            config && config.NUMBERS && config.NUMBERS.OWNER,
            config && config.botNumber,
        ];
        for (const v of shapes) {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                const num = String(v).replace(/[^0-9]/g, "");
                if (num.length >= 10) return num + "@s.whatsapp.net";
            }
        }
    } catch (e) {}
    if (message && message.sender) {
        return String(message.sender).replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    }
    if (from) {
        return String(from).replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    }
    try {
        if (client && client.user && client.user.id) {
            const n = String(client.user.id).replace(/[^0-9]/g, "");
            if (n.length >= 10) return n + "@s.whatsapp.net";
        }
    } catch (e) {}
    return "";
}

// ── Media detection (anti-once wala exact mechanism) ──
// Framework incoming media par: message.mtype resolved hota hai
// (e.g. "imageMessage") aur message.message.imageMessage.viewOnce === true
function detectViewOnceMedia(message) {
    if (!message || !message.message) return null;

    const mtype = message.mtype || message.type;
    if (!mtype) return null;

    const mediaTypes = ["imageMessage", "videoMessage", "audioMessage", "documentWithCaptionMessage"];
    if (!mediaTypes.includes(mtype)) return null;

    const msg = message.message;
    const inner = msg[mtype] || {};

    // viewOnce flag check (framework resolved mtype wala rasta)
    if (inner.viewOnce === true) {
        return { mtype: mtype, candidate: inner };
    }

    // viewOnce wrappers (raw baileys rasta)
    const wrappers = ["viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension"];
    for (const w of wrappers) {
        if (msg[w] && msg[w].message) {
            for (const t of ["imageMessage", "videoMessage", "audioMessage"]) {
                if (msg[w].message[t]) return { mtype: t, candidate: msg[w].message[t] };
            }
        }
    }
    return null;
}

// ── Reply helper ──
async function replyText(client, from, message, text) {
    try {
        await client.sendMessage(from, { text }, { quoted: message });
    } catch (e) {
        console.error("replyText error:", e);
    }
}

// ══════════ ON/OFF/STATUS COMMANDS ══════════
cmd({
    pattern: "vvv",
    alias: ["vvvon", "vvvoff", "vvvstatus", "autovvv", "vvv-on", "vvv-off"],
    on: "body",
    dontAddCommandList: true,
    desc: "Auto one-view forward system (on / off / status)",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        const words = (body || "").replace(/vvv\s*/i, "").trim().toLowerCase();
        const action = words.split(" ")[0];

        if (["on", "chalu", "start"].includes(action)) {
            if (!isCreator) return await replyText(client, from, message, "📛 Ye command sirf owner ke liye hai!");
            AUTO_VV_ON = true;
            const ownerJid = getOwnerJid(client, message, from);
            CACHED_OWNER = ownerJid;
            const ownerNum = ownerJid ? ownerJid.replace("@s.whatsapp.net", "") : "❓";
            return await replyText(client, from, message,
                `> *SARWAR-MD VVV AUTO SYSTEM* ✅\n\n🟢 *ON ho gaya!*\n\n📩 *Ab se koi bhi one-view:*\n├ 🖼️ Image\n├ 🎥 Video\n└ 🎤 Voice note\n\n*Owner inbox par auto forward hogi* ⏩\n👤 *Owner Inbox:* +${ownerNum}`);
        }

        if (["off", "band", "stop"].includes(action)) {
            if (!isCreator) return await replyText(client, from, message, "📛 Ye command sirf owner ke liye hai!");
            AUTO_VV_ON = false;
            return await replyText(client, from, message,
                `> *SARWAR-MD VVV AUTO SYSTEM* 🛑\n\n🔴 *OFF ho gaya.*\n\n*One-view auto forward band.*`);
        }

        if (["status", "check", ""].includes(action)) {
            const status = AUTO_VV_ON ? "🟢 *ON*" : "🔴 *OFF*";
            return await replyText(client, from, message,
                `> *SARWAR-MD VVV STATUS* 🔍\n\n📩 *Auto One-View Forward:* ${status}\n\n*ON:* \`.vvv on\`\n*OFF:* \`.vvv off\``);
        }

    } catch (e) {
        console.error("VVV CMD Error:", e);
    }
});

// ══════════ AUTO LISTENER — ANTI-ONCE WALA TESTED SYSTEM ══════════
cmd({
    pattern: "vvv auto",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        if (!AUTO_VV_ON) return;

        const ownerJid = CACHED_OWNER || getOwnerJid(client, message, from);
        if (!ownerJid) return;

        // Bot ke apne chat mein forward (Message yourself wala inbox)
        let target = "";
        try {
            if (client && client.user && client.user.id) {
                const n = String(client.user.id).replace(/[^0-9]/g, "");
                if (n.length >= 10) target = n + "@s.whatsapp.net";
            }
        } catch (e) {}
        if (!target) target = ownerJid;

        // Apne chat mein aaye media ko ignore (loop prevention)
        if (from === target) return;

        // ── Media detect karo ──
        const media = detectViewOnceMedia(message);
        if (!media) return;

        // ── Media download ──
        let buffer = null;
        try {
            if (typeof message.download === "function") {
                buffer = await message.download();
            }
        } catch (derr) {
            console.error("[VVV] message.download error:", derr);
        }
        if (!buffer) {
            try {
                buffer = await client.downloadMediaMessage(message);
            } catch (derr2) {
                console.error("[VVV] downloadMediaMessage error:", derr2);
                return;
            }
        }
        if (!buffer) return;

        // ── Sender number ──
        const senderJid = (message.key && message.key.participant)
            ? message.key.participant
            : (message.sender || from);
        const senderNum = String(senderJid).replace(/[^0-9]/g, "");

        // ── Build content (anti-once wala exact format) ──
        const timeStr = new Date().toLocaleString();
        const typeLabel = media.mtype === "imageMessage" ? "🖼️ IMAGE" : media.mtype === "videoMessage" ? "🎥 VIDEO" : "🎤 VOICE NOTE";
        const caption = `╔═══════════════════════════\n║ *SARWAR-MD AUTO VV INBOX* ⏩\n╠═══════════════════════════\n║ 📩 *One-View Media Saved!*\n║ 👤 *Sender:* +${senderNum}\n║ ${typeLabel}\n║ 🕐 *Time:* ${timeStr}\n╚═══════════════════════════`;

        let content = {};
        if (media.mtype === "imageMessage") {
            content = { image: buffer, caption, mimetype: "image/jpeg" };
        } else if (media.mtype === "videoMessage") {
            content = { video: buffer, caption, mimetype: "video/mp4" };
        } else {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: media.candidate.ptt || false };
        }

        // ── OWNER INBOX PAR AUTO FORWARD ⏩ ──
        await client.sendMessage(target, content, { quoted: message });
        console.log(`[VVV AUTO] ✅ ${typeLabel} from +${senderNum} → owner inbox (${target})`);

    } catch (e) {
        console.error("[VVV AUTO] Error:", e);
    }
});
