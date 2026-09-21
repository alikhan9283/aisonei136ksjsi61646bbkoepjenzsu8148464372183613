const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE SYSTEM (FULL AUTO + SILENT FORWARD)
//  Har view-once photo/video/voice → seedha OWNER inbox mein
//  Koi reply / emoji / keyword ki zaroorat nahi.
// ═══════════════════════════════════════════════════════════

let ENABLED = true;
let attached = false;
let attachMode = "none";
const DONE = new Set();

// Baileys downloader load karo (jo bhi package installed ho)
let DLM = null;
for (const p of ["@whiskeysockets/baileys", "@adiwajshing/baileys", "baileys"]) {
    try { const b = require(p); if (b && b.downloadMediaMessage) { DLM = b.downloadMediaMessage; break; } } catch (e) {}
}

// ── Owner JID ──────────────────────────────────────────────
function getOwnerJid() {
    try {
        const shapes = [
            config?.OWNER, config?.owner, config?.ownerNumber,
            config?.owner_number, config?.NUMBERS?.OWNER, config?.botNumber,
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

// ── View-once message extract karo (har structure handle) ──
function extractVO(msg) {
    if (!msg || typeof msg !== "object") return null;
    if (msg.viewOnceMessage?.message) return msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) return msg.viewOnceMessageV2.message;
    if (msg.ephemeralMessage?.message) return extractVO(msg.ephemeralMessage.message);
    if (msg.viewOnceMessage?.imageMessage || msg.viewOnceMessage?.videoMessage || msg.viewOnceMessage?.audioMessage) return msg.viewOnceMessage;
    if (msg.imageMessage?.viewOnce || msg.videoMessage?.viewOnce || msg.audioMessage?.viewOnce) return msg;
    return null;
}

// ── Media download (4 fallbacks) ───────────────────────────
async function downloadVO(rawM, client) {
    if (DLM) { try { const b = await DLM(rawM, "buffer", {}); if (b && b.length) return b; } catch (e) {} }
    if (client?.downloadMediaMessage) { try { const b = await client.downloadMediaMessage(rawM); if (b && b.length) return b; } catch (e) {} }
    if (client?.downloadMessage) { try { const b = await client.downloadMessage(rawM); if (b && b.length) return b; } catch (e) {} }
    if (typeof rawM?.download === "function") { try { const b = await rawM.download(); if (b && b.length) return b; } catch (e) {} }
    return null;
}

// ── Main forward logic ─────────────────────────────────────
async function handleViewOnce(rawM, client) {
    try {
        if (!ENABLED || !rawM || !rawM.message) return;
        const jid = rawM.key?.remoteJid || "";
        if (jid === "status@broadcast") return;
        const id = rawM.key?.id;
        if (id) { if (DONE.has(id)) return; DONE.add(id); if (DONE.size > 800) DONE.clear(); }

        const inner = extractVO(rawM.message);
        if (!inner) return;

        const ownerJid = getOwnerJid();
        if (!ownerJid) { console.error("[AUTO-VV] Owner number config mein nahi hai!"); return; }

        let mediaType = "", caption = "", mimetype = "", ptt = false;
        if (inner.imageMessage) { mediaType = "image"; caption = inner.imageMessage.caption || ""; mimetype = inner.imageMessage.mimetype; }
        else if (inner.videoMessage) { mediaType = "video"; caption = inner.videoMessage.caption || ""; mimetype = inner.videoMessage.mimetype; }
        else if (inner.audioMessage) { mediaType = "audio"; mimetype = inner.audioMessage.mimetype; ptt = inner.audioMessage.ptt || false; }
        else return;

        const buffer = await downloadVO(rawM, client);
        const senderName = rawM.pushName || (rawM.key?.participant || jid).split("@")[0];
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
        console.log(`[AUTO-VV] ${mediaType} from ${senderName} → owner inbox ✔`);
    } catch (err) {
        console.error("[AUTO-VV] handleViewOnce error:", err.message);
    }
}

// ── Raw event hook attach karo ─────────────────────────────
function upsertHandler(client) {
    return async (data) => {
        try {
            const list = data?.messages || data?.all || (Array.isArray(data) ? data : [data]);
            for (const m of list) await handleViewOnce(m, client);
        } catch (e) {}
    };
}

function tryAttach(client) {
    if (!client || attached) return attached;
    const evs = [client.ev, client.sock?.ev, client.client?.ev, client.conn?.ev, client.msock?.ev, client.waSocket?.ev, client._sock?.ev];
    for (const ev of evs) {
        if (ev && typeof ev.on === "function") {
            try { ev.on("messages.upsert", upsertHandler(client)); attached = true; attachMode = "ev.on"; return true; } catch (e) {}
        }
    }
    if (typeof client.on === "function") {
        try { client.on("messages.upsert", upsertHandler(client)); attached = true; attachMode = "client.on"; return true; } catch (e) {}
    }
    return false;
}

// Bot start hote hi global socket dhoondo
setImmediate(() => {
    const cands = [global.client, global.conn, global.sock, global.Void, global.bot];
    for (const p of ["../lib/client", "../lib/conn", "../lib/connection", "../lib/session", "../lib/auth", "../client", "../src/client"]) {
        try { const mod = require(p); cands.push(mod, mod?.client, mod?.conn, mod?.default); } catch (e) {}
    }
    for (const c of cands) { if (c && tryAttach(c)) break; }
    console.log(`[AUTO-VV] Plugin loaded | hook: ${attachMode}`);
});

// ── Catch-all hook (bootstrap + direct capture) ────────────
cmd({
    on: "body",
    dontAddCommandList: true,
    desc: "Auto view-once background catcher",
    category: "owner",
    filename: __filename
}, async (client, message, match, extra) => {
    try {
        tryAttach(client); // pehli message par hi hook laga do
        const rawM = message?.message ? message : (match?.message ? match : null);
        if (rawM) await handleViewOnce(rawM, client);
    } catch (e) {}
});

// ── Control command ────────────────────────────────────────
cmd({
    pattern: "autovv",
    alias: ["autoview", "avv"],
    dontAddCommandList: true,
    desc: "Auto view-once system control (on/off/status/test)",
    category: "owner",
    filename: __filename
}, async (client, message, match, extra) => {
    try {
        if (!extra?.isCreator) return;
        tryAttach(client);
        const q = (extra?.body || "").trim().split(/\s+/).slice(1).join(" ").toLowerCase();
        const ownerJid = getOwnerJid();

        if (q === "off") { ENABLED = false; return client.sendMessage(extra.from, { text: "⏸️ Auto view-once system OFF kar diya gaya." }, { quoted: message }); }
        if (q === "on") { ENABLED = true; return client.sendMessage(extra.from, { text: "▶️ Auto view-once system ON kar diya gaya." }, { quoted: message }); }
        if (q === "test") {
            if (!ownerJid) return client.sendMessage(extra.from, { text: "❌ Owner number config mein set nahi!" }, { quoted: message });
            await client.sendMessage(ownerJid, { text: "✅ AUTO-VV test message: owner inbox theek kaam kar raha hai!" });
            return client.sendMessage(extra.from, { text: "📩 Test message owner inbox par bhej diya gaya." }, { quoted: message });
        }

        return client.sendMessage(extra.from, {
            text: `🤖 *AUTO VIEW-ONCE STATUS*\n\n• System: ${ENABLED ? "ON ▶️" : "OFF ⏸️"}\n• Raw hook: ${attached ? "ATTACHED (" + attachMode + ") ✔" : "catch-all mode par chal raha hai"}\n• Owner inbox: ${ownerJid || "❌ NOT SET"}\n\nCommands: .autovv on | off | test`
        }, { quoted: message });
    } catch (e) {}
});
