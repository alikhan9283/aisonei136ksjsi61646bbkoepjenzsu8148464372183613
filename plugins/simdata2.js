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
    pattern: "sim2",
    alias: ["simdata2", "database", "simdetail", "detailsim", "simowner"],
    desc: "Get SIM owner details by number or CNIC",
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
            return reply("❌ Please provide a phone number or CNIC!\n\n*Examples:*\n.sim 03493526187 (Phone Number)\n.sim 5320153237435 (CNIC)");
        }

        // Remove all non-digit characters
        let number = input.replace(/\D/g, '');

        // Detect if it's CNIC (13 digits) or Phone Number (11 digits)
        let isCNIC = number.length === 13;
        let isPhone = number.length >= 10 && number.length <= 11;

        if (!isCNIC && !isPhone) {
            return reply("❌ Invalid format!\n\n*For Phone Number:* Use 11 digits (e.g., 03493526187)\n*For CNIC:* Use 13 digits (e.g., 5320153237435)");
        }

        await sock.sendMessage(message.chat, {
            react: { text: "⏳", key: message.key }
        });

        let finalResponse = "";

        if (isCNIC) {
            // CNIC SEARCH - Get all numbers under this CNIC
            reply(" *Searching for all numbers registered under CNIC:* " + number);

            // Try multiple API sources
            const apiSources = [
                `https://adeel-xtech-apis.vercel.app/api/sim-database?search=${number}`,
                `https://sim-api-rosy.vercel.app/api/sim?cnic=${number}`,
                `https://fresh-sim-api.vercel.app/api/cnic/${number}`
            ];

            let allNumbers = [];
            let cnicData = null;

            for (const apiUrl of apiSources) {
                try {
                    const res = await axios.get(apiUrl, {
                        timeout: 15000,
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            "Accept": "application/json"
                        }
                    });

                    const data = res.data;

                    if (data && data.status && Array.isArray(data.result) && data.result.length > 0) {
                        allNumbers = data.result;
                        break;
                    }

                    // Alternative response format
                    if (data && Array.isArray(data) && data.length > 0) {
                        allNumbers = data;
                        break;
                    }
                } catch (err) {
                    console.log(`API failed: ${apiUrl}`);
                    continue;
                }
            }

            if (allNumbers.length === 0) {
                await sock.sendMessage(message.chat, {
                    react: { text: "❌", key: message.key }
                });
                return reply("❌ No records found for this CNIC.\n\n*Note:* This CNIC might not be in the database or the API is temporarily down.");
            }

            // Group by CNIC and show all numbers
            const cnicGroups = {};
            
            allNumbers.forEach(record => {
                const cnic = record.cnic || number;
                if (!cnicGroups[cnic]) {
                    cnicGroups[cnic] = [];
                }
                cnicGroups[cnic].push(record);
            });

            // Format response for all numbers
            let counter = 1;
            for (const [cnic, records] of Object.entries(cnicGroups)) {
                finalResponse += `╭━━〔  *CNIC DATA* 〕━━\n`;
                finalResponse += ` *🔢 CNIC:* ${cnic}\n`;
                finalResponse += ` *📱 Total Numbers:* ${records.length}\n`;
                finalResponse += `╰━━━━━━━━━━━━⬣\n\n`;

                records.forEach((record, index) => {
                    finalResponse += `╭── *NUMBER ${index + 1}* ──⬣\n`;
                    finalResponse += `│ *✦ Name:* ${record.name || "Unknown"}\n`;
                    finalResponse += `│ *✦ Number:* ${record.mobile || "N/A"}\n`;
                    finalResponse += `│ *✦ Network:* ${record.network || "Not Found"}\n`;
                    finalResponse += `│ *✦ Address:* ${record.address || "Not Found"}\n`;
                    finalResponse += `╰━━━━━━━━━━━━⬣\n\n`;
                });
            }

            finalResponse += `> *ᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴅ ⚡*`;

        } else {
            // PHONE NUMBER SEARCH - Get details for specific number
            reply(" *Searching for number:* " + number);

            // Add leading zero if needed
            if (number.length === 10 && !number.startsWith('0')) {
                number = '0' + number;
            }

            const api = `https://adeel-xtech-apis.vercel.app/api/sim-database?search=${number}`;

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

            finalResponse = `╭━━〔  *SIM DATA* 〕━━⬣

 *✦ ɴᴀᴍᴇ* : ${record.name || "Unknown"}
 *✦ ɴᴜᴍʙᴇʀ* : ${record.mobile || number}
┃ *✦ ᴄɴɪᴄ* : ${record.cnic || "Not Found"}
┃ *✦ ɴᴇᴛᴡᴏʀᴋ* : ${record.network || "Not Found"}
 *✦ ʟᴏᴄᴀᴛɪᴏɴ* : ${record.address || "Not Found"}

╰━━━━━━━━━━━━

> *ᴘᴏᴡʀᴇᴅ ʙ sᴀʀᴡᴀ-ᴍᴅ ⚡*`;
        }

        // Send the response
        await sock.sendMessage(
            message.chat,
            { text: finalResponse },
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

        reply("❌ API connection failed. Please try again later.\n\n*Error:* " + err.message);
    }
});
