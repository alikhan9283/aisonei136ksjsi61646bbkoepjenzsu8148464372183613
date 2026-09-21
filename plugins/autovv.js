const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE → OWNER INBOX (ON = BAS START)
// ═══════════════════════════════════════════════════════════

const STATE_FILE = path.join(__dirname, "auto-vv-state.json");
let STATE = { enabled: true, owner: "" };
try { if (fs.existsSync(STATE_FILE)) STATE = Object.assign(STATE, JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))); } catch (e) {}
function saveState() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(STATE)); } catch (e) {} }

let ENGINE_MODE = "none";
const DONE = new Set();
const LOAD_TIME = Math.floor(Date.now() / 1000);

let DLM = null;
for (const p of ["@whiskeysockets/baileys", "@adiwajshing/baileys", "baileys"]) {
    try { const b = require(p); if (b && b.downloadMediaMessage) { DLM = b.downloadMediaMessage; break; } } catch (e) {}
}

function normJid(v) {
    try { const num = String(v).replace(/[^0-9]/g, ""); if (num.length >= 10) return num + "@s.whatsapp.net"; } catch (e) {}
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
        if (!STATE.enabled || !raw || !raw.key || !raw.message) return;
        const jid = raw.key.remoteJid || "";
        if (jid === "status@broadcast") return;
        const id = raw.key.id || "";
        if (!id || DONE.has(id)) return;
        const ts = Number(raw.messageTimestamp || 0);
        if (ts && ts < LOAD_TIME - 60) { DONE.add(id); return; }
        const inner = extractVO(raw.message);
        if (!inner) return;
        DONE.add(id);

        const owner = STATE.owner;
        if (!owner) return;

        let mediaType = "", caption = "", mimetype = "", ptt = false;
        if (inner.imageMessage) { mediaType = "image"; caption = inner.imageMessage.caption || ""; mimetype = inner.imageMessage.mimetype; }
        else if (inner.videoMessage) { mediaType = "video"; caption = inner.videoMessage.caption || ""; mimetype = inner.videoMessage.mimetype; }
        else if (inner.audioMessage) { mediaType = "audio"; mimetype = inner.audioMessage.mimetype; ptt = inner.audioMessage.ptt || false; }
        else return;

        const buffer = await downloadRaw(raw, client);
        const senderName = raw.pushName || (raw.key.participant || jid).split("@")[0];
        let chatName = "Private Chat";
        if (jid.endsWith("@g.us")) { try { chatName = (await client.groupMetadata(jid)).subject; } catch (e) { chatName = "Group"; } }
        const info = `🚨 *AUTO VIEW-ONCE CAPTURE* 🚨\n\n👤 *Sender:* ${senderName}\n💬 *Chat:* ${chatName}\n📝 *Caption:* ${caption || "No caption"}`;

        if (!buffer || !buffer.length) {
            await client.sendMessage(owner, { text: `⚠️ View-once (${mediaType}) download fail:\n${info}` });
            return;
        }

        let content = {};
        if (mediaType === "image") content = { image: buffer, caption: info, mimetype: mimetype || "image/jpeg" };
        else if (mediaType === "video") content = { video: buffer, caption: info, mimetype: mimetype || "video/mp4" };
        else content = { audio: buffer, mimetype: mimetype || "audio/mp4", ptt: ptt };

        await client.sendMessage(owner, content);
        console.log(`[AUTO-VV] ✅ ${mediaType} from ${senderName} → owner inbox`);
    } catch (e) { console.error("[AUTO-VV] fwd error:", e.message); }
}

function upsertFn(client) {
    return async (data) => {
        try {
            const list = data?.messages || (Array.isArray(data) ? data : [data]);
            for (const m of list) await forwardRaw(m, client);
        } catch (e) {}
    };
}

