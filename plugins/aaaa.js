// plugins/viewonce.js
// SARWAR MD — Auto View Once System (Plugins Version)

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
        let mimetype = 'image/jpeg';
        
        if (mtype === 'videoMessage') { 
            ext = 'mp4'; 
            type = 'video'; 
            mimetype = 'video/mp4';
        } else if (mtype === 'audioMessage') { 
            ext = 'mp3'; 
            type = 'audio'; 
            mimetype = 'audio/mpeg';
        }

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

        if (index.messages.length > 200) {
            index.messages = index.messages.slice(-200);
        }

        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

        // ─────────────────────────────────────────────────────────────
        //  SEND TO OWNER'S INBOX (AUTO)
        // ─────────────────────────────────────────────────────────────
        try {
            const ownerNumber = process.env.OWNER_NUMBER || '923242895504';
            const ownerJid = `${ownerNumber}@s.whatsapp.net`;

            // Send notification
            await conn.sendMessage(ownerJid, {
                text: `📥 *📩 VIEW ONCE RECEIVED!*

╭━━━〔 DETAILS 〕━━━╮
│ 👤 *From:* ${senderName}
│ 📱 *Number:* ${senderNumber}
│ 📂 *Type:* ${type.toUpperCase()}
│ 🕐 *Time:* ${new Date(timestamp).toLocaleString()}
╰━━━━━━━━━━━━━━━━╯

📝 *Caption:* ${caption || 'No caption'}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            });

            // Send the actual file
            if (type === 'image') {
                await conn.sendMessage(ownerJid, {
                    image: buffer,
                    caption: `📸 *View Once Image*\n👤 From: ${senderName}`
                });
            } else if (type === 'video') {
                await conn.sendMessage(ownerJid, {
                    video: buffer,
                    caption: `🎬 *View Once Video*\n👤 From: ${senderName}`
                });
            } else if (type === 'audio') {
                await conn.sendMessage(ownerJid, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    ptt: false
                });
                await conn.sendMessage(ownerJid, {
                    text: `🎵 *View Once Audio*\n👤 From: ${senderName}`
                });
            }

            console.log(`✅ View Once sent to owner: ${filename}`);

        } catch (e) {
            console.error('❌ Owner notification error:', e.message);
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
//  DETECT VIEW ONCE
// ─────────────────────────────────────────────────────────────
function detectViewOnce(message) {
    try {
        const msg = message.message;
        if (!msg) return null;

        if (msg.viewOnceMessage) {
            const inner = msg.viewOnceMessage.message;
            if (inner.imageMessage) return { msg: inner.imageMessage, type: 'image', mtype: 'imageMessage' };
            if (inner.videoMessage) return { msg: inner.videoMessage, type: 'video', mtype: 'videoMessage' };
            if (inner.audioMessage) return { msg: inner.audioMessage, type: 'audio', mtype: 'audioMessage' };
        }

        if (msg.viewOnceMessageV2) {
            const inner = msg.viewOnceMessageV2.message;
            if (inner.imageMessage) return { msg: inner.imageMessage, type: 'image', mtype: 'imageMessage' };
            if (inner.videoMessage) return { msg: inner.videoMessage, type: 'video', mtype: 'videoMessage' };
            if (inner.audioMessage) return { msg: inner.audioMessage, type: 'audio', mtype: 'audioMessage' };
        }

        if (msg.viewOnceMessageV2Extension) {
            const inner = msg.viewOnceMessageV2Extension.message;
            if (inner.imageMessage) return { msg: inner.imageMessage, type: 'image', mtype: 'imageMessage' };
            if (inner.videoMessage) return { msg: inner.videoMessage, type: 'video', mtype: 'videoMessage' };
            if (inner.audioMessage) return { msg: inner.audioMessage, type: 'audio', mtype: 'audioMessage' };
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
//  AUTO VIEW ONCE LISTENER - ALWAYS ACTIVE
// ─────────────────────────────────────────────────────────────
cmd({
    on: "body",
    react: "📥",
    filename: __filename
}, async (client, message, match, { isOwner, from, reply }) => {

    try {
        // Auto-detect view-once messages
        const detected = detectViewOnce(message);
        if (!detected) return;

        console.log(`🔍 View Once detected! Type: ${detected.type} from ${message.pushName || 'Unknown'}`);

        // Download
        let buffer;
        try {
            buffer = await downloadMedia(detected.msg, detected.type);
        } catch (e) {
            console.log('Download failed:', e.message);
            return;
        }

        if (!buffer) return;

        // Save to owner's inbox
        await saveViewOnce(client, message, buffer, detected.mtype, detected.msg.caption || '');

    } catch (error) {
        console.error('❌ Auto View Once error:', error.message);
    }
});

console.log('✅ View Once Plugin Loaded! Auto-save active.');
