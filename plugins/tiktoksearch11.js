const fetch = require("node-fetch");
const { cmd } = require("../command");

// Two independent search sources — tikwm.com first (same reliable API
// already working in .tiktokmp3), Koyeb starlight API as fallback if it's
// down (which it does periodically — that's a known issue with that
// specific free host, not a bug in this command).

async function searchTikwm(query) {
    const response = await fetch(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=10`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const data = await response.json();
    const list = data?.data?.videos || data?.data || [];
    if (!Array.isArray(list) || !list.length) throw new Error('tikwm: no results');
    return list.map(v => ({
        title: v.title || 'TikTok Video',
        author: v.author?.nickname || v.author?.unique_id || 'Unknown',
        duration: v.duration ? `${v.duration}s` : 'Unknown',
        link: `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id || v.id}`,
        nowm: v.play ? (v.play.startsWith('http') ? v.play : `https://tikwm.com${v.play}`) : null
    }));
}

async function searchStarlight(query) {
    const response = await fetch(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!data || !data.data || data.data.length === 0) throw new Error('starlight: no results');
    return data.data.map(v => ({
        title: v.title,
        author: v.author || 'Unknown',
        duration: v.duration || 'Unknown',
        link: v.link,
        nowm: v.nowm || null
    }));
}

cmd({
  pattern: "tiktoksearch2",
  alias: ["tiktoks2", "tiks"],
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

    let results = null;
    let lastError = null;

    for (const attempt of [searchTikwm, searchStarlight]) {
        try {
            const list = await attempt(query);
            if (list && list.length) { results = list; break; }
        } catch (e) {
            lastError = e;
            console.log('[TIKTOKSEARCH]', e.message);
        }
    }

    if (!results) {
      await store.react('❌');
      return reply("❌ No results found for your query. Please try with a different keyword.");
    }

    // Get up to 7 random results
    const picked = results.slice(0, 10).sort(() => Math.random() - 0.5).slice(0, 7);

    for (const video of picked) {
      const message = `‎*_ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ ʀᴇsᴜʟᴛ_* 🔎
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${video.title}
‎│▸👤 *ᴀᴜᴛʜᴏʀ:* ${video.author || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.duration || "Unknown"}
‎│▸🔗 *ᴜʀʟ:* ${video.link}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

      if (video.nowm) {
        await conn.sendMessage(from, {
          video: { url: video.nowm },
          caption: message
        }, { quoted: m });
      } else {
        reply(`❌ Failed to retrieve video for *"${video.title}"*.`);
      }
    }

    await store.react('✅');
  } catch (error) {
    console.error("Error in TikTokSearch command:", error);
    await store.react('❌');
    reply("❌ An error occurred while searching TikTok. Please try again later.");
  }
});
