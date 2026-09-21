const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE → OWNER INBOX (ON/OFF SYSTEM)
//  Group ya private, koi bhi view-once photo/video/voice
//  → automatic owner inbox mein forward (silent)
// ═══════════════════════════════════════════════════════════

let ENABLED = true;
let ENGINE = null;      // polling engine
let BOOTSTRAP = null;   // globals dhoondhne wala retry
let STORE = null;
let CLIENT = null;
const DONE = new Set();
const LOAD_TIME = Math.floor(Date.now() / 1000);

let DLM = null;
for (const p of ["@whiskeysockets/baileys", "@adiwajshing/baileys", "baileys"]) {
    try { const b = require(p); if (b && b.downloadMediaMessage) { DLM = b.downloadMediaMessage; break; } } catch (e) {}
}

function getOwnerJid() {
    try {
        const shapes = [config?.OWNER, config?.owner, config?.ownerNumber, config?.owner_number, config?.NUMBERS?.OWNER, config?.botNumber];
        for (const v of shapes) {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                const num = String(v).replace(/[^0-9]/g, "");
                if (num.length >= 10) return num + "@s.whatsapp.net";
            }
        }
    } catch (e) {}
    return "";
}

function extractVO(msg) {
    if (!msg || typeof msg !== "object") return null;
    if (msg.viewOnceMessage?.message) return msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) return msg.viewOnceMessageV2.message;
    if (msg.ephemeralMessage?.message) return extractVO(msg.ephemeralMessage.message);
    if (msg.viewOnceMessage?.imageMessage || msg.viewOnceMessage?.videoMessage || msg.viewOnceMessage?.audioMessage) return msg.viewOnceMessage;
    if (msg.imageMessage?.viewOnce || msg.videoMessage?.viewOnce || msg.audioMessage?.viewOnce) return msg;
    return null;
}

async function downloadRaw(raw, client) {
    if (DLM) { try { const b = await DLM(raw, "buffer", {}); if (b && b.length) return b; } catch (e) {} }
    if (client?.downloadMediaMessage) { try { const b = await client.downloadMediaMessage(raw); if (b && b.length) return b; } catch (e) {} }
    if (client?.downloadMessage) { try { const b = await client.downloadMessage(raw); if (b && b.length) return b; } catch (e) {} }
    return null;
}

async function forwardRaw(raw, client) {
    try {
        if (!raw || !raw.key || !raw.message) return;
        const jid = raw.key.remoteJid || "";
        if (jid === "status@broadcast") return;
        const id = raw.key.id || "";
        if (!id || DONE.has(id)) return;
        const ts = Number(raw.messageTimestamp || 0);
        if (ts && ts < LOAD_TIME - 60) { DONE.add(id); return; } // purani history skip
        const inner = extractVO(raw.message);
        if (!inner) return;
        DONE.add(id);
        if (!ENABLED) return;

        const ownerJid = getOwnerJid();
        if (!ownerJid) { console.error("[AUTO-VV] Owner number set nahi!"); return; }

        let mediaType = "", caption = "", mimetype = "", ptt = false;
        if (inner.imageMessage) { mediaType = "image"; caption = inner.imageMessage.caption || ""; mimetype = inner.imageMessage.mimetype; }
        else if (inner.videoMessage) { mediaType = "video"; caption = inner.videoMessage.caption || ""; mimetype = inner.videoMessage.mimetype; }
        else if (inner.audioMessage) { mediaType = "audio"; mimetype = inner.audioMessage.mimetype; ptt = inner.audioMessage.ptt || false; }
        else return;

        const buffer = await downloadRaw(raw, client);
        const senderName = raw.pushName || (raw.key.participant || jid).split("@")[0];
        let chatName = "Private Chat";
        if (jid.endsWith("@g.us")) {
            try { chatName = (await client.groupMetadata(jid)).subject; } catch (e) { chatName = "Group"; }
        }
        const info = `🚨 *AUTO VIEW-ONCE CAPTURE* 🚨\n\n👤 *Sender:* ${senderName}\n💬 *Chat:* ${chatName}\n📝 *Caption:* ${caption || "No caption"}`;

        if (!buffer || !buffer.length) {
            await client.sendMessage(ownerJid, { text: `⚠️ View-once (${mediaType}) mili magar download fail:\n${info}` });
            return;
        }

        let content = {};
        if (mediaType === "image") content = { image: buffer, caption: info, mimetype: mimetype || "image/jpeg" };
        else if (mediaType === "video") content = { video: buffer, caption: info, mimetype: mimetype || "video/mp4" };
        else content = { audio: buffer, mimetype: mimetype || "audio/mp4", ptt: ptt };

        await client.sendMessage(ownerJid, content);
        console.log(`[AUTO-VV] ✅ ${mediaType} from ${senderName} → owner inbox`);
    } catch (e) {
        console.error("[AUTO-VV] fwd error:", e.message);
    }
}

