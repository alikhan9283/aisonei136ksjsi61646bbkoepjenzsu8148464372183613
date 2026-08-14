const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  VVV AUTO ONE-VIEW INBOX FORWARD SYSTEM — REAL WORKING ⏩
//  ─────────────────────────────────────────────────────────
//  .vvv on      → har incoming one-view media AUTO owner inbox par
//  .vvv off     → band
//  .vvv status  → dekho
//  System: anti-once.js jaisa tested on:"body" listener
//  (vvv wala jo user ne confirm kiya ke kaam karta hai)
// ═══════════════════════════════════════════════════════════

let AUTO_VV_ON = false;

// ── Owner inbox jid ──
function getOwnerJid() {
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
    return "";
}

// ── Incoming message se viewOnce media extract karo ──
function extractViewOnceMedia(rawMsg) {
    if (!rawMsg) return null;

    // 1. viewOnce wrappers (imageMessage/videoMessage/audioMessage)
    const wrappers = ["viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension"];
    for (const w of wrappers) {
        if (rawMsg[w] && rawMsg[w].message) {
            const inner = rawMsg[w].message;
            for (const t of ["imageMessage", "videoMessage", "audioMessage"]) {
                if (inner[t]) return { mtype: t, candidate: inner[t] };
            }
        }
    }
    // 2. Normalized mtype with viewOnce flag
    const detected = rawMsg.mtype || Object.keys(rawMsg)[0];
    if (detected && rawMsg[detected] && rawMsg[detected].viewOnce === true &&
        ["imageMessage", "videoMessage", "audioMessage"].includes(detected)) {
        return { mtype: detected, candidate: rawMsg[detected] };
    }
    return null;
}

// ══════════ COMMANDS ══════════

cmd({
    pattern: "vvv on",
    alias: ["vvvon", "vvv-on", "autovvv on", "autovvvon"],
    react: "✅",
    desc: "Auto one-view forward system ON — owner inbox par auto forward",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, isCreator }) => {
    try {
        if (!isCreator) return;
        AUTO_VV_ON = true;

        const owner = getOwnerJid();
        const ownerTag = owner
            ? `\n👤 *Owner Inbox:* +${owner.replace("@s.whatsapp.net", "")}`
            : "\n⚠️ *config mein OWNER number set nahi mila!*";

        await client.sendMessage(from, {
            text: `> *SARWAR-MD VVV AUTO SYSTEM* ✅\n\n🟢 *ON ho gaya!*\n\n📩 *Ab se koi bhi one-view:*\n├ 🖼️ Image\n├ 🎥 Video\n└ 🎤 Voice note\n\n*Owner inbox mein auto forward hogi* ⏩${ownerTag}`
        }, { quoted: message });
    } catch (e) {
        console.error("vvv on Error:", e);
    }
});

cmd({
    pattern: "vvv off",
    alias: ["vvvoff", "vvv-off", "autovvv off", "autovvvoff"],
    react: "🛑",
    desc: "Auto one-view forward system OFF",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, isCreator }) => {
    try {
        if (!isCreator) return;
        AUTO_VV_ON = false;
        await client.sendMessage(from, {
            text: `> *SARWAR-MD VVV AUTO SYSTEM* 🛑\n\n🔴 *OFF ho gaya.*\n\n*One-view auto forward band.*`
        }, { quoted: message });
    } catch (e) {
        console.error("vvv off Error:", e);
    }
});

cmd({
    pattern: "vvv status",
    alias: ["vvvstatus", "vvv-status", "autovvv"],
    react: "🔍",
    desc: "Auto one-view forward status",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from }) => {
    try {
        const status = AUTO_VV_ON ? "🟢 *ON*" : "🔴 *OFF*";
        await client.sendMessage(from, {
            text: `> *SARWAR-MD VVV STATUS* 🔍\n\n📩 *Auto One-View Forward:* ${status}`
        }, { quoted: message });
    } catch (e) {
        console.error("vvv status Error:", e);
    }
});

// ══════════ AUTO LISTENER — REAL WORKING (on:"body" tested system) ══════════
cmd({
    pattern: "vvv auto",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        if (!AUTO_VV_ON) return;

        const ownerJid = getOwnerJid();
        if (!ownerJid) return;

        // Apne inbox par forward nahi (loop prevention)
        if (from === ownerJid) return;

        // Incoming message se viewOnce media extract
        const rawMsg = message.message || message;
        const media = extractViewOnceMedia(rawMsg);
        if (!media) return;

        // Sender number
        const senderJid = (message.key && message.key.participant)
            ? message.key.participant
            : (message.sender || from);
        const senderNum = String(senderJid).replace(/[^0-9]/g, "");

        // Media download
        let buffer = null;
        try {
            if (typeof message.download === "function") {
                buffer = await message.download();
            } else {
                buffer = await client.downloadMediaMessage(message);
            }
        } catch (derr) {
            console.error("[VVV] download error:", derr);
        }
        if (!buffer) return;

        // Build content
        const timeStr = new Date().toLocaleString();
        const typeLabel = media.mtype === "imageMessage" ? "🖼️ IMAGE" : media.mtype === "videoMessage" ? "🎥 VIDEO" : "🎤 VOICE NOTE";
        const caption = `╔═══════════════════════════\n║ *SARWAR-MD AUTO VV INBOX* ⏩\n╠═══════════════════════════\n║ 📩 *One-View Media Saved!*\n║ 👤 *Sender:* +${senderNum}\n║ ${typeLabel}\n║ 🕐 *Time:* ${timeStr}\n╚═══════════════════════════`;

        let content = {};
        if (media.mtype === "imageMessage") {
            content = { image: buffer, caption, mimetype: media.candidate.mimetype || "image/jpeg" };
        } else if (media.mtype === "videoMessage") {
            content = { video: buffer, caption, mimetype: media.candidate.mimetype || "video/mp4" };
        } else {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: media.candidate.ptt || true };
        }

        // ── OWNER INBOX PAR AUTO FORWARD ⏩ ──
        await client.sendMessage(ownerJid, content);
        console.log(`[VVV AUTO] ✅ ${typeLabel} from +${senderNum} → owner inbox`);

    } catch (e) {
        console.error("[VVV AUTO] Error:", e);
    }
});
