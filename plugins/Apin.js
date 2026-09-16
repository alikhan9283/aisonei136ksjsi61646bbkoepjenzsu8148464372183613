const { cmd } = require("../command");
const axios = require("axios");

const API_KEY = "supun-b4qb8wgwfd8o0qmzdxfo56cb";

async function pinterestSearch(query) {
    const url = `https://supunofc.site/api/download/pinterest/search?query=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    const { data } = await axios.get(url, { timeout: 25000 });
    if (!data?.success || !Array.isArray(data?.result) || !data.result.length) {
        throw new Error(data?.message || "No results found for that search");
    }
    return data.result;
}

cmd({
    pattern: "pinsearch5",
    alias: ["pinterest", "pins5"],
    react: "📌",
    desc: "Search Pinterest for images by keyword",
    category: "download",
    use: ".pinsearch <keyword>",
    filename: __filename
}, async (client, message, match, { from, reply, q }) => {
    try {
        const query = q ? q.trim() : "";
        if (!query) {
            return reply(`📌 *PINTEREST SEARCH*\n\n⚠️ Please provide a keyword\n💡 Use: .pinsearch <keyword>\n📝 Example: .pinsearch anime\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "📌", key: message.key } }).catch(() => {});

        const results = await pinterestSearch(query);
        const picks = results.slice(0, 5);

        for (let i = 0; i < picks.length; i++) {
            const item = picks[i];
            try {
                const imgRes = await axios.get(item.image, {
                    responseType: "arraybuffer",
                    timeout: 20000,
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                });
                const buffer = Buffer.from(imgRes.data);

                const caption = i === 0
                    ? `📌 *Pinterest Search:* ${query}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
                    : undefined;

                await client.sendMessage(message.chat, {
                    image: buffer,
                    caption
                }, { quoted: message });
            } catch (e) {
                console.log(`[PinSearch] failed to send result ${i}:`, e.message);
            }
        }

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ PinSearch Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Search failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
