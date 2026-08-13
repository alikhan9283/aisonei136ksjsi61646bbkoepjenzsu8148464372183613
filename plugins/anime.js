const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// General anime image — with optional keyword (falls back to Pinterest
// keyword search since waifu APIs are category-only, not keyword search)
async function fetchAnime(keyword) {
    if (keyword) {
        try {
            const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent('anime ' + keyword)}`, AXIOS_DEFAULTS);
            const container = res.data?.data || res.data?.result || [];
            const arr = Array.isArray(container) ? container : [];
            if (arr.length) {
                const item = arr[Math.floor(Math.random() * arr.length)];
                const img = item?.image || item?.url || item?.image_url;
                if (img) return img;
            }
        } catch (e) { console.log('[ANIME keyword pinterest] failed:', e.message); }
    }

    // No keyword or keyword search failed — random general anime image
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/waifu', AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { console.log('[ANIME waifu.pics] failed:', e.message); }

    try {
        const res = await axios.get('https://nekos.best/api/v2/neko', AXIOS_DEFAULTS);
        const img = res.data?.results?.[0]?.url;
        if (img) return img;
    } catch (e) { console.log('[ANIME nekos.best] failed:', e.message); }

    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/neko/img', AXIOS_DEFAULTS);
        if (res.data?.link) return res.data.link;
    } catch (e) { console.log('[ANIME purrbot] failed:', e.message); }

    throw new Error('All anime image sources failed');
}

cmd({
  pattern: "ani2",
  alias: ["animepic", "animesearch"],
  desc: "Random anime image, or search by keyword",
  react: '🎴',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, args, reply }) => {
  const keyword = args.join(" ").trim();

  await store.react('⌛');
  try {
    const imgUrl = await fetchAnime(keyword);
    const caption = `‎*_ᴀɴɪᴍᴇ_* 🎴
‎╭───────────────━┈⊷
‎│▸🔎 *ǫᴜᴇʀʏ:* ${keyword || 'Random'}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ Anime Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching anime image: ${error.message}`);
  }
});
