const config = require('../config');
const { cmd } = require('../command');
const fs = require('fs');
const path = './autovv_status.json';

let autoViewStatus = false;
if (fs.existsSync(path)) {
    try {
        autoViewStatus = JSON.parse(fs.readFileSync(path)).status;
    } catch (e) {
        autoViewStatus = false;
    }
}

cmd({
    pattern: "autovv",
    alias: ["autoview", "vv"],
    react: "👁️",
    filename: __filename
}, async (conn, mek, m, { from, sender }) => {
    try {
        // Owner number config se
        const ownerNumber = config.OWNER || config.owner || config.ownerNumber || config.owner_number;
        const ownerJid = ownerNumber ? ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;
        
        // Bot ka number (khud ka number)
        const botNumber = conn.user?.id?.split(':')[0] + "@s.whatsapp.net" || config.BOT_NUMBER;
        
        // Check: Sender owner hai YA bot ka khud ka number hai
        const isOwner = sender === ownerJid || 
                       sender === botNumber || 
                       (ownerNumber && sender.includes(ownerNumber.replace(/[^0-9]/g, "")));
        
        if (!isOwner) {
            return await conn.sendMessage(from, { 
                text: "❌ *Yeh command sirf Owner use kar sakta hai!*" 
            }, { quoted: mek });
        }

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

cmd({
    on: "message",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup }) => {
    try {
        if (!autoViewStatus) return;

        const ownerNumber = config.OWNER || config.owner || config.ownerNumber || config.owner_number;
        const ownerJid = ownerNumber ? ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;
        const botNumber = conn.user?.id?.split(':')[0] + "@s.whatsapp.net";
        
        if (!ownerJid) return;
        if (sender === ownerJid || sender === botNumber) return;

        const isViewOnce = mek.message?.viewOnceMessage || 
                          mek.message?.viewOnceMessageV2 ||
                          mek.message?.viewOnceMessageV2Extension;

        if (!isViewOnce) return;

        let buffer;
        try {
            buffer = await m.download();
        } catch (e) {
            return;
        }
        
        if (!buffer || buffer.length === 0) return;

        let actualType = '';
        let actualMessage = null;
        
        if (mek.message?.viewOnceMessage?.message) {
            actualMessage = mek.message.viewOnceMessage.message;
            actualType = Object.keys(actualMessage)[0];
        } else if (mek.message?.viewOnceMessageV2?.message) {
            actualMessage = mek.message.viewOnceMessageV2.message;
            actualType = Object.keys(actualMessage)[0];
        }

        const senderName = m.pushName || "Unknown";
        const chatInfo = isGroup ? "Group" : "Private Chat";
        
        const caption = `️ *AUTO VIEW-ONCE SAVED* ️\n\n👤 *Sender:* ${senderName}\n🔢 *Number:* ${sender ? '@' + sender.split('@')[0] : 'Unknown'}\n📍 *Location:* ${chatInfo}\n⏰ *Time:* ${new Date().toLocaleString()}`;

        if (actualType === 'imageMessage') {
            await conn.sendMessage(ownerJid, { image: buffer, caption: caption });
            console.log("[AutoVV] ✅ Image forwarded");
        } 
        else if (actualType === 'videoMessage') {
            await conn.sendMessage(ownerJid, { video: buffer, caption: caption });
            console.log("[AutoVV] ✅ Video forwarded");
        } 
        else if (actualType === 'audioMessage') {
            await conn.sendMessage(ownerJid, { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: true
            });
            console.log("[AutoVV] ✅ Audio forwarded");
        }

    } catch (error) {
        console.error("[AutoVV Listener Error]:", error.message);
    }
});