// ── ENGINE: store ko poll karta hai (har 4 second) ─────────
function startEngine(client, store) {
    CLIENT = client; STORE = store;
    if (ENGINE) return true;
    if (!store || !store.messages) return false;
    ENGINE = setInterval(async () => {
        if (!ENABLED) return;
        try {
            const chats = STORE.messages || {};
            for (const jid of Object.keys(chats)) {
                if (jid === "status@broadcast") continue;
                const db = chats[jid];
                let arr = null;
                if (db && Array.isArray(db.array)) arr = db.array;
                else if (Array.isArray(db)) arr = db;
                else if (db && typeof db.toJSON === "function") { try { arr = db.toJSON(); } catch (e) {} }
                if (!arr || !arr.length) continue;
                for (const raw of arr.slice(-8)) await forwardRaw(raw, CLIENT);
            }
        } catch (e) {}
    }, 4000);
    console.log("[AUTO-VV] engine started ✔");
    return true;
}

// ── BOOTSTRAP: globals milte hi engine laga do ─────────────
function tryBootstrap() {
    if (ENGINE) return;
    const pairs = [
        [global.client, global.store], [global.conn, global.store],
        [global.sock, global.store], [global.bot, global.store],
        [global.client, global.messageStore], [global.conn, global.messageStore],
    ];
    for (const pr of pairs) {
        if (pr[0] && pr[1] && pr[1].messages && startEngine(pr[0], pr[1])) return;
    }
}

try {
    BOOTSTRAP = setInterval(tryBootstrap, 5000);
    setTimeout(() => { if (BOOTSTRAP) { clearInterval(BOOTSTRAP); BOOTSTRAP = null; } }, 10 * 60 * 1000);
    console.log("[AUTO-VV] plugin loaded ✔");
} catch (e) {}

// ── COMMAND (bilkul aapke working structure jaisi) ─────────
cmd({
    pattern: "autovv",
    alias: ["autoview", "avv", "autoviewonce"],
    desc: "Auto view-once forwarder - on/off/status/test",
    category: "owner",
    filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("❌ Owner only command!");

        // yahan se bhi engine start ho jata hai (guaranteed)
        if (!ENGINE) startEngine(client, store);
        if (BOOTSTRAP) { clearInterval(BOOTSTRAP); BOOTSTRAP = null; }

        const act = ((m.body || m.text || "").trim().split(/\s+/)[1] || "").toLowerCase();
        const ownerJid = getOwnerJid();

        if (act === "on") {
            ENABLED = true;
            return reply(`▶️ *AUTO VIEW-ONCE: ON*\n\n• Engine: ${ENGINE ? "running ✔" : "start nahi hua ❌"}\n• Owner inbox: ${ownerJid || "NOT SET ❌"}\n\nAb har view-once auto forward hogi.`);
        }
        if (act === "off") {
            ENABLED = false;
            return reply("⏸️ *AUTO VIEW-ONCE: OFF* kar diya gaya.");
        }
        if (act === "test") {
            if (!ownerJid) return reply("❌ Owner number config mein set nahi!");
            await client.sendMessage(ownerJid, { text: "✅ AUTO-VV TEST: owner inbox theek kaam kar raha hai!" });
            return reply("📩 Test message owner inbox par bhej diya gaya.");
        }

        return reply(`🤖 *AUTO VIEW-ONCE STATUS*\n\n• System: ${ENABLED ? "ON ▶️" : "OFF ⏸️"}\n• Engine: ${ENGINE ? "running ✔" : "not started ❌"}\n• Owner inbox: ${ownerJid || "NOT SET ❌"}\n\nCommands:\n.autovv on\n.autovv off\n.autovv test`);
    } catch (err) {
        console.error("AUTO-VV Error:", err);
        try { reply("❌ Error: " + err.message); } catch (e) {}
    }
});
