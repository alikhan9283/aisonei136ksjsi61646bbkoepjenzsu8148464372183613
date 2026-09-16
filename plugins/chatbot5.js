const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = "supun-b4qb8wgwfd8o0qmzdxfo56cb";
const MODEL = "openai/gpt-5.5";

// Persistent settings file — tracks which specific chats have the
// chatbot toggled on/off, plus the two global switches (all personal
// chats / all groups).
const SETTINGS_PATH = path.join(__dirname, "..", "data", "chatbot_settings.json");
const HISTORY_PATH = path.join(__dirname, "..", "data", "chatbot_history.json");

function loadJson(filePath, fallback) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
    } catch (e) {
        console.log("[CHATBOT] failed to load", filePath, e.message);
    }
    return fallback;
}

function saveJson(filePath, data) {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("[CHATBOT] failed to save", filePath, e.message);
    }
}

function getSettings() {
    return loadJson(SETTINGS_PATH, { chats: {}, allPersonal: false, allGroups: false });
}
function saveSettings(settings) {
    saveJson(SETTINGS_PATH, settings);
}

function getHistory() {
    return loadJson(HISTORY_PATH, {});
}
function saveHistory(history) {
    saveJson(HISTORY_PATH, history);
}

function isChatbotEnabled(chatId, isGroup) {
    const settings = getSettings();
    if (settings.chats[chatId] === true) return true;
    if (settings.chats[chatId] === false) return false; // explicit per-chat override wins
    if (isGroup && settings.allGroups) return true;
    if (!isGroup && settings.allPersonal) return true;
    return false;
}

const SYSTEM_PROMPT = `You are chatting casually with a friend on WhatsApp. Reply naturally and warmly, like a real person texting — short, friendly, conversational, using casual language (match whatever language/style — Urdu, Roman Urdu, English — the person uses). Don't sound like a formal assistant. If someone greets you with Assalam-o-Alaikum, reply Walaikum Assalam naturally. If someone directly and sincerely asks whether you are an AI, a bot, or a real person, answer that question honestly — don't claim to be human. Otherwise, just chat normally without bringing up that you're an AI.`;

cmd({
    pattern: "chatbot",
    react: "🤖",
    desc: "Toggle AI chatbot auto-reply mode",
    category: "main",
    use: ".chatbot on/off [chat/group]",
    filename: __filename
}, async (client, message, match, { from, reply, q, isGroup }) => {
    try {
        const args = (q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
        const settings = getSettings();

        if (!args.length) {
            const status = isChatbotEnabled(message.chat, isGroup) ? "🟢 ON" : "🔴 OFF";
            return reply(
                `🤖 *CHATBOT STATUS*\n\n` +
                `Is chat me: ${status}\n` +
                `Sab personal chats: ${settings.allPersonal ? "🟢 ON" : "🔴 OFF"}\n` +
                `Sab groups: ${settings.allGroups ? "🟢 ON" : "🔴 OFF"}\n\n` +
                `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
            );
        }

        const action = args[0];
        const scope = args[1];

        if (action !== "on" && action !== "off") {
            return reply(`⚠️ Use: .chatbot on/off [chat/group]\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        const enable = action === "on";

        if (scope === "chat") {
            settings.allPersonal = enable;
            saveSettings(settings);
            return reply(`✅ Sab personal chats me chatbot ${enable ? "🟢 ON" : "🔴 OFF"} ho gaya.\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        if (scope === "group") {
            settings.allGroups = enable;
            saveSettings(settings);
            return reply(`✅ Sab groups me chatbot ${enable ? "🟢 ON" : "🔴 OFF"} ho gaya.\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        settings.chats[message.chat] = enable;
        saveSettings(settings);
        reply(`✅ Is chat me chatbot ${enable ? "🟢 ON" : "🔴 OFF"} ho gaya.\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    } catch (error) {
        console.error("❌ Chatbot Toggle Error:", error.message);
        reply(`❌ Error: ${error.message}`);
    }
});

// Auto-reply handler — fires on every incoming text message, checks if
// chatbot mode is enabled for that chat, and if so replies via AI.
cmd({
    on: "body",
    filename: __filename
}, async (client, message, match, { from, isGroup, body }) => {
    try {
        if (!body || body.trim().startsWith(".")) return;
        if (message.key?.fromMe) return;

        if (!isChatbotEnabled(message.chat, isGroup)) return;

        const history = getHistory();
        const chatHistory = history[message.chat] || [];
        chatHistory.push({ role: "user", content: body });
        if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 20);

        await client.sendMessage(message.chat, { react: { text: "💭", key: message.key } }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1800));

        const conversationContext = chatHistory
            .slice(-10)
            .map((m) => `${m.role === "user" ? "Friend" : "You"}: ${m.content}`)
            .join("\n");

        const fullPrompt = `${SYSTEM_PROMPT}\n\nRecent conversation:\n${conversationContext}\n\nReply to the friend's most recent message naturally, in 1-3 sentences.`;

        const apiUrl = `https://supunofc.site/api/ai/chatday/chat?prompt=${encodeURIComponent(fullPrompt)}&model=${encodeURIComponent(MODEL)}&apikey=${API_KEY}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        const aiReply = data?.result?.result;
        if (!aiReply) {
            console.log("[CHATBOT] no reply text in API response:", JSON.stringify(data));
            return;
        }

        chatHistory.push({ role: "assistant", content: aiReply });
        history[message.chat] = chatHistory;
        saveHistory(history);

        await client.sendMessage(message.chat, { text: aiReply }, { quoted: message });
    } catch (error) {
        console.error("❌ Chatbot Auto-reply Error:", error.message);
    }
});
