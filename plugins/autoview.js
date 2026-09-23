const config = require('../config');
const { cmd } = require('../command');
const fs = require('fs');
const path = './autovv_status.json';

// Status load karna
let autoViewStatus = false;
if (fs.existsSync(path)) {
    try {
        autoViewStatus = JSON.parse(fs.readFileSync(path)).status;
    } catch (e) {
        autoViewStatus = false;
    }
}

// ═══════════════════════════════════════════════════════════
//  COMMAND: .autovv on / .autovv off
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "autovv",
    alias: ["autoview", "vv"],
    react: "👁️",
    filename: __filename
}, async (conn, mek, m, { from, sender }) => {
    try {
        // Owner check - config se owner number lena
        const ownerNumber = config.OWNER || config.owner || config.ownerNumber || config.owner_number;
        const ownerJid = ownerNumber ? ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;
        
        // Check if sender is owner
        const isOwner = sender === ownerJid || (ownerNumber && sender.includes(ownerNumber.replace(/[^0-9]/g, "")));
        
        if (!isOwner) {
            return await conn.sendMessage(from, { 
                text: "❌ *Yeh command sirf Owner use kar sakta hai!*" 
            }, { quoted: mek });
        }

        // Match extract karna (command ke baad ka text)
        const match = m.body ? m.body.split(' ').slice(1).join(' ').trim() : '';
        const action = match.toLowerCase();

        if (action === "on") {
            autoViewStatus = true;
            fs.writeFileSync(path, JSON.stringify({ status: true }));
            return await conn.sendMessage(from, { 
                text: "✅ *Auto View-Once Forwarder is now ON!*\n\nAb koi bhi view-once media bhejega, toh wo seedha aapke inbox mein aa jayegi." 
            }, { quoted: mek });
        } 
        else if (action === "off") {
            autoViewStatus = false;
            fs.writeFileSync(path, JSON.stringify({ status: false }));
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
            text: ` *Error:* ${error.message}` 
        }, { quoted: mek });
    }
});

// ═══════════════════════════════════════════════════════════
//  BACKGROUND LISTENER: View-Once Media Auto Forward
// ══════════════════════════════════════════════════════════
cmd({
    on: "message",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup }) => {
    try {
        // Agar OFF hai, toh exit
        if (!autoViewStatus) return;

        // Owner check
        const ownerNumber = config.OWNER || config.owner || config.ownerNumber || config.owner_number;
        const ownerJid = ownerNumber ? ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;
        
        if (!ownerJid) return;
        if (sender === ownerJid) return; // Khud ke messages ko ignore karo

        // View-Once Detection (SARWAR-MD Compatible)
        const isViewOnce = mek.message?.viewOnceMessage || 
                          mek.message?.viewOnceMessageV2 ||
                          mek.message?.viewOnceMessageV2Extension ||
                          m.message?.viewOnceMessage ||
                          m.message?.viewOnceMessageV2;

        if (!isViewOnce) return;

        // Media Download
        let buffer;
        try {
            buffer = await m.download();
        } catch (e) {
            console.log("[AutoVV] Download failed:", e.message);
            return;
        }
        
        if (!buffer || buffer.length === 0) return;

        // Media Type Check
        const messageType = Object.keys(mek.message || {})[0];
        const isImage = messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2';
        const isVideo = messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2';
        
        // View-once ke andar actual message type check karna
        let actualType = '';
        let actualMessage = null;
        
        if (mek.message?.viewOnceMessage?.message) {
            actualMessage = mek.message.viewOnceMessage.message;
            actualType = Object.keys(actualMessage)[0];
        } else if (mek.message?.viewOnceMessageV2?.message) {
            actualMessage = mek.message.viewOnceMessageV2.message;
            actualType = Object.keys(actualMessage)[0];
        } else if (m.message?.viewOnceMessage?.message) {
            actualMessage = m.message.viewOnceMessage.message;
            actualType = Object.keys(actualMessage)[0];
        }

        const senderName = m.pushName || mek.pushName || "Unknown";
        const chatInfo = isGroup ? "Group" : "Private Chat";
        
        const caption = `⚠️ *AUTO VIEW-ONCE SAVED* ️\n\n👤 *Sender:* ${senderName}\n🔢 *Number:* ${sender ? '@' + sender.split('@')[0] : 'Unknown'}\n📍 *Location:* ${chatInfo}\n⏰ *Time:* ${new Date().toLocaleString()}\n\n_Auto-forwarded by SARWAR-MD_`;

        // Owner ko forward karna based on actual media type
        if (actualType === 'imageMessage') {
            await conn.sendMessage(ownerJid, { 
                image: buffer, 
                caption: caption 
            });
            console.log("[AutoVV] ✅ Image forwarded to owner");
        } 
        else if (actualType === 'videoMessage') {
            await conn.sendMessage(ownerJid, { 
                video: buffer, 
                caption: caption 
            });
            console.log("[AutoVV] ✅ Video forwarded to owner");
        } 
        else if (actualType === 'audioMessage') {
            await conn.sendMessage(ownerJid, { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: true
            });
            console.log("[AutoVV] ✅ Audio forwarded to owner");
        }

    } catch (error) {
        console.error("[AutoVV Listener Error]:", error.message);
    }
});
