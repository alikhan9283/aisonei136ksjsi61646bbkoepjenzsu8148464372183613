const { cmd } = require("../command");
const axios = require('axios');

// "Real" (non-anime) attitude girl images aren't covered by anime-image
// APIs like nekos.best/waifu.pics, so Pinterest search is the only
// realistic source for this one. Several broad queries are tried in
// sequence since single specific queries sometimes return zero/irrelevant
// results from this particular provider.
async function fetchAttitudeRealGirl() {
    const queries = [
        'girl attitude aesthetic',
        'stylish girl photo',
        'girl aesthetic pic',
        'attitude girl pic'
    ];
    const errors = [];

    for (const q of queries) {
        try {
            const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`, { timeout: 20000 });
            const arr = Array.isArray(res.data?.data) ? res.data.data : [];
            const imagePins = arr.filter(item => item?.image_url && item.type === 'image');
            if (imagePins.length) {
                const item = imagePins[Math.floor(Math.random() * imagePins.length)];
                if (item.image_url) return item.image_url;
            }
            errors.push(`pinterest(${q}): no relevant results`);
        } catch (e) {
            errors.push(`pinterest(${q}): ${e.code || ''} ${e.message}`);
            // If the network itself is broken, no point retrying more queries
            if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') break;
        }
    }

    throw new Error(errors.join(' | '));
}

cmd({
    pattern: "attitudegirl",
    alias: ["girlattitude", "attigirlreal"],
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
        reply(`⚠️ Error fetching real girl attitude image:\n${error.message}`);
    }
});
