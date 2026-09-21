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

// Web scraping function for freshsimtracker
async function scrapeSimData(number) {
    try {
        const url = `https://freshsimtracker.com/numberDetails?number=${number}`;
        
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": "https://freshsimtracker.com/"
            }
        });

        // Parse HTML to extract data
        const html = response.data;
        
        // Extract data from HTML table
        const nameMatch = html.match(/<td[^>]*>(DIL MURAD|[^<]+)<\/td>/i);
        const cnicMatch = html.match(/(\d{13,14})/);
        const addressMatch = html.match(/JCHAT PAT SHAHEED[^<]*|DERA ALLAH YAAAR[^<]*|MURAD COLONY[^<]*/i);
        const networkMatch = html.match(/Telenor|Jazz|Zong|Ufone/i);

        if (nameMatch || cnicMatch) {
            return {
                name: nameMatch ? nameMatch[1].trim() : "Unknown",
                mobile: number,
                cnic: cnicMatch ? cnicMatch[1] : "Not Found",
                network: networkMatch ? networkMatch[0] : "Not Found",
                address: addressMatch ? addressMatch[0] : "Not Found"
            };
        }
        
        return null;
    } catch (error) {
        console.log("Scraping error:", error.message);
        return null;
    }
}

// Alternative API endpoints
async function tryAlternativeAPIs(input, isCNIC) {
    const endpoints = [
        {
            url: `https://adeel-xtech-apis.vercel.app/api/sim-database?search=${input}`,
            parse: (data) => {
                if (data?.status && Array.isArray(data.result) && data.result.length > 0) {
                    return isCNIC ? data.result : [data.result[0]];
                }
                return null;
            }
        },
        {
            url: `https://sim-api-psi.vercel.app/api/sim?number=${input}`,
            parse: (data) => {
                if (data?.success && data.data) {
                    return [data.data];
                }
                return null;
            }
        }
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await axios.get(endpoint.url, {
                timeout: 15000,
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
            });

            const parsed = endpoint.parse(res.data);
            if (parsed && parsed.length > 0) {
                return parsed;
            }
        } catch (err) {
            console.log(`API failed: ${endpoint.url}`);
            continue;
        }
    }

    return null;
}

cmd({
    pattern: "sim",
    alias: ["simdata", "database", "simdetail", "detailsim", "simowner", "sim2"],
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

        // Detect if it's CNIC (13 digits) or Phone Number (10-11 digits)
        let isCNIC = number.length === 13;
        let isPhone = number.length >= 10 && number.length <= 11;

        if (!isCNIC && !isPhone) {
            return reply("❌ Invalid format!\n\n*For Phone Number:* Use 11 digits (e.g., 03493526187)\n*For CNIC:* Use 13 digits (e.g., 5320153237435)");
        }

        await sock.sendMessage(message.chat, {
            react: { text: "", key: message.key }
        });

        let results = [];

        if (isPhone) {
            // PHONE NUMBER SEARCH
            reply("🔍 *Searching for number:* " + number);

            // Try web scraping first
            const scrapedData = await scrapeSimData(number);
            
            if (scrapedData) {
                results = [scrapedData];
            } else {
                // Try alternative APIs
                const apiResults = await tryAlternativeAPIs(number, false);
                if (apiResults) {
                    results = apiResults;
                }
            }

            if (results.length === 0) {
                await sock.sendMessage(message.chat, {
                    react: { text: "❌", key: message.key }
                });
                return reply("❌ No records found for this number.\n\n*Note:* The number might not be in the database or APIs are temporarily down.");
            }

            const record = results[0];
            const responseText = `╭━━〔  *SIM DATA* 〕━━⬣

┃ * NAME* : ${record.name || "Unknown"}
┃ *✦ NUMBER* : ${record.mobile || number}
┃ *✦ CNIC* : ${record.cnic || "Not Found"}
┃ *✦ NETWORK* : ${record.network || "Not Found"}
┃ *✦ LOCATION* : ${record.address || "Not Found"}

╰━━━━━━━━━━━━⬣

> *POWERED BY SARWAR-MD ⚡*`;

            await sock.sendMessage(
                message.chat,
                { text: responseText },
                { quoted: message }
            );

        } else if (isCNIC) {
            // CNIC SEARCH
            reply("🔍 *Searching for all numbers under CNIC:* " + number);

            // Try APIs first
            const apiResults = await tryAlternativeAPIs(number, true);
            
            if (apiResults && apiResults.length > 0) {
                results = apiResults;
            } else {
                // For CNIC, we need to search by each possible number pattern
                // Try common prefixes
                const prefixes = ['030', '031', '032', '033', '034', '035', '036', '037'];
                
                reply("📡 *Trying web search for CNIC data...*");
                
                // This is a workaround - search the website
                for (const prefix of prefixes) {
                    for (let i = 0; i < 10; i++) {
                        const testNumber = prefix + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
                        const scraped = await scrapeSimData(testNumber);
                        
                        if (scraped && scraped.cnic === number) {
                            results.push(scraped);
                        }
                    }
                }
            }

            if (results.length === 0) {
                await sock.sendMessage(message.chat, {
                    react: { text: "", key: message.key }
                });
                return reply("❌ No records found for this CNIC.\n\n*Note:* This CNIC might not be in the database or the API is temporarily down.\n\n*Alternative:* Visit https://freshsimtracker.com manually");
            }

            // Group by CNIC and show all numbers
            const cnicGroups = {};
            
            results.forEach(record => {
                const cnic = record.cnic || number;
                if (!cnicGroups[cnic]) {
                    cnicGroups[cnic] = [];
                }
                cnicGroups[cnic].push(record);
            });

            // Format response
            let finalResponse = "";
            let counter = 1;
            
            for (const [cnic, records] of Object.entries(cnicGroups)) {
                finalResponse += `╭━━〔  *CNIC DATA* 〕━━⬣\n`;
                finalResponse += `┃ * CNIC:* ${cnic}\n`;
                finalResponse += `┃ *📱 Total Numbers:* ${records.length}\n`;
                finalResponse += `╰━━━━━━━━━━━━⬣\n\n`;

                records.forEach((record, index) => {
                    finalResponse += `╭── *NUMBER ${counter}* ──⬣\n`;
                    finalResponse += `│ *✦ Name:* ${record.name || "Unknown"}\n`;
                    finalResponse += `│ *✦ Number:* ${record.mobile || "N/A"}\n`;
                    finalResponse += `│ *✦ Network:* ${record.network || "Not Found"}\n`;
                    finalResponse += `│ *✦ Address:* ${record.address || "Not Found"}\n`;
                    finalResponse += `━━━━━━━━━━━━⬣\n\n`;
                    counter++;
                });
            }

            finalResponse += `> *POWERED BY SARWAR-MD ⚡*`;

            await sock.sendMessage(
                message.chat,
                { text: finalResponse },
                { quoted: message }
            );
        }

        await sock.sendMessage(message.chat, {
            react: { text: "✅", key: message.key }
        });

    } catch (err) {
        console.log("Database Error:", err.message);

        await sock.sendMessage(message.chat, {
            react: { text: "", key: message.key }
        });

        reply("❌ API connection failed. Please try again later.\n\n*Error:* " + err.message);
    }
});
