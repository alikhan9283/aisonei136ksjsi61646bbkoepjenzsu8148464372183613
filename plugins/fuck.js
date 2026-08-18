const { cmd } = require('../command');
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// NOTE: no image API exposes a "middle finger" tag specifically — that's
// a keyword-search result, not a category, and the Pinterest keyword-search
// API used elsewhere in this bot (api.siputzx.my.id) was directly tested
// and found to ignore the query entirely (returns unrelated cached results
// regardless of what's searched). So this pulls from the closest matching
// mood tags — angry/annoyed anime reactions — from tag-based APIs that
// are confirmed to actually respect the requested category.
async function fetchAngryReaction() {
    const errors = [];
    // "angry" is not a real waifu.pics tag (confirmed against the official
    // .env.example endpoint list on GitHub) — using it caused every attempt
    // to 404 before ever reaching the fallbacks below. Only confirmed-valid
    // tags are used now: waifu,neko,shinobu,bully,cry,hug,kiss,lick,pat,
    // smug,highfive,nom,bite,slap,wink,poke,dance,cringe,blush
    const tags = ['bully', 'cry', 'slap'];
    const tag = tags[Math.floor(Math.random() * tags.length)];

    try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${tag}`, AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { errors.push(`waifu.pics/${tag}: ${e.message}`); }

    try {
        const res = await axios.get('https://api.waifu.im/search?included_tags=waifu&is_nsfw=false', AXIOS_DEFAULTS);
        const img = res.data?.images?.[0]?.url;
        if (img) return img;
    } catch (e) { errors.push(`waifu.im: ${e.message}`); }

    try {
        const res = await axios.get('https://nekos.best/api/v2/neko', AXIOS_DEFAULTS);
        const img = res.data?.results?.[0]?.url;
        if (img) return img;
    } catch (e) { errors.push(`nekos.best: ${e.message}`); }

    try {
        const res = await axios.get('https://api.waifu.pics/sfw/waifu', AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { errors.push(`waifu.pics/waifu: ${e.message}`); }

    console.error('[FUCK] All sources failed:', errors.join(' | '));
    throw new Error('All sources are down right now — try again shortly.');
}

const LINES = [
    'FUCK YOU BABY 🍼😰',
    'DIE MAD ABOUT IT 🍼😈',
    'NOT TODAY, TRY AGAIN 🍼🙄',
    'CRY ABOUT IT 🍼😤'
];

cmd({
    pattern: 'fuck',
    alias: ['fu', 'angry'],
    desc: 'Send a sassy reaction image',
    category: 'fun',
    filename: __filename,
    react: '🖕'
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const imgUrl = await fetchAngryReaction();
        const line = LINES[Math.floor(Math.random() * LINES.length)];

        await conn.sendMessage(from, {
            image: { url: imgUrl },
            caption: `*${line}*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`⚠️ Error: ${e.message}`);
    }
});
