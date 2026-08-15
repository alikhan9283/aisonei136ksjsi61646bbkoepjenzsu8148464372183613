const { cmd } = require("../command");
const axios = require('axios');

// Verified live against nekos.best/api/v2/endpoints — these are official
// GIF categories (fictional anime content, no real people). Categories
// chosen lean toward soft/cute actions commonly associated with female
// anime characters in these community APIs.
const categories = ['dance', 'wave', 'blush', 'happy', 'spin', 'wink', 'teehee', 'nom'];

async function fetchAnimeGif() {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000 });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error(`No result for category "${category}"`);

    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return { buffer: Buffer.from(gifRes.data), category };
}

cmd({
    pattern: "girlsvideo",
    alias: ["animegirlgif", "waifugif"],
    react: "🎀",
    desc: "Random anime-style animated GIF (girl-themed action)",
    category: "anime",
    use: ".girlsvideo",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🎀", key: message.key } });

        const { buffer, category } = await fetchAnimeGif();

        const caption = `╭───────────────⊷
│  🎀 *ANIME GIF*
├───────────────⊷
│ ▸ 🎬 *Action:* ${category}
╰───────────────⊷

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            video: buffer,
            gifPlayback: true,
            caption
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("❌ GirlsVideo Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching anime gif: ${error.message}`);
    }
});
