// commands/viewonce.js
// SARWAR MD — View Once (Without Prefix)

const { cmd } = require("../command");
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
//  INBOX DIRECTORY
// ─────────────────────────────────────────────────────────────
const INBOX_DIR = path.join(__dirname, '../data/viewonce');
const INDEX_FILE = path.join(INBOX_DIR, 'index.json');

if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
//  SAVE VIEW ONCE TO INBOX
// ─────────────────────────────────────────────────────────────
async function saveViewOnce(conn, message, buffer, mtype, caption) {
    try {
        const sender = message.key.participant || message.key.remoteJid;
        const senderName = message.pushName || 'Unknown';
        const senderNumber = sender.split('@')[0];

        let ext = 'jpg';
        let type = 'image';
        if (mtype === 'videoMessage') { ext = 'mp4'; type = 'video'; }
        else if (mtype === 'audioMessage') { ext = 'mp3'; type = 'audio'; }

        const timestamp = Date.now();
        const filename = `${senderNumber}_${timestamp}.${ext}`;
        const filepath = path.join(INBOX_DIR, filename);

        fs.writeFileSync(filepath, buffer);

        let index = { messages: [] };
        if (fs.existsSync(INDEX_FILE)) {
            try {
                index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
            } catch (e) {
                index = { messages: [] };
            }
        }

        index.messages.push({
            id: timestamp,
            sender: senderNumber,
            senderName: senderName,
            type: type,
            filename: filename,
            caption: caption || '',
            timestamp: timestamp,
            date: new Date(timestamp).toLocaleString()
        });

        if (index.messages.length > 100) {
            index.messages = index.messages.slice(-100);
        }

        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

        // Send to owner
        try {
            const ownerNumber = process.env.OWNER_NUMBER || '923242895504';
            const ownerJid = `${ownerNumber}@s.whatsapp.net`;

            await conn.sendMessage(ownerJid, {
                text: `📥 *VIEW ONCE SAVED!*\n\n👤 ${senderName}\n📱 ${senderNumber}\n📂 ${type}\n🕐 ${new Date(timestamp).toLocaleString()}\n📝 ${caption || 'No caption'}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            });

            if (type === 'image') {
                await conn.sendMessage(ownerJid, { image: buffer, caption: `📸 View Once from ${senderName}` });
            } else if (type === 'video') {
                await conn.sendMessage(ownerJid, { video: buffer, caption: `🎬 View Once from ${senderName}` });
            } else if (type === 'audio') {
                await conn.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mpeg' });
            }
        } catch (e) {}

        return true;
    } catch (error) {
        console.error('❌ Save error:', error.message);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
//  DOWNLOAD HELPER
// ─────────────────────────────────────────────────────────────
async function downloadMedia(msg, type) {
    try {
        const stream = await downloadContentFromMessage(msg, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
//  DETECT VIEW ONCE
// ─────────────────────────────────────────────────────────────
function detectViewOnce(message) {
    try {
        const msg = message.message;
        if (!msg) return null;

        if (msg.viewOnceMessage) {
            const inner = msg.viewOnceMessage.message;
            if (inner.imageMessage) {
                return { msg: inner.imageMessage, type: 'image', mtype: 'imageMessage' };
            }
            if (inner.videoMessage) {
                return { msg: inner.videoMessage, type: 'video', mtype: 'videoMessage' };
            }
            if (inner.audioMessage) {
                return { msg: inner.audioMessage, type: 'audio', mtype: 'audioMessage' };
            }
        }

        if (msg.viewOnceMessageV2) {
            const inner = msg.viewOnceMessageV2.message;
            if (inner.imageMessage) {
                return { msg: inner.imageMessage, type: 'image', mtype: 'imageMessage' };
            }
            if (inner.videoMessage) {
                return { msg: inner.videoMessage, type: 'video', mtype: 'videoMessage' };
            }
            if (inner.audioMessage) {
                return { msg: inner.audioMessage, type: 'audio', mtype: 'audioMessage' };
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
//  COMMAND 1: vv - Without Prefix (Retrieve View Once)
// ─────────────────────────────────────────────────────────────
cmd({
    on: "body",
    react: "🔓",
    filename: __filename
}, async (client, message, match, { isOwner, from, reply }) => {

    try {
        const text = message.body.trim().toLowerCase();

        // Check if message is "vv" or "viewonce" or "retrieve"
        const triggers = ["vv", "viewonce", "retrieve", "getvv", "showvv"];
        
        if (!triggers.includes(text)) return;
        if (!message.quoted) {
            return await client.sendMessage(from, {
                text: `🔓 *VIEW ONCE RETRIEVER*

📌 *Reply to a view-once message and type:* vv

📝 *Example:*
• Reply to view-once image/video
• Type: vv

🔄 *Auto Save:*
• Type: autovv on  (Owner Only)
• Type: autovv off (Owner Only)

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            }, { quoted: message });
        }

        const quoted = message.quoted;

        if (!quoted.viewOnce) {
            return await client.sendMessage(from, {
                text: `❌ This is not a view-once message.`
            }, { quoted: message });
        }

        // Download
        const buffer = await quoted.download();
        if (!buffer) {
            return await client.sendMessage(from, {
                text: `❌ Failed to download.`
            }, { quoted: message });
        }

        let content = {};
        if (quoted.mtype === "imageMessage") {
            content = { image: buffer, caption: quoted.text || "📸 View Once Image", mimetype: "image/jpeg" };
        } else if (quoted.mtype === "videoMessage") {
            content = { video: buffer, caption: quoted.text || "🎬 View Once Video", mimetype: "video/mp4" };
        } else if (quoted.mtype === "audioMessage") {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: quoted.ptt || false };
        } else {
            return await client.sendMessage(from, {
                text: `❌ Only image, video, and audio are supported.`
            }, { quoted: message });
        }

        await client.sendMessage(from, content, { quoted: message });
        await client.sendMessage(from, { react: { text: '✅', key: message.key } });

        // Save to inbox if owner
        if (isOwner) {
            await saveViewOnce(client, message, buffer, quoted.mtype, quoted.text);
        }

    } catch (error) {
        console.error('❌ vv Error:', error.message);
        await client.sendMessage(from, {
            text: `❌ Error: ${error.message}`
        }, { quoted: message });
    }
});

