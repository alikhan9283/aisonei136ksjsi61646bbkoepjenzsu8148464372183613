const { cmd } = require("../command");
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Verified live against api.siputzx.my.id/api/s/pinterest — real response shape is:
// { status: true, data: [ { image_url, video_url, type, grid_title, description, ... } ] }
async function fetchAttitudeRealGirl() {
    const queries = [
        'real girl attitude aesthetic',
        'stylish girl attitude photo',
        'girl attitude pose aesthetic',
        'girl aesthetic pic attitude'
    ];
    const q = queries[Math.floor(Math.random() * queries.length)];

    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`, AXIOS_DEFAULTS);
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const imagePins = arr.filter(item => item?.image_url && (item.type === 'image' || !item.video_url));
        const pool = imagePins.length ? imagePins : arr;
        if (pool.length) {
            const item = pool[Math.floor(Math.random() * pool.length)];
            const img = item?.image_url;
            if (img) return img;
        }
    } catch (e) { console.log('[ATTITUDEREALGIRL pinterest] failed:', e.message); }

    // Backup: retry with a different, broader query in case the first
    // search term happens to return zero results
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent('girl attitude')}`, AXIOS_DEFAULTS);
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const imagePins = arr.filter(item => item?.image_url);
        if (imagePins.length) {
            const item = imagePins[Math.floor(Math.random() * imagePins.length)];
            if (item.image_url) return item.image_url;
        }
    } catch (e) { console.log('[ATTITUDEREALGIRL pinterest retry] failed:', e.message); }

    throw new Error('All real girl attitude image sources failed');
}

cmd({
    pattern: "attitudegirlreal",
    alias: ["realgirlattitude", "attigirlreal"],
    react: "😎",
    desc: "Random real (non-anime) girl attitude/aesthetic image",
    category: "anime",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "😎", key: message.key } });

        const imgUrl = await fetchAttitudeRealGirl();
        const caption = `‎*_ᴀᴛᴛɪᴛᴜᴅᴇ ɢɪʀʟ (ʀᴇᴀʟ)_* 😎
‎╭───────────────━┈⊷
‎│▸📸 Random Real Girl Attitude Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: { url: imgUrl }, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("❌ AttitudeRealGirl Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching real girl attitude image: ${error.message}`);
    }
});
