const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// tikwm.com is the primary source — its /api/feed/search endpoint was
// directly tested and confirmed live (returns code:0, real no-watermark
// "play" URLs) as of Aug 2026. It's the same backend that powers the
// tikwm.com website's own "Search" tab, so it's actively maintained.
// The other three are kept as fallbacks in case tikwm ever rate-limits
// or goes down, but tikwm is what actually gets tried first now.
async function searchTikTok(query) {
    let lastError = null;

    // Source 1: tikwm.com (confirmed working — primary)
    try {
        const res = await axios.get(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=15&cursor=0`, AXIOS_DEFAULTS);
        const videos = res.data?.data?.videos;
        if (Array.isArray(videos) && videos.length) {
            const results = videos.map(v => ({
                title: v.title || 'TikTok Video',
                author: v.author?.nickname || v.author?.unique_id || 'Unknown',
                duration: v.duration ? `${v.duration}s` : 'Unknown',
                link: `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id}`,
                nowm: v.play
            })).filter(v => v.nowm);
            if (results.length) return { results, source: 'tikwm' };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKSEARCH tikwm] failed:', e.message); }

    // Source 2: Vreden (fallback)
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const arr = res.data?.result;
        if (Array.isArray(arr) && arr.length) {
            const results = arr.map(v => ({
                title: v.title || v.desc || 'TikTok Video',
                author: v.author?.nickname || v.author || 'Unknown',
                duration: v.duration || 'Unknown',
                link: v.url || v.link || '',
                nowm: v.video || v.play || v.nowm
            })).filter(v => v.nowm);
            if (results.length) return { results, source: 'vreden' };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKSEARCH vreden] failed:', e.message); }

    // Source 3: Siputzx (fallback)
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const arr = res.data?.data;
        if (Array.isArray(arr) && arr.length) {
            const results = arr.map(v => ({
                title: v.title || v.desc || 'TikTok Video',
                author: v.author || 'Unknown',
                duration: v.duration || 'Unknown',
                link: v.link || v.url || '',
                nowm: v.nowm || v.video
            })).filter(v => v.nowm);
            if (results.length) return { results, source: 'siputzx' };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKSEARCH siputzx] failed:', e.message); }

    // Source 4: Ryzendesu (fallback)
    try {
        const res = await axios.get(`https://api.ryzendesu.vip/api/search/tiktok?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const arr = res.data?.data;
        if (Array.isArray(arr) && arr.length) {
            const results = arr.map(v => ({
                title: v.title || v.desc || 'TikTok Video',
                author: v.author?.nickname || v.author || 'Unknown',
                duration: v.duration || 'Unknown',
                link: v.url || '',
                nowm: v.video?.playAddr || v.video || v.nowm
            })).filter(v => v.nowm);
            if (results.length) return { results, source: 'ryzendesu' };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKSEARCH ryzendesu] failed:', e.message); }

    if (lastError) console.error("All TikTok search APIs failed. Last error:", lastError.message);
    return { results: [], source: null };
}

cmd({
  pattern: "tiktoksearch",
  alias: ["tiktoks", "tiks"],
  desc: "Search for TikTok videos using a query.",
  react: '✅',
  category: 'tools',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  if (!args[0]) {
    return reply("🌸 What do you want to search on TikTok?\n\n*Usage Example:*\n.tiktoksearch <query>");
  }

  const query = args.join(" ");
  await store.react('⌛');

  try {
    reply(`🔎 Searching TikTok for: *${query}*`);

    const { results: allResults } = await searchTikTok(query);

    if (!allResults || allResults.length === 0) {
      await store.react('❌');
      return reply("❌ No results found for your query. Please try with a different keyword.");
    }

    // Get up to 10 random results
    const results = allResults.slice(0, 10).sort(() => Math.random() - 0.5);

    let sentCount = 0;
    for (const video of results) {
      const message = `‎*_ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ ʀᴇsᴜʟᴛ_* 🔎
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${video.title || "Unknown"}
‎│▸👤 *ᴀᴜᴛʜᴏʀ:* ${video.author || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.duration || "Unknown"}
‎│▸🔗 *ᴜʀʟ:* ${video.link || "N/A"}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

      if (video.nowm) {
        try {
          await conn.sendMessage(from, {
            video: { url: video.nowm },
            caption: message
          }, { quoted: m });
          sentCount++;
        } catch (sendErr) {
          console.error("Failed to send video:", sendErr.message);
        }
      }
    }

    if (sentCount === 0) {
      await store.react('❌');
      return reply("❌ Found results but couldn't retrieve playable video links. Please try again.");
    }

    await store.react('✅');
  } catch (error) {
    console.error("Error in TikTokSearch command:", error);
    await store.react('❌');
    reply(`❌ An error occurred while searching TikTok: ${error.message}`);
  }
});
