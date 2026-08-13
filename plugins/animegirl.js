const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

async function fetchAnimeGirl() {
    // Source 1: waifu.pics
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/waifu', AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { console.log('[ANIMEGIRL waifu.pics] failed:', e.message); }

    // Source 2: purrbot.site
    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/waifu/img', AXIOS_DEFAULTS);
        if (res.data?.link) return res.data.link;
    } catch (e) { console.log('[ANIMEGIRL purrbot] failed:', e.message); }

    // Source 3: nekos.best
    try {
        const res = await axios.get('https://nekos.best/api/v2/waifu', AXIOS_DEFAULTS);
        const img = res.data?.results?.[0]?.url;
        if (img) return img;
    } catch (e) { console.log('[ANIMEGIRL nekos.best] failed:', e.message); }

    // Source 4: waifu.im
    try {
        const res = await axios.get('https://api.waifu.im/search?included_tags=waifu&is_nsfw=false', AXIOS_DEFAULTS);
        const img = res.data?.images?.[0]?.url;
        if (img) return img;
    } catch (e) { console.log('[ANIMEGIRL waifu.im] failed:', e.message); }

    throw new Error('All anime girl image sources failed');
}

cmd({
  pattern: "anigirl2",
  alias: ["agirl", "waifu"],
  desc: "Random anime girl image",
  react: '👧',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  await store.react('⌛');
  try {
    const imgUrl = await fetchAnimeGirl();
    const caption = `‎*_ᴀɴɪᴍᴇ ɢɪʀʟ_* 👧
‎╭───────────────━┈⊷
‎│▸🎴 Random Anime Girl Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ AnimeGirl Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching anime girl image: ${error.message}`);
  }
});
