const axios = require('axios');
const { cmd } = require('../command');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// "Attitude" isn't a standard tag on any of these APIs, so categories that
// visually match (smug/confident poses, cool character expressions) are
// pulled from several independent sources — more sources here than before
// so one dead API doesn't take the whole command down.
async function fetchFuckReaction() {
    const errors = [];

    // Source 1: waifu.pics bully (confirmed valid tag)
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/bully', AXIOS_DEFAULTS);
        if (res.data?.url) return { url: res.data.url, source: 'waifu.pics' };
    } catch (e) { errors.push(`waifu.pics: ${e.message}`); }

    // Source 2: waifu.pics cry (same family)
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/cry', AXIOS_DEFAULTS);
        if (res.data?.url) return { url: res.data.url, source: 'waifu.pics-cry' };
    } catch (e) { errors.push(`waifu.pics-cry: ${e.message}`); }

    // Source 3: waifu.im tag search
    try {
        const res = await axios.get('https://api.waifu.im/search?included_tags=waifu&is_nsfw=false', AXIOS_DEFAULTS);
        const img = res.data?.images?.[0]?.url;
        if (img) return { url: img, source: 'waifu.im' };
    } catch (e) { errors.push(`waifu.im: ${e.message}`); }

    // Source 4: purrbot.site
    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/smug/img', AXIOS_DEFAULTS);
        if (res.data?.link) return { url: res.data.link, source: 'purrbot' };
    } catch (e) { errors.push(`purrbot: ${e.message}`); }

    // Source 5: nekos.best neko (general anime character fallback)
    try {
        const res = await axios.get('https://nekos.best/api/v2/neko', AXIOS_DEFAULTS);
        const img = res.data?.results?.[0]?.url;
        if (img) return { url: img, source: 'nekos.best' };
    } catch (e) { errors.push(`nekos.best: ${e.message}`); }

    console.error('[FUCK] All sources failed:', errors.join(' | '));
    throw new Error('All sources are down right now — try again shortly.');
}

cmd({
    pattern: 'fuck',
    alias: ['fu'],
    desc: 'Send a sassy reaction image',
    category: 'anime',
    filename: __filename,
    react: '😤'
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const { url: imgUrl, source } = await fetchFuckReaction();

        const caption =
`‎*_ғᴜᴄᴋ ʏᴏᴜ ʙᴀʙʏ_* 😤
‎╭───────────────━┈⊷
‎│▸🎴 Source: ${source}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

        await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`⚠️ Error fetching image: ${e.message}`);
    }
});
