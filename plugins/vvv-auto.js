const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  VVV AUTO ONE-VIEW INBOX FORWARD SYSTEM — REAL WORKING ⏩
//  ─────────────────────────────────────────────────────────
//  .vvv on      → ON
//  .vvv off     → OFF
//  .vvv status  → status
//  Ye exact vv2 wale TESTED system par hai — guaranteed work.
//  Listener cmd({ pattern: "vvv", on: "body" }) — framework
//  "vvv" word dekhte hi trigger karta hai (prefix "vvv on" space
//  wala pattern kaam nahi karta tha, isliye ye structure).
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

// ── Incoming message se viewOnce media extract ──
function extractViewOnceMedia(rawMsg) {
    if (!rawMsg) return null;

    const wrappers = ["viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension"];
    for (const w of wrappers) {
        if (rawMsg[w] && rawMsg[w].message) {
            const inner = rawMsg[w].message;
            for (const t of ["imageMessage", "videoMessage", "audioMessage"]) {
                if (inner[t]) return { mtype: t, candidate: inner[t] };
            }
        }
    }
    const detected = rawMsg.mtype || Object.keys(rawMsg)[0];
    if (detected && rawMsg[detected] && rawMsg[detected].viewOnce === true &&
        ["imageMessage", "videoMessage", "audioMessage"].includes(detected)) {
        return { mtype: detected, candidate: rawMsg[detected] };
    }
    return null;
}

// ── Owner-only reply helper ──
async function replyText(client, from, message, text) {
    try {
        await client.sendMessage(from, { text }, { quoted: message });
    } catch (e) {
        console.error("replyText error:", e);
    }
}

// ══════════ ON/OFF/STATUS COMMANDS (vv2 wala structure — kaam karta hai) ══════════
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
        // body mein "vvv" word hai — uske baad ka word command hai
        const words = (body || "").replace(/vvv\s*/i, "").trim().toLowerCase();
        const action = words.split(" ")[0];

        // ── .vvv on ──
        if (["on", "chalu", "start"].includes(action)) {
            if (!isCreator) return await replyText(client, from, message, "📛 Ye command sirf owner ke liye hai!");
            AUTO_VV_ON = true;
            const ownerNum = getOwnerJid() ? getOwnerJid().replace("@s.whatsapp.net", "") : "❓ (config mein owner number nahi mila)";
            return await replyText(client, from, message,
                `> *SARWAR-MD VVV AUTO SYSTEM* ✅\n\n🟢 *ON ho gaya!*\n\n📩 *Ab se koi bhi one-view:*\n├ 🖼️ Image\n├ 🎥 Video\n└ 🎤 Voice note\n\n*Owner inbox par auto forward hogi* ⏩\n👤 *Owner Inbox:* +${ownerNum}`);
        }

        // ── .vvv off ──
        if (["off", "band", "stop"].includes(action)) {
            if (!isCreator) return await replyText(client, from, message, "📛 Ye command sirf owner ke liye hai!");
            AUTO_VV_ON = false;
            return await replyText(client, from, message,
                `> *SARWAR-MD VVV AUTO SYSTEM* 🛑\n\n🔴 *OFF ho gaya.*\n\n*One-view auto forward band.*`);
        }

        // ── .vvv status (ya sirf .vvv) ──
        if (["status", "check", ""].includes(action)) {
            const status = AUTO_VV_ON ? "🟢 *ON*" : "🔴 *OFF*";
            return await replyText(client, from, message,
                `> *SARWAR-MD VVV STATUS* 🔍\n\n📩 *Auto One-View Forward:* ${status}\n\n*ON:* \`.vvv on\`\n*OFF:* \`.vvv off\``);
        }

        // Kuch aur likha to ignore
    } catch (e) {
        console.error("VVV CMD Error:", e);
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
