// commands/chatbot.js
// SARWAR MD — AI Chatbot (Natural Conversation)

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
let chatbotEnabled = false; // Default OFF
const chatHistory = new Map(); // Per-user history

// ============================================================
//  MAIN COMMAND: .chatbot on/off/status
// ============================================================
cmd({
    pattern: "chatbot",
    alias: ["chat", "aichat", "bot"],
    desc: "🤖 Enable/disable AI chatbot for auto-reply",
    react: "🤖",
    category: "utility",
    filename: __filename,
    use: ".chatbot on/off/status"
}, async (conn, message, m, { from, args, q, reply, sender }) => {
    try {
        const action = args[0]?.toLowerCase() || 'status';

        // Owner only
        const botNumber = conn.user.id.split(':')[0];
        const senderNumber = (message.key.participant || from).split('@')[0].split(':')[0];
        const isOwner = senderNumber === botNumber;

        if (!isOwner) {
            return reply(`❌ *Owner Only!*`);
        }

        if (action === 'on') {
            chatbotEnabled = true;
            global.chatbotEnabled = true;
            return reply(`✅ *CHATBOT ACTIVATED!*

╭━━━〔 STATUS 〕━━━╮
│ 🤖 Mode: AI Auto-Reply
│ 📝 Model: ${MODEL}
│ 💬 Reply Type: Natural Chat
│ ⚡ Status: Online
╰━━━━━━━━━━━━━━━━╯

📌 *Now bot will reply to all messages*
📌 *.chatbot off* to disable

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        if (action === 'off') {
            chatbotEnabled = false;
            global.chatbotEnabled = false;
            return reply(`❌ *CHATBOT DEACTIVATED!*

📴 Bot will no longer auto-reply.

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        // STATUS
        const status = chatbotEnabled ? '✅ ON' : '❌ OFF';
        let userCount = chatHistory.size;

        reply(`🤖 *CHATBOT STATUS*

╭━━━〔 DETAILS 〕━━━╮
│ 📊 Status: ${status}
│ 📝 Model: ${MODEL}
│ 👥 Active Users: ${userCount}
│ 💾 History: In-Memory
╰━━━━━━━━━━━━━━━━╯

📌 *.chatbot on* - Activate
📌 *.chatbot off* - Deactivate
📌 *.chatbot status* - This menu

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

        // Ignore status broadcasts
        if (from === 'status@broadcast') return;

        // Ignore group messages (only DM)
        if (from.endsWith('@g.us')) return;

        // Get message text
        let userText = '';
        if (message.message?.conversation) {
            userText = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            userText = message.message.extendedTextMessage.text;
        } else {
            return; // Ignore non-text
        }

        // Ignore commands (starting with .)
        const prefix = process.env.PREFIX || '.';
        if (userText.startsWith(prefix)) return;

        // Ignore empty
        if (!userText.trim()) return;

        const senderNumber = sender.split('@')[0].split(':')[0];
        const pushName = message.pushName || 'User';

        console.log(`🤖 Chatbot: ${pushName} (${senderNumber}): ${userText}`);

        // Show typing indicator
        await conn.sendPresenceUpdate('composing', from);

        // Build context with history
        const history = chatHistory.get(senderNumber) || [];
        const systemPrompt = `You are SARWAR MD, a friendly Pakistani WhatsApp assistant.

Rules:
1. Reply in the SAME language the user writes (Urdu, English, Roman Urdu, Hindi).
2. Keep replies SHORT (1-3 lines max).
3. Be friendly, helpful, and casual.
4. If user says "Assalamualaikum" or "Salam", reply "Walaikum Assalam! 🌙"
5. If user asks about owner being busy or asks to meet, say: "Owner abhi busy hain, thodi der mein reply karenge. Aap wait karein. ⏳"
6. If user says "hello", "hi", "hey", reply warmly.
7. If user says "Jani", "Bhai", reply politely.
8. Never share personal info.
9. If user asks about bot, say you are SARWAR MD bot.
10. Use emojis naturally but don't overuse.

Recent conversation:
${history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n')}`;

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

        // Clean up reply
        botReply = botReply.trim();
        if (botReply.length > 500) {
            botReply = botReply.substring(0, 500) + '...';
        }

        // Save to history
        history.push({ role: 'user', content: userText });
        history.push({ role: 'assistant', content: botReply });
        if (history.length > 20) history.splice(0, history.length - 20);
        chatHistory.set(senderNumber, history);

        // Stop typing
        await conn.sendPresenceUpdate('paused', from);

        // Send reply
        await conn.sendMessage(from, {
            text: botReply
        }, { quoted: message });

        console.log(`✅ Chatbot replied to ${pushName}`);

    } catch (error) {
        console.error("❌ Chatbot reply error:", error.message);

        // Fallback reply
        try {
            await conn.sendMessage(from, {
                text: `Owner abhi busy hain, thodi der mein reply karenge. ⏳`
            }, { quoted: message });
        } catch (e) {}
    }
});
