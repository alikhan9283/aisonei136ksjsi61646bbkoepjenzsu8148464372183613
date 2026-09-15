const axios = require('axios');
const { cmd } = require('../command');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

const API_KEY = 'supun-b4qb8wgwfd8o0qmzdxfo56cb';

async function searchMovie(query) {
    const res = await axios.get(
        `https://supunofc.site/api/movie/tmdb/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`,
        AXIOS_DEFAULTS
    );

    if (!res.data?.success || !Array.isArray(res.data.results) || !res.data.results.length) {
        throw new Error('No results found for your query');
    }

    return res.data.results;
}

function formatEntry(item) {
    const type = item.kind === 'tv' ? 'TV Show' : 'Movie';
    const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
    const servers = (item.streamUrls || [])
        .map((s, i) => `‎│▸🔗 *${s.server}:* ${s.url}`)
        .join('\n');

    return `‎*_${item.name}_* 🎬
‎╭───────────────━┈⊷
‎│▸🎞️ *ᴛʏᴘᴇ:* ${type}
‎│▸📅 *ʏᴇᴀʀ:* ${item.year || 'Unknown'}
‎│▸⭐ *ʀᴀᴛɪɴɢ:* ${rating}/10
‎│▸📝 *ᴏᴠᴇʀᴠɪᴇᴡ:* ${item.overview ? item.overview.slice(0, 200) + (item.overview.length > 200 ? '…' : '') : 'No overview available'}
‎╰───────────────━┈⊷
${servers ? servers + '\n' : ''}‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;
}

cmd({
  pattern: "movie",
  alias: ["movies", "tmdb", "film"],
  desc: "Search for a movie or TV show and get streaming links",
  react: '🎬',
  category: 'search',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  const query = args.join(" ").trim();

  if (!query) {
    return reply(`🌸 What movie or TV show do you want to search?\n\n*Usage Example:*\n.movie <name>\n\n📝 Example: .movie batman`);
  }

  await store.react('⌛');

  try {
    reply(`🔎 Searching: *${query}*`);

    const results = await searchMovie(query);
    const top = results.slice(0, 5);

    for (const item of top) {
      const caption = formatEntry(item);

      try {
        if (item.posterUrl) {
          await conn.sendMessage(from, {
            image: { url: item.posterUrl },
            caption
          }, { quoted: m });
        } else {
          await conn.sendMessage(from, { text: caption }, { quoted: m });
        }
      } catch (sendErr) {
        console.error(`[MOVIE] Failed to send entry "${item.name}":`, sendErr.message);
      }
    }

    await store.react('✅');
  } catch (error) {
    console.error("❌ Movie Search Error:", error);
    await store.react('❌');
    reply(`⚠️ Error searching for movie: ${error.message}`);
  }
});
