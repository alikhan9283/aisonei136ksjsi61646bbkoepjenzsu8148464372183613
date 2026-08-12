const fetch = require("node-fetch");
const { cmd } = require("../command");

// Multiple APIs — agar aek fail ho to dosri try hogi (fallback system)
const TIKTOK_APIS = [
  {
    name: "starlight",
    url: (q) => `https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(q)}`,
    parse: (json) => Array.isArray(json?.data) ? json.data.map(v => ({
      title: v.title,
      author: v.author,
      duration: v.duration,
      link: v.link,
      nowm: v.nowm || v.play || v.video
    })) : []
  },
  {
    name: "vreden",
    url: (q) => `https://api.vreden.my.id/api/tiktok/search?query=${encodeURIComponent(q)}`,
    parse: (json) => Array.isArray(json?.result) ? json.result.map(v => ({
      title: v.title || v.desc,
      author: v.author?.nickname || v.author,
      duration: v.duration,
      link: v.url || v.link,
      nowm: v.video || v.play || v.nowm
    })) : []
  },
  {
    name: "yanzbotz",
    url: (q) => `https://api.yanzbotz.my.id/api/search/tiktok?query=${encodeURIComponent(q)}&apikey=yanzofc`,
    parse: (json) => Array.isArray(json?.result) ? json.result.map(v => ({
      title: v.title || v.description,
      author: v.author,
      duration: v.duration,
      link: v.url,
      nowm: v.video || v.download_url
    })) : []
  },
  {
    name: "ryzendesu",
    url: (q) => `https://api.ryzendesu.vip/api/search/tiktok?query=${encodeURIComponent(q)}`,
    parse: (json) => Array.isArray(json?.data) ? json.data.map(v => ({
      title: v.title || v.desc,
      author: v.author?.nickname || v.author,
      duration: v.duration,
      link: v.url,
      nowm: v.video?.playAddr || v.video || v.nowm
    })) : []
  },
  {
    name: "siputzx",
    url: (q) => `https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(q)}`,
    parse: (json) => Array.isArray(json?.data) ? json.data.map(v => ({
      title: v.title || v.desc,
      author: v.author,
      duration: v.duration,
      link: v.link || v.url,
      nowm: v.nowm || v.video
    })) : []
  }
];

async function fetchWithTimeout(url, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function searchTikTok(query) {
  let lastError = null;
  for (const api of TIKTOK_APIS) {
    try {
      const json = await fetchWithTimeout(api.url(query));
      const results = api.parse(json).filter(v => v && v.nowm);
      if (results.length > 0) {
        return { results, source: api.name };
      }
    } catch (err) {
      lastError = err;
      continue; // try next API
    }
  }
  if (lastError) console.error("All TikTok APIs failed. Last error:", lastError);
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

    const { results: allResults, source } = await searchTikTok(query);

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
          console.error("Failed to send video:", sendErr);
          reply(`❌ Failed to send video for *"${video.title || 'Unknown'}"*.`);
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
    reply("❌ An error occurred while searching TikTok. Please try again later.");
  }
});
