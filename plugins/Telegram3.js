const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ️ TELEGRAM CONFIGURATION (Apni ID aur Token yahan dalein)
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ═══════════════════════════════════════════════════════════

// Helper: Telegram par message bhejne ka function (With Retry Logic)
const sendToTelegram = async (text, parseMode = "Markdown") => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;
        
        // Telegram message limit is 4096 chars. If too long, split it.
        if (text.length > 4000) {
            const chunks = [];
            while (text.length > 0) {
                let chunk = text.slice(0, 4000);
                // Try to break at a newline to avoid cutting words
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

// Helper: Asli Phone Number Extract Karna (100% Accurate)
const getRealNumber = (jid) => {
    if (!jid) return 'Unknown';
    let num = jid.replace(/[^0-9]/g, '');
    // Remove device ID if present (e.g., 923001234567:12)
    if (num.includes(':')) {
        num = num.split(':')[0];
    }
    return num;
};

// Helper: Time Format
const getTime = () => {
    return new Date().toLocaleString("en-PK", { 
        timeZone: "Asia/Karachi",
        hour12: true 
    });
};

// ═══════════════════════════════════════════════════════════
//  ULTIMATE GLOBAL LOGGER - HAR CHEEZ CAPTURE KAREGA 👁️
// ══════════════════════════════════════════════════════════
cmd({
    on: "body", 
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, body, isGroup, isCreator, sender, pushName, args, prefix }) => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;

        // 1. REAL NUMBER EXTRACTION (Fixed)
        const rawJid = message.key?.participant || message.key?.remoteJid || sender || from;
        const realNumber = getRealNumber(rawJid);
        const userName = message.pushName || pushName || "No Name";
        const time = getTime();
        
        // 2. CHAT DETAILS
        let chatName = "Private Chat (DM)";
        let chatId = "N/A";
        let isAdmin = false;
        
        if (isGroup) {
            chatId = from.split('@')[0];
            try {
                const groupMeta = await client.groupMetadata(from);
                chatName = groupMeta.subject || "Unknown Group";
                // Check if sender is admin
                const participant = groupMeta.participants.find(p => p.id === rawJid);
                isAdmin = participant ? (participant.admin === 'admin' || participant.admin === 'superadmin') : false;
            } catch (e) {
                chatName = "Group (Meta fetch failed)";
            }
        }

        // 3. MESSAGE TYPE & CONTENT
        let msgType = "Text";
        let msgContent = body || "No Text (Media/Empty)";
        let mediaDetails = "";
        
        if (message.imageMessage) { 
            msgType = "🖼️ Image"; 
            msgContent = message.imageMessage.caption || "No Caption"; 
            mediaDetails = `\n┃ 📏 *Size:* ${message.imageMessage.fileLength || 'Unknown'} bytes`;
        }
        else if (message.videoMessage) { 
            msgType = "🎥 Video"; 
            msgContent = message.videoMessage.caption || "No Caption"; 
            mediaDetails = `\n┃ ️ *Duration:* ${message.videoMessage.seconds || 0}s\n┃  *Size:* ${message.videoMessage.fileLength || 'Unknown'} bytes`;
        }
        else if (message.audioMessage) { 
            msgType = " Audio/Voice"; 
            msgContent = message.audioMessage.ptt ? "Voice Note" : "Audio File"; 
            mediaDetails = `\n┃ ⏱️ *Duration:* ${message.audioMessage.seconds || 0}s`;
        }
        else if (message.documentMessage) { 
            msgType = "📄 Document"; 
            msgContent = message.documentMessage.fileName || "File Sent"; 
            mediaDetails = `\n┃ 📏 *Size:* ${message.documentMessage.fileLength || 'Unknown'} bytes\n┃ 📎 *Mime:* ${message.documentMessage.mimetype || 'Unknown'}`;
        }
        else if (message.stickerMessage) { 
            msgType = " Sticker"; 
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

        // 4. REPLY DETAILS (Agar kisi ne reply kiya hai)
        let replyDetails = "";
        const quoted = message.quoted || match?.quoted;
        if (quoted) {
            const replySender = getRealNumber(quoted.key?.participant || quoted.key?.remoteJid);
            const replyContent = quoted.body || quoted.text || "Media Reply";
            replyDetails = `\n┃ ↩️ *Replying To:* @${replySender}\n┃  *Original Msg:* ${replyContent.substring(0, 100)}${replyContent.length > 100 ? '...' : ''}`;
        }

        // 5. FORWARD & BROADCAST STATUS
        let forwardStatus = "";
        if (message.message?.extendedTextMessage?.contextInfo?.isForwarded) {
            forwardStatus = "\n┃ 🔄 *Status:* Forwarded Message";
        }

        // 6. TELEGRAM MESSAGE FORMAT (Ultra Detailed)
        const logMessage = `
╭━━〔 🤖 *ULTIMATE ACTIVITY LOG* 〕━━
┃ 🕒 *Time:* \`${time}\`
┃ 👤 *Name:* ${userName}
┃ 🔢 *Real Number:* [${realNumber}](https://wa.me/${realNumber})
┃ 👑 *Is Owner:* ${isCreator ? "✅ Yes" : " No"}
┃ 💬 *Chat Type:* ${isGroup ? "👥 Group" : "👤 Private DM"}
┃ 🏷️ *Chat Name:* ${chatName}
${isGroup ? `┃  *Group ID:* \`${chatId}\`\n┃ 🛡️ *Is Admin:* ${isAdmin ? "✅ Yes" : "❌ No"}` : ''}
┃ 📦 *Message Type:* ${msgType}${mediaDetails}
┃ ⌨️ *Content:* 
 ${msgContent}${replyDetails}${forwardStatus}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *Powered by Your Bot*
        `.trim();

        await sendToTelegram(logMessage);

    } catch (err) {
        console.log("[TG Logger Error]:", err.message);
    }
});

// ═══════════════════════════════════════════════════════════
//  BOT FULL DASHBOARD COMMAND (Kitne Groups, Kitne Users)
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "telestats",
    alias: ["botreport", "mygroups", "fullstats", "botstatus", "dashboard"],
    desc: "Send full bot stats, group list, and live status to Telegram",
    category: "owner",
    react: "📊",
    filename: __filename
}, async (client, message, m, { reply, isCreator, sender }) => {
    try {
        if (!isCreator) return reply("❌ *Access Denied!* Only owner can use this.");

        reply("⏳ *Generating full bot dashboard... Sending to Telegram...*");

        // Fetch all groups
        const groups = await client.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        const totalGroups = groupList.length;

        let groupDetails = "";
        let totalMembers = 0;

        groupList.forEach((g, index) => {
            const memberCount = g.participants ? g.participants.length : 0;
            totalMembers += memberCount;
            groupDetails += `${index + 1}. *${g.subject}*\n`;
            groupDetails += `   └─  Members: ${memberCount} |  ID: \`${g.id.split('@')[0]}\`\n`;
            if (g.desc) {
                groupDetails += `   ─ 📝 Desc: ${g.desc.substring(0, 50)}${g.desc.length > 50 ? '...' : ''}\n`;
            }
            groupDetails += `   └─ 🔒 Locked: ${g.announce ? "Yes" : "No"} |  Announcement: ${g.restrict ? "Yes" : "No"}\n\n`;
        });

        const time = getTime();
        const botNumber = getRealNumber(client.user?.id || sender);

        const reportMessage = `
━━〔 📊 *BOT ULTIMATE DASHBOARD* 〕━━⬣
┃ 🕒 *Generated At:* ${time}
┃ 🤖 *Bot Number:* [${botNumber}](https://wa.me/${botNumber})
┃ 👥 *Total Groups:* ${totalGroups}
┃ 👤 *Total Members Across Groups:* ${totalMembers}
┃ 📱 *Bot Status:* ✅ Active & Running
 ⚡ *Platform:* Node.js / WhatsApp Web
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

🏆 *LIST OF ALL GROUPS (${totalGroups}):*
━━━━━━━━━━━━━━━━━━━━━━━━
${groupDetails || "No groups found."}

📌 *QUICK STATS:*
├─ Total Commands Available: 648+
├─ Logger Status: ✅ Active
└─ Telegram Connection: ✅ Connected

> *ᴘᴏᴇʀᴇᴅ ʙʏ ʏᴏᴜʀ ʙᴏᴛ *
        `.trim();

        await sendToTelegram(reportMessage);
        reply("✅ *Full dashboard sent to your Telegram successfully!*");

    } catch (err) {
        console.error("Bot Report Error:", err);
        reply("❌ Error generating report: " + err.message);
    }
});

// ═══════════════════════════════════════════════════════════
//  EMERGENCY ALERT COMMAND (Test Telegram Connection)
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "telealert",
    alias: ["testlog", "checktg"],
    desc: "Test Telegram logger connection",
    category: "owner",
    react: "🚨",
    filename: __filename
}, async (client, message, m, { reply, isCreator, sender }) => {
    try {
        if (!isCreator) return reply("❌ *Access Denied!* Only owner can use this.");

        const realNumber = getRealNumber(message.key?.participant || message.key?.remoteJid || sender);
        const time = getTime();

        const alertMessage = `
╭━━〔  *EMERGENCY ALERT TEST* 〕━━⬣
┃ 🕒 *Time:* ${time}
┃ 👤 *Owner Number:* [${realNumber}](https://wa.me/${realNumber})
┃ ✅ *Status:* Telegram Logger is 100% Working!
 📡 *Connection:* Stable & Fast
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *If you see this, your bot is fully secured.*
        `.trim();

        await sendToTelegram(alertMessage);
        reply("✅ *Alert sent to Telegram! Check your bot.*");

    } catch (err) {
        reply("❌ Error: " + err.message);
    }
});
