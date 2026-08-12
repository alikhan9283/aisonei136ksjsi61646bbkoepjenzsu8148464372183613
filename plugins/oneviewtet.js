// commands/vv.js
// SARWAR MD — View Once Message Handler

const fs = require('fs');
const path = require('path');
const { cmd } = require("../command");

// ─────────────────────────────────────────────────────────────
//  VIEW ONCE SAVER - Auto Save to Inbox
// ─────────────────────────────────────────────────────────────
async function saveViewOnceToInbox(conn, message, from, buffer, mtype, caption) {
    try {
        const inboxDir = path.join(__dirname, '../data/viewonce');
        if (!fs.existsSync(inboxDir)) {
            fs.mkdirSync(inboxDir, { recursive: true });
        }

        const timestamp = Date.now();
        const sender = message.key.participant || message.key.remoteJid;
        const senderName = message.pushName || 'Unknown';
        const senderNumber = sender.split('@')[0];

        // Save file
        let ext = 'jpg';
        let type = 'image';
        if (mtype === 'videoMessage') { ext = 'mp4'; type = 'video'; }
        else if (mtype === 'audioMessage') { ext = 'mp3'; type = 'audio'; }

        const filename = `${senderNumber}_${timestamp}.${ext}`;
        const filepath = path.join(inboxDir, filename);
        fs.writeFileSync(filepath, buffer);

        // Save to JSON index
        const indexFile = path.join(inboxDir, 'index.json');
        let index = { messages: [] };
        if (fs.existsSync(indexFile)) {
            index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
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

        // Keep last 100 messages
        if (index.messages.length > 100) {
            index.messages = index.messages.slice(-100);
        }

        fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));

        // Send notification to owner
        try {
            const ownerNumber = process.env.OWNER_NUMBER || '923242895504';
            const ownerJid = `${ownerNumber}@s.whatsapp.net`;
            
            await conn.sendMessage(ownerJid, {
                text: `📥 *VIEW ONCE SAVED!*

╭━━━〔 DETAILS 〕━━━╮
│ 👤 From: ${senderName}
│ 📱 Number: ${senderNumber}
│ 📂 Type: ${type}
│ 🕐 Time: ${new Date(timestamp).toLocaleString()}
│ 📁 File: ${filename}
╰━━━━━━━━━━━━━━━━╯

📝 Caption: ${caption || 'No caption'}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            });

            // Send the actual file
            if (type === 'image') {
                await conn.sendMessage(ownerJid, {
                    image: buffer,
                    caption: `📸 View Once Image from ${senderName}`
                });
            } else if (type === 'video') {
                await conn.sendMessage(ownerJid, {
                    video: buffer,
                    caption: `🎬 View Once Video from ${senderName}`
                });
            } else if (type === 'audio') {
                await conn.sendMessage(ownerJid, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    ptt: false
                });
            }

        } catch (e) {
            console.log('Owner notification error:', e.message);
        }

        console.log(`✅ View Once saved: ${filename} from ${senderNumber}`);

    } catch (error) {
        console.error('❌ Save View Once error:', error.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  COMMAND 1: .vv - Manual Retrieve
// ─────────────────────────────────────────────────────────────
cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve"],
    react: "🐳",
    desc: "🔓 Retrieve view-once message (Owner Only)",
    category: "owner",
    filename: __filename
}, async (conn, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply(`❌ *Owner Only!*`);

        if (!m.quoted) {
            return reply(`🔓 *VIEW ONCE RETRIEVER*

╭━━━〔 USAGE 〕━━━╮
│ Reply to a view-once message
│ with .vv
╰━━━━━━━━━━━━━━━━╯

📝 *Example:*
• Reply to view-once image
• Type: .vv

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        const quoted = m.quoted;

        // Check if view-once
        if (!quoted.viewOnce) {
            return reply(`❌ This is not a view-once message.`);
        }

        const buffer = await quoted.download();
        if (!buffer) return reply(`❌ Failed to download message.`);

        let content = {};
        let type = '';

        if (quoted.mtype === "imageMessage") {
            content = {
                image: buffer,
                caption: quoted.text || "📸 View Once Image",
                mimetype: quoted.mimetype || "image/jpeg"
            };
            type = 'Image';
        } else if (quoted.mtype === "videoMessage") {
            content = {
                video: buffer,
                caption: quoted.text || "🎬 View Once Video",
                mimetype: quoted.mimetype || "video/mp4"
            };
            type = 'Video';
        } else if (quoted.mtype === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: quoted.ptt || false
            };
            type = 'Audio';
        } else {
            return reply(`❌ Only image, video, and audio are supported.`);
        }

        await conn.sendMessage(from, content, { quoted: m });

        // Save to inbox
        await saveViewOnceToInbox(conn, m, from, buffer, quoted.mtype, quoted.text);

        await conn.sendMessage(from, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error("❌ vv Error:", error);
        reply(`❌ Error fetching view-once message: ${error.message}`);
    }
});

// ─────────────────────────────────────────────────────────────
//  COMMAND 2: .autovv - Auto Save View Once
// ─────────────────────────────────────────────────────────────
cmd({
    pattern: "autovv",
    alias: ["autoviewonce", "avv"],
    react: "📥",
    desc: "📥 Auto-save view-once messages to inbox",
    category: "tools",
    filename: __filename
}, async (conn, m, store, { from, isCreator, reply, args }) => {
    try {
        if (!isCreator) return reply(`❌ *Owner Only!*`);

        const action = args[0]?.toLowerCase() || 'status';

        if (action === 'on') {
            global.autoViewOnce = true;
            await reply(`✅ *AUTO VIEW ONCE ACTIVATED!*

╭━━━〔 STATUS 〕━━━╮
│ 📥 All view-once messages
│ will be saved to inbox
│ 🔔 You will receive copies
╰━━━━━━━━━━━━━━━━╯

📌 *Commands:*
.autovv status - Check status
.autovv off - Deactivate
.autovv list - Show saved

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
            return;
        }

        if (action === 'off') {
            global.autoViewOnce = false;
            await reply(`❌ *AUTO VIEW ONCE DEACTIVATED!*

📥 No more auto-saving.

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
            return;
        }

        if (action === 'list') {
            const inboxDir = path.join(__dirname, '../data/viewonce');
            const indexFile = path.join(inboxDir, 'index.json');

            if (!fs.existsSync(indexFile)) {
                return reply(`📭 *No saved view-once messages.*`);
            }

            const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            if (index.messages.length === 0) {
                return reply(`📭 *No saved view-once messages.*`);
            }

            let text = `📥 *VIEW ONCE INBOX*

╭━━━〔 TOTAL: ${index.messages.length} 〕━━━╮`;

            const recent = index.messages.slice(-10).reverse();
            for (const msg of recent) {
                text += `\n│
│ 📌 ${msg.senderName}
│ 📱 ${msg.sender}
│ 📂 ${msg.type}
│ 🕐 ${msg.date}
│ 📁 ${msg.filename}`;
            }

            if (index.messages.length > 10) {
                text += `\n│
│ 📊 Showing 10 of ${index.messages.length}`;
            }

            text += `\n╰━━━━━━━━━━━━━━━━╯

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

            await reply(text);
            return;
        }

        // STATUS
        const status = global.autoViewOnce ? '✅ ON' : '❌ OFF';
        const inboxDir = path.join(__dirname, '../data/viewonce');
        const indexFile = path.join(inboxDir, 'index.json');
        let count = 0;
        if (fs.existsSync(indexFile)) {
            const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            count = index.messages.length;
        }

        await reply(`📥 *AUTO VIEW ONCE*

╭━━━〔 STATUS 〕━━━╮
│ 📊 Status: ${status}
│ 📦 Saved: ${count} messages
│ 📌 Owner Only
╰━━━━━━━━━━━━━━━━╯

📌 *Commands:*
.autovv on - Activate
.autovv off - Deactivate
.autovv list - Show saved
.autovv status - This menu

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);

    } catch (error) {
        console.error("❌ AutoVV Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});

// ─────────────────────────────────────────────────────────────
//  AUTO VIEW ONCE LISTENER - Runs on every message
// ─────────────────────────────────────────────────────────────
// Add this to your index.js or main file

async function handleViewOnceMessage(conn, message) {
    try {
        if (!global.autoViewOnce) return;

        // Check if it's a view-once message
        const msg = message.message;
        if (!msg) return;

        let isViewOnce = false;
        let mtype = '';
        let buffer = null;
        let caption = '';

        // Check for view-once in different formats
        if (msg.viewOnceMessage) {
            const inner = msg.viewOnceMessage.message;
            if (inner.imageMessage) {
                isViewOnce = true;
                mtype = 'imageMessage';
                caption = inner.imageMessage.caption || '';
                buffer = await downloadMedia(inner.imageMessage, 'image');
            } else if (inner.videoMessage) {
                isViewOnce = true;
                mtype = 'videoMessage';
                caption = inner.videoMessage.caption || '';
                buffer = await downloadMedia(inner.videoMessage, 'video');
            } else if (inner.audioMessage) {
                isViewOnce = true;
                mtype = 'audioMessage';
                buffer = await downloadMedia(inner.audioMessage, 'audio');
            }
        } else if (msg.viewOnceMessageV2) {
            const inner = msg.viewOnceMessageV2.message;
            if (inner.imageMessage) {
                isViewOnce = true;
                mtype = 'imageMessage';
                caption = inner.imageMessage.caption || '';
                buffer = await downloadMedia(inner.imageMessage, 'image');
            } else if (inner.videoMessage) {
                isViewOnce = true;
                mtype = 'videoMessage';
                caption = inner.videoMessage.caption || '';
                buffer = await downloadMedia(inner.videoMessage, 'video');
            } else if (inner.audioMessage) {
                isViewOnce = true;
                mtype = 'audioMessage';
                buffer = await downloadMedia(inner.audioMessage, 'audio');
            }
        }

        if (isViewOnce && buffer) {
            const from = message.key.remoteJid;
            await saveViewOnceToInbox(conn, message, from, buffer, mtype, caption);
        }

    } catch (error) {
        console.error('❌ Auto View Once Error:', error.message);
    }
}

// Helper: Download media
async function downloadMedia(msg, type) {
    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const stream = await downloadContentFromMessage(msg, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) {
        console.error('Download error:', e.message);
        return null;
    }
}

// Export the handler for index.js
module.exports.handleViewOnceMessage = handleViewOnceMessage;
