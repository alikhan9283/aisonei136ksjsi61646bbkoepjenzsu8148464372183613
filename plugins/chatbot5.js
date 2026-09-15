// commands/chatbot.js
// SARWAR MD — AI Chatbot (No Owner Check)

const axios = require('axios');
const { cmd } = require("../command");

// ============================================================
//  CONFIG
// ============================================================
const API_KEY = "supun-b4qb8wgwfd8o0qmzdxfo56cb";
const API_URL = "https://supunofc.site/api/ai/chatday/chat";
const MODEL = "openai/gpt-5.5";

// ============================================================
//  CHATBOT STATE
// ============================================================
let chatbotEnabled = false;
const chatHistory = new Map();

// ============================================================
//  MAIN COMMAND: .chatbot on/off/status
// ============================================================
cmd({
    pattern: "chatbot",
    alias: ["chat", "aichat", "bot"],
    desc: "🤖 Enable/disable AI chatbot",
    react: "🤖",
    category: "utility",
    filename: __filename,
    use: ".chatbot on/off/status"
}, async (conn, message, m, { from, args, q, reply }) => {
    try {
        const action = args[0]?.toLowerCase() || 'status';

        // NO OWNER CHECK - ANYONE CAN USE

        if (action === 'on') {
            chatbotEnabled = true;
            global.chatbotEnabled = true;
            return reply(`✅ *CHATBOT ACTIVATED!*

╭━━━〔 STATUS 〕━━━╮
│ 🤖 Mode: AI Auto-Reply
│ 📝 Model: ${MODEL}
│ 💬 Reply: Natural Chat
│ ⚡ Status: Online
╰━━━━━━━━━━━━━━━━╯

📌 Bot will reply to ALL messages
📌 .chatbot off to disable

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        if (action === 'off') {
            chatbotEnabled = false;
            global.chatbotEnabled = false;
            return reply(`❌ *CHATBOT DEACTIVATED!*

📴 Bot will no longer auto-reply.

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        const status = chatbotEnabled ? '✅ ON' : '❌ OFF';
        reply(`🤖 *CHATBOT STATUS*

╭━━━〔 DETAILS 〕━━━╮
│ 📊 Status: ${status}
│ 📝 Model: ${MODEL}
│ 👥 Users: ${chatHistory.size}
╰━━━━━━━━━━━━━━━━╯

📌 .chatbot on - Activate
📌 .chatbot off - Deactivate
📌 .chatbot status - Menu

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);

    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});

// ============================================================
//  AUTO-REPLY LISTENER (Without Prefix)
// ============================================================
cmd({
    on: "body"
}, async (conn, message, m, { from, reply, sender }) => {
    try {
        // Check if chatbot is enabled
        if (!global.chatbotEnabled) return;

        // Ignore bot's own messages
        if (message.key.fromMe) return;

        // Ignore status
        if (from === 'status@broadcast') return;

        // Ignore groups (only DM)
        if (from.endsWith('@g.us')) return;

        // Get message text
        let userText = '';
        if (message.message?.conversation) {
            userText = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            userText = message.message.extendedTextMessage.text;
        } else {
            return;
        }

        // Ignore commands
        const prefix = process.env.PREFIX || '.';
        if (userText.startsWith(prefix)) return;
        if (!userText.trim()) return;

        const senderNumber = sender.split('@')[0].split(':')[0];
        const pushName = message.pushName || 'User';

        console.log(`🤖 ${pushName}: ${userText}`);

        // Typing indicator
        await conn.sendPresenceUpdate('composing', from);

        // Call AI API
        const response = await axios.get(API_URL, {
            params: {
                prompt: userText,
                model: MODEL,
                apikey: API_KEY
            },
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const data = response.data;
        let botReply = '';

        if (data?.success && data?.result?.result) {
            botReply = data.result.result;
        } else if (data?.result && typeof data.result === 'string') {
            botReply = data.result;
        } else {
            botReply = `Owner abhi busy hain, thodi der mein reply karenge. ⏳`;
        }

        // Clean up
        botReply = botReply.trim();
        if (botReply.length > 500) {
            botReply = botReply.substring(0, 500) + '...';
        }

        // Stop typing
        await conn.sendPresenceUpdate('paused', from);

        // Send reply
        await conn.sendMessage(from, {
            text: botReply
        }, { quoted: message });

        console.log(`✅ Replied: ${botReply.substring(0, 50)}`);

    } catch (error) {
        console.error("❌ Chatbot reply error:", error.message);

        try {
            await conn.sendMessage(from, {
                text: `Owner abhi busy hain, thodi der mein reply karenge. ⏳`
            }, { quoted: message });
        } catch (e) {}
    }
});