// ── ENGINE: pehle real event, warna store polling ──────────
function startEngine(client, store) {
    if (ENGINE_MODE !== "none") return ENGINE_MODE;
    try {
        const ev = client?.ev || client?.sock?.ev || client?.client?.ev || client?.socket?.ev || store?.ev || global.ev;
        if (ev && typeof ev.on === "function") {
            ev.on("messages.upsert", upsertFn(client));
            ENGINE_MODE = "event ✔";
            console.log("[AUTO-VV] engine: event hook attached");
            return ENGINE_MODE;
        }
    } catch (e) {}
    try {
        const msgs = store?.messages || store?.store?.messages || global.store?.messages;
        if (msgs) {
            setInterval(async () => {
                if (!STATE.enabled) return;
                try {
                    for (const jid of Object.keys(msgs)) {
                        if (jid === "status@broadcast") continue;
                        const db = msgs[jid];
                        let arr = Array.isArray(db?.array) ? db.array : (Array.isArray(db) ? db : null);
                        if (!arr) continue;
                        for (const raw of arr.slice(-8)) await forwardRaw(raw, client);
                    }
                } catch (e) {}
            }, 4000);
            ENGINE_MODE = "poll ✔";
            console.log("[AUTO-VV] engine: store polling");
            return ENGINE_MODE;
        }
    } catch (e) {}
    return "none";
}

// Globals milte hi khud start ho jane ki koshish
try {
    const boot = setInterval(() => {
        const c = global.client || global.conn || global.sock || global.bot;
        if (c && startEngine(c, global.store) !== "none") clearInterval(boot);
    }, 5000);
    setTimeout(() => clearInterval(boot), 10 * 60 * 1000);
    console.log("[AUTO-VV] plugin loaded ✔");
} catch (e) {}

// ── COMMAND ───────────────────────────────────────────────
cmd({
    pattern: "autovv",
    alias: ["autoview", "avv"],
    desc: "Auto view-once forwarder - on/off/set/test",
    category: "owner",
    filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("❌ Owner only command!");
        if (ENGINE_MODE === "none") startEngine(client, store);

        const args = (m.body || m.text || "").trim().split(/\s+/);
        const act = (args[1] || "").toLowerCase();

        if (act === "set") {
            const jid = normJid(args[2] || "");
            if (!jid) return reply("❌ Number theek likhein: .autovv set 92300xxxxxxx");
            STATE.owner = jid; saveState();
            return reply(`✅ Owner inbox set: ${jid.split("@")[0]}`);
        }
        if (act === "off") {
            STATE.enabled = false; saveState();
            return reply("⏸️ *AUTO VIEW-ONCE: OFF*");
        }
        if (act === "on") {
            STATE.enabled = true;
            if (!STATE.owner) STATE.owner = (m.sender || "").includes("@") ? m.sender : normJid(m.sender || "");
            saveState();
            if (ENGINE_MODE === "none") startEngine(client, store);
            return reply(`▶️ *AUTO VIEW-ONCE ON — SYSTEM START!*\n\n• Engine: ${ENGINE_MODE === "none" ? "❌ start nahi hua" : ENGINE_MODE}\n• Owner inbox: ${STATE.owner ? STATE.owner.split("@")[0] : "❌ NOT SET → .autovv set 923xxx"}\n\nAb har view-once photo/video/voice (group ya private) silent owner inbox mein forward hogi.`);
        }
        if (act === "test") {
            if (!STATE.owner) return reply("❌ Pehle .autovv on karein");
            await client.sendMessage(STATE.owner, { text: "✅ AUTO-VV TEST OK — inbox working!" });
            return reply("📩 Test message inbox par bhej diya.");
        }

        return reply(`🤖 *AUTO VIEW-ONCE STATUS*\n\n• System: ${STATE.enabled ? "ON ▶️" : "OFF ⏸️"}\n• Engine: ${ENGINE_MODE === "none" ? "not started ❌" : ENGINE_MODE}\n• Owner inbox: ${STATE.owner ? STATE.owner.split("@")[0] : "NOT SET ❌"}\n\n.autovv on | off | set 923xxx | test`);
    } catch (err) {
        console.error("AUTO-VV:", err);
        try { reply("❌ " + err.message); } catch (e) {}
    }
});
