const { cmd } = require("../command");
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Verified live against api.siputzx.my.id/api/s/pinterest — real response shape is:
// { status: true, data: [ { image_url, video_url, type, grid_title, description, ... } ] }
async function fetchAttitudeGirl() {
    const queries = [
        'anime attitude girl aesthetic',
        'anime girl attitude cool',
        'badass anime girl aesthetic'
    ];
    const q = queries[Math.floor(Math.random() * queries.length)];

    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`, AXIOS_DEFAULTS);
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        // Prefer image-type pins with a usable image_url
        const imagePins = arr.filter(item => item?.image_url && (item.type === 'image' || !item.video_url));
        const pool = imagePins.length ? imagePins : arr;
        if (pool.length) {
            const item = pool[Math.floor(Math.random() * pool.length)];
            const img = item?.image_url;
            if (img) return img;
        }
    } catch (e) { console.log('[ATTITUDEGIRL pinterest] failed:', e.message); }

    try {
        const res = await axios.get('https://api.waifu.pics/sfw/smug', AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { console.log('[ATTITUDEGIRL waifu.pics] failed:', e.message); }

    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/smug/img', AXIOS_DEFAULTS);
        if (res.data?.link) return res.data.link;
    } catch (e) { console.log('[ATTITUDEGIRL purrbot] failed:', e.message); }

    throw new Error('All attitude girl image sources failed');
}

cmd({
    pattern: "attitudegirl",
    alias: ["girlattitude", "attigirl"],
    react: "😎",
    desc: "Random anime girl attitude/aesthetic image",
    category: "anime",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "😎", key: message.key } });

        const imgUrl = await fetchAttitudeGirl();
        const caption = `‎*_ᴀᴛᴛɪᴛᴜᴅᴇ ɢɪʀʟ_* 😎
‎╭───────────────━┈⊷
‎│▸🎴 Random Attitude Anime Girl Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: { url: imgUrl }, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("❌ AttitudeGirl Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching attitude girl image: ${error.message}`);
    }
});
