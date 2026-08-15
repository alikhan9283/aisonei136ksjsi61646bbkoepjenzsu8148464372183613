const { cmd } = require("../command");
const axios = require('axios');

// Verified live against nekos.best/api/v2/endpoints — official GIF
// categories (fictional anime content, no real people). Categories
// chosen lean toward more energetic/action-y moves commonly associated
// with male anime characters in these community APIs.
const categories = ['punch', 'kick', 'run', 'salute', 'thumbsup', 'highfive', 'shoot', 'bonk'];

async function fetchAnimeGif() {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000 });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error(`No result for category "${category}"`);

    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return { buffer: Buffer.from(gifRes.data), category };
}

cmd({
    pattern: "boyvideo",
    alias: ["animeboygif", "husbandogif"],
    react: "🔥",
    desc: "Random anime-style animated GIF (boy-themed action)",
    category: "anime",
    use: ".boyvideo",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🔥", key: message.key } });

        const { buffer, category } = await fetchAnimeGif();

        const caption = `╭───────────────⊷
│  🔥 *ANIME GIF*
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
        console.error("❌ BoyVideo Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching anime gif: ${error.message}`);
    }
});