// ─────────────────────────────────────────────────────────────
//  COMMAND 2: autovv - Without Prefix (Toggle Auto Save)
// ─────────────────────────────────────────────────────────────
cmd({
    on: "body",
    react: "📥",
    filename: __filename
}, async (client, message, match, { isOwner, from, reply }) => {

    try {
        const text = message.body.trim().toLowerCase();

        // Check for autovv commands
        if (text === 'autovv') {
            // Show status
            const status = global.autoViewOnce ? '✅ ON' : '❌ OFF';
            let count = 0;
            if (fs.existsSync(INDEX_FILE)) {
                try {
                    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
                    count = index.messages?.length || 0;
                } catch (e) {}
            }

            return await client.sendMessage(from, {
                text: `📥 *AUTO VIEW ONCE*\n\n╭━━━〔 STATUS 〕━━━╮\n│ 📊 ${status}\n│ 📦 ${count} saved\n╰━━━━━━━━━━━━━━━━╯\n\n📌 *Commands:*\n• autovv on  - Activate\n• autovv off - Deactivate\n• autovv list - Show saved\n• vv - Retrieve view-once\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            }, { quoted: message });
        }

        if (text === 'autovv on' || text === 'autovv enable') {
            if (!isOwner) {
                return await client.sendMessage(from, {
                    text: `❌ *Owner Only!*`
                }, { quoted: message });
            }
            global.autoViewOnce = true;
            console.log('✅ Auto View Once ACTIVATED');
            return await client.sendMessage(from, {
                text: `✅ *AUTO VIEW ONCE ACTIVATED!*\n\n📥 All view-once messages will be saved.\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            }, { quoted: message });
        }

        if (text === 'autovv off' || text === 'autovv disable') {
            if (!isOwner) {
                return await client.sendMessage(from, {
                    text: `❌ *Owner Only!*`
                }, { quoted: message });
            }
            global.autoViewOnce = false;
            console.log('❌ Auto View Once DEACTIVATED');
            return await client.sendMessage(from, {
                text: `❌ *AUTO VIEW ONCE DEACTIVATED!*`
            }, { quoted: message });
        }

        if (text === 'autovv list' || text === 'autovv show') {
            if (!isOwner) {
                return await client.sendMessage(from, {
                    text: `❌ *Owner Only!*`
                }, { quoted: message });
            }

            if (!fs.existsSync(INDEX_FILE)) {
                return await client.sendMessage(from, {
                    text: `📭 *No saved messages.*`
                }, { quoted: message });
            }

            let index;
            try {
                index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
            } catch (e) {
                return await client.sendMessage(from, {
                    text: `📭 *No saved messages.*`
                }, { quoted: message });
            }

            if (!index.messages || index.messages.length === 0) {
                return await client.sendMessage(from, {
                    text: `📭 *No saved messages.*`
                }, { quoted: message });
            }

            let response = `📥 *VIEW ONCE INBOX*\n\n╭━━━〔 TOTAL: ${index.messages.length} 〕━━━╮`;
            const recent = index.messages.slice(-10).reverse();

            for (const msg of recent) {
                response += `\n│ 📌 ${msg.senderName || 'Unknown'}`;
                response += `\n│ 📱 ${msg.sender || 'N/A'}`;
                response += `\n│ 📂 ${msg.type || 'N/A'}`;
                response += `\n│ 🕐 ${msg.date || 'N/A'}`;
                response += `\n│ ───────────────────`;
            }

            if (index.messages.length > 10) {
                response += `\n│ 📊 Showing 10 of ${index.messages.length}`;
            }

            response += `\n╰━━━━━━━━━━━━━━━━╯\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;
            return await client.sendMessage(from, { text: response }, { quoted: message });
        }

    } catch (error) {
        console.error('❌ autovv Error:', error.message);
        await client.sendMessage(from, {
            text: `❌ Error: ${error.message}`
        }, { quoted: message });
    }
});

// ─────────────────────────────────────────────────────────────
//  AUTO VIEW ONCE LISTENER
// ─────────────────────────────────────────────────────────────
async function handleViewOnceMessage(conn, message) {
    try {
        if (!global.autoViewOnce) return;

        const detected = detectViewOnce(message);
        if (!detected) return;

        console.log(`🔍 View Once detected! Type: ${detected.type}`);

        let buffer;
        try {
            buffer = await downloadMedia(detected.msg, detected.type);
        } catch (e) {
            console.log('Download failed:', e.message);
            return;
        }

        if (!buffer) return;

        await saveViewOnce(conn, message, buffer, detected.mtype, detected.msg.caption || '');

        // Send confirmation to owner
        try {
            const ownerNumber = process.env.OWNER_NUMBER || '923242895504';
            const ownerJid = `${ownerNumber}@s.whatsapp.net`;
            await conn.sendMessage(ownerJid, {
                text: `✅ *View Once Auto-Saved!*\n\n📂 Type: ${detected.type}\n👤 From: ${message.pushName || 'Unknown'}\n🕐 ${new Date().toLocaleString()}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            });
        } catch (e) {}

    } catch (error) {
        console.error('❌ Auto View Once error:', error.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports.handleViewOnceMessage = handleViewOnceMessage;
