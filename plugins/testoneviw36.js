// commands/vv.js
// SARWAR MD — View Once Message Handler (Bug-Free)

const fs = require('fs');
const path = require('path');
const { cmd } = require("../command");
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ─────────────────────────────────────────────────────────────
//  INBOX DIRECTORY
// ─────────────────────────────────────────────────────────────
const INBOX_DIR = path.join(__dirname, '../data/viewonce');
const INDEX_FILE = path.join(INBOX_DIR, 'index.json');

// Ensure directory exists
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

        // Determine file extension
        let ext = 'jpg';
        let type = 'image';
        if (mtype === 'videoMessage') { ext = 'mp4'; type = 'video'; }
        else if (mtype === 'audioMessage') { ext = 'mp3'; type = 'audio'; }

        const timestamp = Date.now();
        const filename = `${senderNumber}_${timestamp}.${ext}`;
        const filepath = path.join(INBOX_DIR, filename);

        // Save file
        fs.writeFileSync(filepath, buffer);

        // Update index
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

        // Keep last 100
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

            // Send the file
            if (type === 'image') {
                await conn.sendMessage(ownerJid, { image: buffer, caption: `📸 View Once from ${senderName}` });
            } else if (type === 'video') {
                await conn.sendMessage(ownerJid, { video: buffer, caption: `🎬 View Once from ${senderName}` });
            } else if (type === 'audio') {
                await conn.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mpeg' });
            }
        } catch (e) {
            // Silent fail for owner notification
        }

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
//  COMMAND 1: .vv - Manual Retrieve
// ─────────────────────────────────────────────────────────────
cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve"],
    react: "🔓",
    desc: "🔓 Retrieve view-once message (Owner Only)",
    category: "owner",
    filename: __filename
}, async (conn, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) {
            return reply(`❌ *Owner Only!*`);
        }

        if (!m.quoted) {
            return reply(`🔓 *VIEW ONCE RETRIEVER*

╭━━━〔 USAGE 〕━━━╮
│ Reply to a view-once message
│ with .vv
╰━━━━━━━━━━━━━━━━╯

📝 *Example:*
• Reply to view-once image/video
• Type: .vv

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        const quoted = m.quoted;

        // Check if view-once
        if (!quoted.viewOnce) {
            return reply(`❌ Not a view-once message.`);
        }

        // Download
        const buffer = await quoted.download();
        if (!buffer) {
            return reply(`❌ Failed to download.`);
        }

        let content = {};
        let type = '';

        if (quoted.mtype === "imageMessage") {
            content = { image: buffer, caption: quoted.text || "📸 View Once Image", mimetype: "image/jpeg" };
            type = 'image';
        } else if (quoted.mtype === "videoMessage") {
            content = { video: buffer, caption: quoted.text || "🎬 View Once Video", mimetype: "video/mp4" };
            type = 'video';
        } else if (quoted.mtype === "audioMessage") {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: quoted.ptt || false };
            type = 'audio';
        } else {
            return reply(`❌ Only image, video, and audio are supported.`);
        }

        // Send
        await conn.sendMessage(from, content, { quoted: m });

        // Save to inbox
        await saveViewOnce(conn, m, buffer, quoted.mtype, quoted.text);

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('❌ vv Error:', error.message);
        reply(`❌ Error: ${error.message}`);
    }
});

// ─────────────────────────────────────────────────────────────
//  COMMAND 2: .autovv - Auto Save
// ─────────────────────────────────────────────────────────────
cmd({
    pattern: "autovv",
    alias: ["autoviewonce", "avv"],
    react: "📥",
    desc: "📥 Auto-save view-once messages",
    category: "tools",
    filename: __filename
}, async (conn, m, store, { from, isCreator, reply, args }) => {
    try {
        if (!isCreator) {
            return reply(`❌ *Owner Only!*`);
        }

        const action = args[0]?.toLowerCase() || 'status';

        if (action === 'on') {
            global.autoViewOnce = true;
            return reply(`✅ *AUTO VIEW ONCE ACTIVATED!*\n\n📥 All view-once messages will be saved.\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        if (action === 'off') {
            global.autoViewOnce = false;
            return reply(`❌ *AUTO VIEW ONCE DEACTIVATED!*`);
        }

        if (action === 'list') {
            if (!fs.existsSync(INDEX_FILE)) {
                return reply(`📭 *No saved messages.*`);
            }

            let index;
            try {
                index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
            } catch (e) {
                return reply(`📭 *No saved messages.*`);
            }

            if (!index.messages || index.messages.length === 0) {
                return reply(`📭 *No saved messages.*`);
            }

            let text = `📥 *VIEW ONCE INBOX*\n\n╭━━━〔 TOTAL: ${index.messages.length} 〕━━━╮`;
            const recent = index.messages.slice(-10).reverse();

            for (const msg of recent) {
                text += `\n│ 📌 ${msg.senderName || 'Unknown'}`;
                text += `\n│ 📱 ${msg.sender || 'N/A'}`;
                text += `\n│ 📂 ${msg.type || 'N/A'}`;
                text += `\n│ 🕐 ${msg.date || 'N/A'}`;
                text += `\n│ 📁 ${msg.filename || 'N/A'}`;
                text += `\n│ ───────────────────`;
            }

            if (index.messages.length > 10) {
                text += `\n│ 📊 Showing 10 of ${index.messages.length}`;
            }

            text += `\n╰━━━━━━━━━━━━━━━━╯\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;
            return reply(text);
        }

        // STATUS
        const status = global.autoViewOnce ? '✅ ON' : '❌ OFF';
        let count = 0;
        if (fs.existsSync(INDEX_FILE)) {
            try {
                const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
                count = index.messages?.length || 0;
            } catch (e) {}
        }

        reply(`📥 *AUTO VIEW ONCE*\n\n╭━━━〔 STATUS 〕━━━╮\n│ 📊 ${status}\n│ 📦 ${count} saved\n╰━━━━━━━━━━━━━━━━╯\n\n📌 .autovv on - Activate\n📌 .autovv off - Deactivate\n📌 .autovv list - Show saved\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);

    } catch (error) {
        console.error('❌ autovv Error:', error.message);
        reply(`❌ Error: ${error.message}`);
    }
});

