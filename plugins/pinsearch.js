const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// Normalizes whatever shape the search API returns into a flat array of
// { url, isVideo } items, since different providers structure results
// differently (result[], data[], images[], pins[] etc).
function normalizeResults(payload) {
    if (!payload) return [];
    const container = payload.result || payload.data || payload.pins || payload;
    const arr = Array.isArray(container) ? container : (container.data || container.result || []);
    if (!Array.isArray(arr)) return [];

    return arr.map(item => {
        if (typeof item === 'string') return { url: item, isVideo: false };
        const url = item.url || item.image || item.image_url || item.thumbnail || item.video || item.link;
        const isVideo = !!item.video || item.type === 'video' || /\.mp4($|\?)/i.test(url || '');
        return url ? { url, isVideo } : null;
    }).filter(Boolean);
}

async function searchPinterest(query) {
    // Method 1: Siputzx (free, no key, commonly used for Pinterest search)
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results;
    } catch (e) { console.log('[PINSEARCH Siputzx] failed:', e.message); }

    // Method 2: Vreden (same provider already proven reliable elsewhere in this bot)
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/pinterest?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results;
    } catch (e) { console.log('[PINSEARCH Vreden] failed:', e.message); }

    // Method 3: Okatsu
    try {
        const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/search/pinterest?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results;
    } catch (e) { console.log('[PINSEARCH Okatsu] failed:', e.message); }

    // Method 4: Ryzendesu (extra fallback)
    try {
        const res = await axios.get(`https://api.ryzendesu.vip/api/search/pinterest?query=${encodeURIComponent(query)}`, AXIOS_DEFAULTS);
        const results = normalizeResults(res.data);
        if (results.length) return results;
    } catch (e) { console.log('[PINSEARCH Ryzendesu] failed:', e.message); }

    throw new Error('No results found — all search methods failed');
}

cmd({
  pattern: "pinsearch",
  alias: ["pinstsearch", "pins", "pinterestsearch"],
  desc: "Search Pinterest for images/videos by keyword",
  react: '🔍',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  const query = args.join(" ").trim();

  if (!query) {
    return reply("🌸 What do you want to search on Pinterest?\n\n*Usage Example:*\n.pinsearch <keyword>");
  }

  await store.react('⌛');

  try {
    reply(`🔎 Searching Pinterest for: *${query}*`);

    const results = await searchPinterest(query);

    if (!results || results.length === 0) {
      await store.react('❌');
      return reply("❌ No results found for your query. Please try with a different keyword.");
    }

    // Send up to 5 results so the chat doesn't get flooded
    const picks = results.slice(0, 5);
    let sentCount = 0;

    for (let i = 0; i < picks.length; i++) {
      const item = picks[i];
      const caption = `‎*_ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ ʀᴇsᴜʟᴛ_* 📌
‎╭───────────────━┈⊷
‎│▸🔎 *ǫᴜᴇʀʏ:* ${query}
‎│▸📄 *ʀᴇsᴜʟᴛ:* ${i + 1} of ${picks.length}
‎│▸🎞️ *ᴛʏᴘᴇ:* ${item.isVideo ? "Video" : "Image"}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

      try {
        if (item.isVideo) {
          await conn.sendMessage(from, {
            video: { url: item.url },
            mimetype: "video/mp4",
            caption
          }, { quoted: m });
        } else {
          await conn.sendMessage(from, {
            image: { url: item.url },
            caption
          }, { quoted: m });
        }
        sentCount++;
      } catch (sendErr) {
        console.log(`[PINSEARCH] failed to send result ${i}:`, sendErr.message);
      }
    }

    if (sentCount === 0) {
      await store.react('❌');
      return reply("❌ Found results but couldn't retrieve any media. Please try again.");
    }

    await store.react('✅');
  } catch (error) {
    console.error("❌ Pinterest Search Error:", error);
    await store.react('❌');
    reply(`⚠️ Error searching Pinterest: ${error.message}`);
  }
});
