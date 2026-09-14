const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { cmd } = require('../command');

const OWNER_PATH = path.join(__dirname, "../lib/sudo.json");

const loadSudo = () => {
    try {
        return JSON.parse(fs.readFileSync(OWNER_PATH, "utf-8"));
    } catch {
        return [];
    }
};

const isAuthorized = (sender, isCreator) => {
    if (isCreator) return true;

    const sudoOwners = loadSudo();

    const cleanSender = sender.replace(/[^0-9]/g, '');

    return sudoOwners.some(owner =>
        owner.replace(/[^0-9]/g, '') === cleanSender
    );
};

cmd({
    pattern: "sim",
    alias: ["simdata", "database", "simdetail", "detailsim"],
    desc: "Get SIM owner details",
    category: "tools",
    react: "🔍",
    filename: __filename
}, async (sock, message, m, { q, reply, isCreator, sender }) => {

    try {

        if (!isAuthorized(sender, isCreator)) {
            return reply("*❌ Only the owner can use this command!*");
        }

        let input = q ? q.trim() : "";

        if (!input) {
            return reply("❌ Please provide a phone number!\nExample: .sim 03097020115");
        }

        let number = input.replace(/\D/g, '');

        if (number.length < 10) {
            return reply("❌ Invalid phone number format.");
        }

        await sock.sendMessage(message.chat, {
            react: { text: "⏳", key: message.key }
        });

        const api = `https://adeel-xtech-apis.vercel.app/api/sim-database?search=${encodeURIComponent(number)}`;

        const res = await axios.get(api, {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        const data = res.data;

        if (!data || !data.status || !Array.isArray(data.result) || data.result.length === 0) {
            await sock.sendMessage(message.chat, {
                react: { text: "❌", key: message.key }
            });

            return reply("❌ No records found for this number.");
        }

        const record = data.result[0];

        const responseText = `╭━━〔  *SIM DATA* 〕━━⬣

┃ *✦ ɴᴀᴍᴇ* : ${record.name || "Unknown"}
┃ *✦ ɴᴜᴍʙᴇʀ* : ${record.mobile || input}
┃ *✦ ᴄɴɪᴄ* : ${record.cnic || "Not Found"}
┃ *✦ ɴᴇᴛᴡᴏʀᴋ* : ${record.network || "Not Found"}
┃ *✦ ʟᴏᴄᴀᴛɪᴏɴ* : ${record.address || "Not Found"}

╰━━━━━━━━━━━━⬣

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        await sock.sendMessage(
            message.chat,
            { text: responseText },
            { quoted: message }
        );

        await sock.sendMessage(message.chat, {
            react: { text: "✅", key: message.key }
        });

    } catch (err) {

        console.log("Database Error:", err.message);

        await sock.sendMessage(message.chat, {
            react: { text: "❌", key: message.key }
        });

        reply("❌ API connection failed. Please try again later.");
    }
});