// ─────────────────────────────────────────────────────────────
//  AUTO VIEW ONCE LISTENER - SAFE & CRASH-PROOF
// ─────────────────────────────────────────────────────────────
async function handleViewOnceMessage(conn, message) {
    try {
        // Safety checks
        if (!message || !message.message) return;
        if (!global.autoViewOnce) return;

        const msg = message.message;

        // Check for view-once in different formats
        let viewOnceMsg = null;
        let mtype = '';

        if (msg.viewOnceMessage?.message) {
            viewOnceMsg = msg.viewOnceMessage.message;
        } else if (msg.viewOnceMessageV2?.message) {
            viewOnceMsg = msg.viewOnceMessageV2.message;
        }

        if (!viewOnceMsg) return;

        // Check message type
        let mediaMsg = null;
        let mediaType = '';

        if (viewOnceMsg.imageMessage) {
            mediaMsg = viewOnceMsg.imageMessage;
            mediaType = 'image';
            mtype = 'imageMessage';
        } else if (viewOnceMsg.videoMessage) {
            mediaMsg = viewOnceMsg.videoMessage;
            mediaType = 'video';
            mtype = 'videoMessage';
        } else if (viewOnceMsg.audioMessage) {
            mediaMsg = viewOnceMsg.audioMessage;
            mediaType = 'audio';
            mtype = 'audioMessage';
        }

        if (!mediaMsg || !mediaType) return;

        // Download safely
        let buffer;
        try {
            const stream = await downloadContentFromMessage(mediaMsg, mediaType);
            let bufs = [];
            for await (const chunk of stream) {
                bufs.push(chunk);
            }
            buffer = Buffer.concat(bufs);
        } catch (e) {
            console.log('Download failed:', e.message);
            return;
        }

        if (!buffer) return;

        // Save
        await saveViewOnce(conn, message, buffer, mtype, mediaMsg.caption || '');

    } catch (error) {
        // Silent fail - don't crash the bot
        console.error('❌ Auto View Once error:', error.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports.handleViewOnceMessage = handleViewOnceMessage;
