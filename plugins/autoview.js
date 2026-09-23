const config = require('../config');
const { cmd } = require('../command');
const fs = require('fs');
const path = './autovv_status.json';

// Status load
let autoViewStatus = false;
if (fs.existsSync(path)) {
    try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        autoViewStatus = data.status === true;
    } catch (e) {
        autoViewStatus = false;
    }
}

// Helper: Owner check
function isOwner(sender) {
    if (!sender) return false;
    
    const cleanSender = sender.replace(/[^0-9]/g, '');
    
    // Config se numbers nikaalo
    const owners = [];
    
    if (config.OWNER_NUMBER) owners.push(String(config.OWNER_NUMBER).replace(/[^0-9]/g, ''));
    if (config.DEV) owners.push(String(config.DEV).replace(/[^0-9]/g, ''));
    if (config.OWNER) owners.push(String(config.OWNER).replace(/[^0-9]/g, ''));
    
    // Extra safety
    if (Array.isArray(config.owners)) {
        config.owners.forEach(n => owners.push(String(n).replace(/[^0-9]/g, '')));
    }
    
    return owners.some(owner => owner && (cleanSender === owner || cleanSender.endsWith(owner) || owner.endsWith(cleanSender)));
}

// ═══════════════════════════════════════════════════════════
//  COMMAND: .autovv on / .autovv off
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "autovv",
    alias: ["autoview", "vv", "viewonce"],
    react: "👁️",
    desc: "Auto forward view-once media to owner",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { from, sender, args, body }) => {
    try {
        if (!isOwner(sender)) {
            return await conn.sendMessage(from, {
                text: "❌ *Yeh command sirf Owner use kar sakta hai!*"
            }, { quoted: mek });
        }

        const action = (args[0] || '').toLowerCase().trim();

        if (action === "on") {
            autoViewStatus = true;
            fs.writeFileSync(path, JSON.stringify({ status: true }, null, 2));
            return await conn.sendMessage(from, {
                text: "✅ *Auto View-Once Forwarder is now ON!*\n\nAb koi bhi view-once media bhejega, wo seedha aapke inbox mein aa jayegi."
            }, { quoted: mek });
        }
        else if (action === "off") {
            autoViewStatus = false;
            fs.writeFileSync(path, JSON.stringify({ status: false }, null, 2));
            return await conn.sendMessage(from, {
                text: "❌ *Auto View-Once Forwarder is now OFF!*"
            }, { quoted: mek });
        }
        else {
            return await conn.sendMessage(from, {
                text: `*Current Status:* ${autoViewStatus ? "ON ✅" : "OFF ❌"}\n\n*Usage:*\n.autovv on\n.autovv off`
            }, { quoted: mek });
        }
    } catch (error) {
        console.error("[AutoVV Command Error]:", error);
        await conn.sendMessage(from, {
            text: `❌ *Error:* ${error.message}`
        }, { quoted: mek });
    }
});

// ═══════════════════════════════════════════════════════════
//  BACKGROUND LISTENER: View-Once Media Auto Forward
// ═══════════════════════════════════════════════════════════
cmd({
    on: "message",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup }) => {
    try {
        if (!autoViewStatus) return;
        if (!sender) return;
        if (isOwner(sender)) return; // Owner ke messages ignore

        // View-Once detect
        const msg = mek.message || m.message || {};
        const isViewOnce = !!(
            msg.viewOnceMessage ||
            msg.viewOnceMessageV2 ||
            msg.viewOnceMessageV2Extension ||
            msg.ephemeralMessage?.message?.viewOnceMessage ||
            msg.ephemeralMessage?.message?.viewOnceMessageV2
        );

        if (!isViewOnce) return;

        // Actual media message nikaalo
        let actualMsg = null;
        if (msg.viewOnceMessage?.message) actualMsg = msg.viewOnceMessage.message;
        else if (msg.viewOnceMessageV2?.message) actualMsg = msg.viewOnceMessageV2.message;
        else if (msg.viewOnceMessageV2Extension?.message) actualMsg = msg.viewOnceMessageV2Extension.message;
        else if (msg.ephemeralMessage?.message?.viewOnceMessage?.message) actualMsg = msg.ephemeralMessage.message.viewOnceMessage.message;
        else if (msg.ephemeralMessage?.message?.viewOnceMessageV2?.message) actualMsg = msg.ephemeralMessage.message.viewOnceMessageV2.message;

        if (!actualMsg) return;

        const actualType = Object.keys(actualMsg)[0];
        if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(actualType)) return;

        // Download
        let buffer;
        try {
            if (typeof m.download === 'function') {
                buffer = await m.download();
            } else if (conn.downloadMediaMessage) {
                buffer = await conn.downloadMediaMessage(mek);
            } else {
                console.log("[AutoVV] No download method found");
                return;
            }
        } catch (e) {
            console.log("[AutoVV] Download failed:", e.message);
            return;
        }

        if (!buffer || buffer.length === 0) return;

        // Owner JID banao
        const ownerNum = (config.OWNER_NUMBER || config.DEV || "").toString().replace(/[^0-9]/g, "");
        if (!ownerNum) {
            console.log("[AutoVV] OWNER_NUMBER not set in config");
            return;
        }
        const ownerJid = ownerNum + "@s.whatsapp.net";

        const senderName = m.pushName || mek.pushName || "Unknown";
        const chatInfo = isGroup ? "Group" : "Private Chat";
        const number = sender.split('@')[0];

        const caption = `⚠️ *AUTO VIEW-ONCE SAVED*\n\n👤 *Sender:* ${senderName}\n🔢 *Number:* @${number}\n📍 *Location:* ${chatInfo}\n⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n\n_Auto-forwarded by SARWAR-MD_`;

        // Forward
        if (actualType === 'imageMessage') {
            await conn.sendMessage(ownerJid, {
                image: buffer,
                caption: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Image forwarded to owner");
        }
        else if (actualType === 'videoMessage') {
            await conn.sendMessage(ownerJid, {
                video: buffer,
                caption: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Video forwarded to owner");
        }
        else if (actualType === 'audioMessage') {
            await conn.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: actualMsg.audioMessage?.mimetype || "audio/mp4",
                ptt: actualMsg.audioMessage?.ptt || true
            });
            // Audio ke sath alag text bhejo
            await conn.sendMessage(ownerJid, {
                text: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Audio forwarded to owner");
        }

    } catch (error) {
        console.error("[AutoVV Listener Error]:", error.message);
    }
});
