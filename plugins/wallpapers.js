const { cmd } = require("../command");
const axios = require('axios');

// Verified live against wallhaven.cc/api/v1/search — SFW search works
// without an API key. categories=111 (general+anime+people), purity=100
// (sfw only), sorting=random for a fresh pick every time.
const queries = ['anime', '4k', 'nature', 'space', 'cyberpunk', 'dark', 'landscape', 'minimal'];

async function fetchWallpaper() {
    const q = queries[Math.floor(Math.random() * queries.length)];
    const url = `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(q)}&categories=111&purity=100&sorting=random`;
    const res = await axios.get(url, { timeout: 20000 });
    const results = res.data?.data;
    if (!Array.isArray(results) || !results.length) throw new Error('No wallpapers returned');

    const pick = results[Math.floor(Math.random() * results.length)];
    const imgUrl = pick.path;
    if (!imgUrl) throw new Error('No image path in result');

    // Download the actual bytes server-side so WhatsApp doesn't have to
    // fetch a large full-res image itself (avoids stream-fetch failures).
    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 40000 });
    return { buffer: Buffer.from(imgRes.data), resolution: pick.resolution, query: q };
}

cmd({
    pattern: "wallpapers",
    alias: ["wallpaper1", "wp1"],
    react: "🖼️",
    desc: "Random HD wallpaper (Wallhaven)",
    category: "fun",
    use: ".wallpapers",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🖼️", key: message.key } });

        const { buffer, resolution, query } = await fetchWallpaper();

        const caption = `╭───────────────⊷
│  🖼️ *HD WALLPAPER*
├───────────────⊷
│ ▸ 🔍 *Query:* ${query}
│ ▸ 📐 *Resolution:* ${resolution}
╰───────────────⊷

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, { image: buffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("❌ Wallpapers Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching wallpaper: ${error.message}`);
    }
});
