const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// See animegirlvideo.js for the source reasoning — tikwm.com's search
// endpoint was directly tested and confirmed to return real, playable
// no-watermark video URLs.
const SEARCH_TERMS = [
    'anime boy edit',
    'anime boy aesthetic edit',
    'husbando edit',
    'anime boy attitude edit'
];

async function searchAnimeBoyVideo() {
    const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    let lastError = null;

    // Source 1: tikwm.com (confirmed working — primary)
    try {
        const res = await axios.get(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=15&cursor=0`, AXIOS_DEFAULTS);
        const videos = res.data?.data?.videos;
        if (Array.isArray(videos) && videos.length) {
            const withPlay = videos.filter(v => v.play);
            if (withPlay.length) {
                const pick = withPlay[Math.floor(Math.random() * withPlay.length)];
                return { url: pick.play, title: pick.title || 'Anime Boy Edit' };
            }
        }
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO tikwm] failed:', e.message); }

    // Source 2: Vreden (fallback)
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const arr = res.data?.result;
        if (Array.isArray(arr) && arr.length) {
            const withVid = arr.filter(v => v.video || v.play || v.nowm);
            if (withVid.length) {
                const pick = withVid[Math.floor(Math.random() * withVid.length)];
                return { url: pick.video || pick.play || pick.nowm, title: pick.title || pick.desc || 'Anime Boy Edit' };
            }
        }
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO vreden] failed:', e.message); }

    // Source 3: Siputzx (fallback)
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const arr = res.data?.data;
        if (Array.isArray(arr) && arr.length) {
            const withVid = arr.filter(v => v.nowm || v.video);
            if (withVid.length) {
                const pick = withVid[Math.floor(Math.random() * withVid.length)];
                return { url: pick.nowm || pick.video, title: pick.title || pick.desc || 'Anime Boy Edit' };
            }
        }
    } catch (e) { lastError = e; console.log('[ANIMEBOYVIDEO siputzx] failed:', e.message); }

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
