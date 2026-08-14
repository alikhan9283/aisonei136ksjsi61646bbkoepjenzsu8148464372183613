const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

const AXIOS_DEFAULTS = { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } };

// Two chained providers — if one is down, the other is tried automatically.
async function fetchWallpaper() {
    try {
        const { data } = await axios.get(`https://api.vreden.my.id/api/wallpaper/anime`, AXIOS_DEFAULTS);
        const url = data?.result?.url || data?.result;
        if (data?.status && url) return url;
    } catch (e) { console.log('[WALLPAPER Vreden] failed:', e.message); }

    try {
        const { data } = await axios.get(`https://api.yupra.my.id/api/random/animewallpaper`, AXIOS_DEFAULTS);
        const url = data?.data?.url || data?.data;
        if (data?.success && url) return url;
    } catch (e) { console.log('[WALLPAPER Yupra] failed:', e.message); }

    throw new Error('All wallpaper providers failed');
}

cmd({
    pattern: "wallpaper2",
    alias: ["animewall", "animehd", "anime4k"],
    react: "🖼️",
    desc: "Get a random anime HD wallpaper",
    category: "fun",
    use: ".wallpaper",
    filename: __filename
}, async (conn, mek, m, { from, reply, sender }) => {
    try {
        await conn.sendMessage(from, { react: { text: "🖼️", key: mek.key } });

        const imageUrl = await fetchWallpaper();

        const caption =
            `╭───────────────⊷\n` +
            `│  ⑅⃝⃕͜➳ᷝ͢•ⷨ *ANIME HD WALLPAPER* 🖼️\n` +
            `├───────────────⊷\n` +
            `│ ▸ 🔍 *QUERY:* Random\n` +
            `│ ▸ 📐 *QUALITY:* HD\n` +
            `╰───────────────⊷\n\n` +
            `> ⑅⃝⃕͜➳ᷝ͢•ⷨ ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: caption,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363407310860031@newsletter",
                    newsletterName: "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("❌ Wallpaper Error:", error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ *Failed to fetch wallpaper!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
