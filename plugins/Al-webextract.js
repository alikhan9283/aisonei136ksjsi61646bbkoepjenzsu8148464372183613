const { cmd } = require("../command");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════
//  WEBSITE & API EXTRACTOR (SARWAR-MD Compatible)
//  Kaam: Website URL do, aur bot uski hidden APIs aur endpoints nikal kar dega.
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "webextract",
    alias: ["api", "extract", "web"],
    desc: "Extract hidden APIs and endpoints from any website",
    category: "tools",
    filename: __filename
}, async (client, message, match, { from, isCreator }) => {
    try {
        if (!match) {
            return await message.reply("*Usage:* .webextract https://example.com\n*Example:* .api https://ahmad-md.vercel.app");
        }

        let url = match.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        await message.reply("🔄 *Scanning Website...*\n🔎 APIs aur Endpoints dhoond raha hoon, please wait...");

        // Website ka HTML fetch karna
        const response = await axios.get(url, { 
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            timeout: 10000 
        });
        const html = response.data;

        // APIs dhoondne ke liye Regex Patterns
        const patterns = [
            /["']\/api\/[^"']+["']/gi,
            /["']\/graphql[^"']*["']/gi,
            /fetch\s*\(\s*["']([^"']+)["']/gi,
            /axios\.(?:get|post|put|delete)\s*\(\s*["']([^"']+)["']/gi,
            /["'](https?:\/\/[^"']+\.json[^"']*)["']/gi,
            /["'](https?:\/\/[^"']+api[^"']*)["']/gi
        ];

        let foundApis = new Set();

        // HTML mein se match nikalna
        patterns.forEach(pattern => {
            let matches;
            while ((matches = pattern.exec(html)) !== null) {
                let api = matches[1] || matches[0].replace(/["']/g, "");
                // Relative URLs ko absolute banana
                if (api.startsWith("/")) {
                    const baseUrl = new URL(url);
                    api = baseUrl.origin + api;
                }
                // Fake/Example URLs ko ignore karna
                if (!api.includes("example.com") && api.length > 10) {
                    foundApis.add(api);
                }
            }
        });

        // Inline scripts se bhi check karna
        const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        scriptMatches.forEach(script => {
            patterns.forEach(pattern => {
                let matches;
                while ((matches = pattern.exec(script)) !== null) {
                    let api = matches[1] || matches[0].replace(/["']/g, "");
                    if (api.startsWith("/")) {
                        const baseUrl = new URL(url);
                        api = baseUrl.origin + api;
                    }
                    if (!api.includes("example.com") && api.length > 10) {
                        foundApis.add(api);
                    }
                }
            });
        });

        const apiList = Array.from(foundApis).slice(0, 30); // Max 30 APIs taake message limit cross na ho

        if (apiList.length === 0) {
            return await message.reply(`❌ *Koi API nahi mili!* \n\nWebsite: ${url}\nShayad yeh static website hai ya APIs client-side mein hide hain.`);
        }

        // Result Format Karna
        let resultText = `🎯 *WEBSITE API EXTRACTOR*\n`;
        resultText += `━━━━━━━━━━━━━━━━━━\n`;
        resultText += `🌐 *Target:* ${url}\n`;
        resultText += `🔍 *Found:* ${apiList.length} Endpoints\n\n`;
        resultText += ` *WORKING / HIDDEN APIs:*\n`;
        
        apiList.forEach((api, index) => {
            resultText += `${index + 1}. \`${api}\`\n`;
        });

        resultText += `\n━━━━━━━━━━━━━━━━━━\n`;
        resultText += `⚡ *POWERED BY SARWAR-MD*`;

        // Message bhejna (WhatsApp 4000 char limit ka khayal rakhte hue)
        if (resultText.length > 4000) {
            resultText = resultText.substring(0, 3900) + "\n\n... (Message limit ki wajah se baqi cut ho gaya)";
        }

        await message.reply(resultText);

    } catch (error) {
        console.error("[WebExtract] Error:", error.message);
        await message.reply(`❌ *Error:* Website access nahi ho rahi ya invalid URL hai.\n\nDetails: ${error.message}`);
    }
});
