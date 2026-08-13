const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// See the note in animegirlvideo.js — same reasoning applies here. TikTok
// search is used because it's the only reliable, no-key source of real,
// searchable anime MP4 clips.
const SEARCH_TERMS = [
    'anime boy edit 4k',
    'anime boy aesthetic edit',
    'husbando edit amv',
    'anime boy attitude edit'
];

function normalizeResults(payload) {
    if (!payload) return [];
    const container = payload.result || payload.data || payload;
    const arr = Array.isArray(container) ? container : (container.data || container.result || []);
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
        const nowm = item.nowm || item.play || item.video || item.download_url || item.url;
        const title = item.title || item.desc || item.description || 'Anime Boy Edit';
        return nowm ? { url: nowm, title } : null;
    }).filter(Boolean);
}

async function searchAnimeBoyVideo() {
    const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    let lastError = null;

    // Source 1: Starlight
    try {
        const res = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results[Math.floor(Math.random() * results.length)];
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO Starlight] failed:', e.message); }

    // Source 2: Vreden
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results[Math.floor(Math.random() * results.length)];
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO Vreden] failed:', e.message); }

    // Source 3: Yanzbotz
    try {
        const res = await axios.get(`https://api.yanzbotz.my.id/api/search/tiktok?query=${encodeURIComponent(query)}&apikey=yanzofc`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results[Math.floor(Math.random() * results.length)];
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO Yanzbotz] failed:', e.message); }

    // Source 4: Ryzendesu
    try {
        const res = await axios.get(`https://api.ryzendesu.vip/api/search/tiktok?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results[Math.floor(Math.random() * results.length)];
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO Ryzendesu] failed:', e.message); }

    // Source 5: Siputzx
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results[Math.floor(Math.random() * results.length)];
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO Siputzx] failed:', e.message); }

    // Source 6: Okatsu
    try {
        const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/search/tiktok?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results[Math.floor(Math.random() * results.length)];
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO Okatsu] failed:', e.message); }

    if (lastError) console.error('All anime boy video sources failed. Last error:', lastError.message);
    throw new Error('No anime video found — all sources failed');
}

cmd({
  pattern: "animeboyvideo",
  alias: ["aboyvid", "husbandovideo"],
  desc: "Random anime boy video/edit (HD)",
  react: '🎬',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  await store.react('⌛');
  try {
    const video = await searchAnimeBoyVideo();

    const caption = `‎*_ᴀɴɪᴍᴇ ʙᴏʏ ᴠɪᴅᴇᴏ_* 🎬
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${video.title}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      video: { url: video.url },
      caption
    }, { quoted: m });

    await store.react('✅');
  } catch (error) {
    console.error("❌ AnimeBoyVideo Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching anime boy video: ${error.message}`);
  }
});
