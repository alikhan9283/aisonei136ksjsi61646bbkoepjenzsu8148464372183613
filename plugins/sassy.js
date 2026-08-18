const { cmd } = require('../command');
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Same reasoning as fuck.js — no API has a real "middle finger" tag, so
// this pulls from tag-based confident/sassy mood categories instead.
async function fetchSassyReaction() {
    const errors = [];
    // Only confirmed-valid waifu.pics tags used (see fuck.js for the full
    // verified list) — "smug" and "bully" are both real tags.
    const tags = ['smug', 'bully'];
    const tag = tags[Math.floor(Math.random() * tags.length)];

    try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${tag}`, AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { errors.push(`waifu.pics/${tag}: ${e.message}`); }

    try {
        const res = await axios.get('https://nekos.best/api/v2/neko', AXIOS_DEFAULTS);
        const img = res.data?.results?.[0]?.url;
        if (img) return img;
    } catch (e) { errors.push(`nekos.best: ${e.message}`); }

    try {
        const res = await axios.get('https://api.waifu.im/search?included_tags=waifu&is_nsfw=false', AXIOS_DEFAULTS);
        const img = res.data?.images?.[0]?.url;
        if (img) return img;
    } catch (e) { errors.push(`waifu.im: ${e.message}`); }

    console.error('[SASSY] All sources failed:', errors.join(' | '));
    throw new Error('All sources are down right now — try again shortly.');
}

cmd({
    pattern: 'sassy',
    alias: ['savage', 'roast'],
    desc: 'Send a savage/sassy reaction image with a comeback line',
    category: 'fun',
    filename: __filename,
    react: '💅'
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const imgUrl = await fetchSassyReaction();

        const caption =
`‎*_sᴀssʏ_* 💅
‎╭───────────────━┈⊷
‎│▸ᴅᴇᴀʟ ᴡɪᴛʜ ɪᴛ. 😌
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

        await conn.sendMessage(from, {
            image: { url: imgUrl },
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`⚠️ Error: ${e.message}`);
    }
});
