const { cmd } = require("../command");
const axios = require('axios');

// Verified live against nekos.best/api/v2/endpoints — official GIF
// categories (fictional anime content, no real people). Combines both
// action sets for a fully random pick each time.
const categories = [
    'dance', 'wave', 'blush', 'happy', 'spin', 'wink', 'teehee', 'nom',
    'punch', 'kick', 'run', 'salute', 'thumbsup', 'highfive', 'shoot', 'bonk'
];

async function fetchAnimeGif() {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000 });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error(`No result for category "${category}"`);

    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return { buffer: Buffer.from(gifRes.data), category };
}

cmd({
    pattern: "randomvideo",
    alias: ["animegif", "randomanimegif"],
    react: "🎲",
    desc: "Random anime-style animated GIF (any category)",
    category: "anime",
    use: ".randomvideo",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🎲", key: message.key } });

        const { buffer, category } = await fetchAnimeGif();

        const caption = `╭───────────────⊷
│  🎲 *ANIME GIF*
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
        console.error("❌ RandomVideo Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching anime gif: ${error.message}`);
    }
});
