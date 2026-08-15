const { cmd } = require("../command");
const axios = require('axios');

// nekos.best is verified against its official docs (no key needed):
// https://nekos.best/api/v2/<category> -> { results: [{ url }] }
// It's used as the primary source since it's a dedicated, reliable anime
// image API. Pinterest search is kept only as a last-resort backup since
// its query relevance can be inconsistent.
const nekosCategories = ['neko', 'waifu', 'smug', 'wave', 'happy'];

async function fetchAttitudeGirl() {
    const errors = [];

    try {
        const category = nekosCategories[Math.floor(Math.random() * nekosCategories.length)];
        const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000 });
        const img = res.data?.results?.[0]?.url;
        if (img) return img;
        errors.push('nekos.best: no url in response');
    } catch (e) {
        errors.push(`nekos.best: ${e.code || ''} ${e.message}`);
    }

    try {
        const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 15000 });
        if (res.data?.url) return res.data.url;
        errors.push('waifu.pics: no url in response');
    } catch (e) {
        errors.push(`waifu.pics: ${e.code || ''} ${e.message}`);
    }

    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent('anime girl aesthetic')}`, { timeout: 20000 });
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const imagePins = arr.filter(item => item?.image_url && item.type === 'image');
        if (imagePins.length) {
            const item = imagePins[Math.floor(Math.random() * imagePins.length)];
            if (item.image_url) return item.image_url;
        }
        errors.push('pinterest: no relevant image found');
    } catch (e) {
        errors.push(`pinterest: ${e.code || ''} ${e.message}`);
    }

    throw new Error(errors.join(' | '));
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
        reply(`⚠️ Error fetching attitude girl image:\n${error.message}`);
    }
});
