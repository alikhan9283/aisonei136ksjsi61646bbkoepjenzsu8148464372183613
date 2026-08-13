const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// nekos.best doesn't have raw .mp4 videos — its "video" content is
// animated GIFs (hug, pat, dance, etc). We fetch those as GIF buffers and
// send them as WhatsApp video messages with gifPlayback so they autoplay
// like a video/animation, which is what "anime video" usually means here.
const GIF_CATEGORIES = ['hug', 'pat', 'dance', 'wink', 'poke', 'slap', 'kiss', 'cuddle', 'highfive', 'baka'];

async function fetchAnimeGif(category) {
    const cat = category && GIF_CATEGORIES.includes(category) ? category : GIF_CATEGORIES[Math.floor(Math.random() * GIF_CATEGORIES.length)];

    // Source 1: nekos.best
    try {
        const res = await axios.get(`https://nekos.best/api/v2/${cat}`, AXIOS_DEFAULTS);
        const item = res.data?.results?.[0];
        if (item?.url) return { url: item.url, category: cat, anime: item.anime_name || null };
    } catch (e) { console.log('[ANIMEVIDEO nekos.best] failed:', e.message); }

    // Source 2: waifu.pics (also has gif-style reaction categories)
    try {
        const res = await axios.get(`https://api.waifu.pics/sfw/${cat}`, AXIOS_DEFAULTS);
        if (res.data?.url) return { url: res.data.url, category: cat, anime: null };
    } catch (e) { console.log('[ANIMEVIDEO waifu.pics] failed:', e.message); }

    throw new Error('All anime gif/video sources failed');
}

cmd({
  pattern: "animevideo",
  alias: ["animegif", "nekogif", "animeanim"],
  desc: "Random anime gif/animation (hug, pat, dance, etc) sent as video",
  react: '🎬',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, args, reply }) => {
  const category = (args[0] || "").toLowerCase();

  await store.react('⌛');
  try {
    const result = await fetchAnimeGif(category);

    const gifRes = await axios.get(result.url, { responseType: 'arraybuffer', timeout: 30000 });
    const buffer = Buffer.from(gifRes.data);

    const caption = `‎*_ᴀɴɪᴍᴇ ᴠɪᴅᴇᴏ_* 🎬
‎╭───────────────━┈⊷
‎│▸🏷️ *ᴄᴀᴛᴇɢᴏʀʏ:* ${result.category}
${result.anime ? `‎│▸📺 *ᴀɴɪᴍᴇ:* ${result.anime}` : ''}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      video: buffer,
      gifPlayback: true,
      caption
    }, { quoted: m });

    await store.react('✅');
  } catch (error) {
    console.error("❌ AnimeVideo Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching anime video/gif: ${error.message}\n\n📝 *Available categories:* ${GIF_CATEGORIES.join(', ')}`);
  }
});
