const { cmd } = require("../command");
const axios = require('axios');

// Verified against official Lorem Picsum docs (picsum.photos) — no API
// key needed. Random large-size real stock photo, different seed each
// call so no repeats within a short window.
async function fetchWallpaper2() {
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const imgUrl = `https://picsum.photos/seed/${seed}/1080/1920`;

    // Download the actual bytes server-side so WhatsApp doesn't have to
    // fetch/redirect-follow the image itself.
    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000, maxRedirects: 5 });
    return Buffer.from(imgRes.data);
}

cmd({
    pattern: "wallpapers2",
    alias: ["wallpaper2", "wp2"],
    react: "🖼️",
    desc: "Random HD wallpaper (Picsum)",
    category: "fun",
    use: ".wallpapers2",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🖼️", key: message.key } });

        const buffer = await fetchWallpaper2();

        const caption = `╭───────────────⊷
│  🖼️ *HD WALLPAPER*
├───────────────⊷
│ ▸ 📐 *Resolution:* 1080x1920
╰───────────────⊷

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, { image: buffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("❌ Wallpapers2 Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching wallpaper: ${error.message}`);
    }
});
