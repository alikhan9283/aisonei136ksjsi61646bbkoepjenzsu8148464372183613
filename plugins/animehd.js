const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// waifu.im returns high-resolution (often 4K+) artwork with real dimensions
// in the response, so we can actually verify quality instead of guessing
async function fetchHDAnime(keyword) {
    const tagQuery = keyword ? `&included_tags=${encodeURIComponent(keyword)}` : '';

    // Source 1: waifu.im (high-res, has width/height metadata)
    try {
        const res = await axios.get(`https://api.waifu.im/search?is_nsfw=false${tagQuery}`, AXIOS_DEFAULTS);
        const img = res.data?.images?.[0];
        if (img?.url) return { url: img.url, width: img.width, height: img.height };
    } catch (e) { console.log('[HDANIME waifu.im] failed:', e.message); }

    // Source 2: waifu.pics (fallback, quality not guaranteed but usually decent)
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/waifu', AXIOS_DEFAULTS);
        if (res.data?.url) return { url: res.data.url, width: null, height: null };
    } catch (e) { console.log('[HDANIME waifu.pics] failed:', e.message); }

    // Source 3: keyword-based Pinterest scrape for wallpaper-specific results
    try {
        const q = keyword ? `anime ${keyword} 4k wallpaper` : 'anime 4k wallpaper hdr';
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`, AXIOS_DEFAULTS);
        const container = res.data?.data || res.data?.result || [];
        const arr = Array.isArray(container) ? container : [];
        if (arr.length) {
            const item = arr[Math.floor(Math.random() * arr.length)];
            const img = item?.image || item?.url || item?.image_url;
            if (img) return { url: img, width: null, height: null };
        }
    } catch (e) { console.log('[HDANIME pinterest] failed:', e.message); }

    throw new Error('All HD anime wallpaper sources failed');
}

cmd({
  pattern: "animehd",
  alias: ["anime4k", "animewallpaper", "hdranime"],
  desc: "Random HD/4K anime wallpaper, or search by keyword",
  react: '🖼️',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, args, reply }) => {
  const keyword = args.join(" ").trim();

  await store.react('⌛');
  try {
    const result = await fetchHDAnime(keyword);
    const qualityLine = result.width && result.height
      ? `‎│▸📐 *ʀᴇsᴏʟᴜᴛɪᴏɴ:* ${result.width}x${result.height}`
      : `‎│▸📐 *ǫᴜᴀʟɪᴛʏ:* HD`;

    const caption = `‎*_ᴀɴɪᴍᴇ ʜᴅ 4ᴋ ᴡᴀʟʟᴘᴀᴘᴇʀ_* 🖼️
‎╭───────────────━┈⊷
‎│▸🔎 *ǫᴜᴇʀʏ:* ${keyword || 'Random'}
${qualityLine}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      image: { url: result.url },
      caption
    }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ AnimeHD Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching HD anime wallpaper: ${error.message}`);
  }
});
