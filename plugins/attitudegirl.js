const { cmd } = require("../command");
const axios = require('axios');

// Verified live against api.siputzx.my.id/api/s/pinterest — real response shape is:
// { status: true, data: [ { image_url, video_url, type, grid_title, description, ... } ] }
async function fetchAttitudeGirl() {
    const queries = [
        'anime attitude girl aesthetic',
        'anime girl attitude cool',
        'badass anime girl aesthetic'
    ];
    const q = queries[Math.floor(Math.random() * queries.length)];
    const errors = [];

    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`, { timeout: 20000 });
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const imagePins = arr.filter(item => item?.image_url && (item.type === 'image' || !item.video_url));
        const pool = imagePins.length ? imagePins : arr;
        if (pool.length) {
            const item = pool[Math.floor(Math.random() * pool.length)];
            if (item?.image_url) return item.image_url;
            errors.push('pinterest: got results but no image_url in picked item');
        } else {
            errors.push('pinterest: response had no usable data array (status=' + res.data?.status + ')');
        }
    } catch (e) {
        errors.push(`pinterest: ${e.code || ''} ${e.message}`);
    }

    try {
        const res = await axios.get('https://api.waifu.pics/sfw/smug', { timeout: 15000 });
        if (res.data?.url) return res.data.url;
        errors.push('waifu.pics: no url in response');
    } catch (e) {
        errors.push(`waifu.pics: ${e.code || ''} ${e.message}`);
    }

    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/smug/img', { timeout: 15000 });
        if (res.data?.link) return res.data.link;
        errors.push('purrbot: no link in response');
    } catch (e) {
        errors.push(`purrbot: ${e.code || ''} ${e.message}`);
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
