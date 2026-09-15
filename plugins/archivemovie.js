const axios = require('axios');
const { cmd } = require('../command');

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

const API_KEY = 'supun-b4qb8wgwfd8o0qmzdxfo56cb';

async function searchArchiveMovie(query) {
    const res = await axios.get(
        `https://supunofc.site/api/movie/movie/search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`,
        AXIOS_DEFAULTS
    );

    if (!res.data?.success || !Array.isArray(res.data.result) || !res.data.result.length) {
        throw new Error('No results found for your query');
    }

    return res.data.result;
}

function formatEntry(item) {
    return `‎*_${item.title}_* 🎞️
‎╭───────────────━┈⊷
‎│▸📅 *ʏᴇᴀʀ:* ${item.year || 'Unknown'}
‎│▸📝 *ᴅᴇsᴄʀɪᴘᴛɪᴏɴ:* ${item.description ? item.description.slice(0, 250) + (item.description.length > 250 ? '…' : '') : 'No description available'}
‎│▸🔗 *ᴅᴇᴛᴀɪʟs:* ${item.detailsUrl}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;
}

cmd({
  pattern: "archivemovie",
  alias: ["amovie", "oldmovie"],
  desc: "Search Archive.org for classic/rare movies",
  react: '🎞️',
  category: 'search',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  const query = args.join(" ").trim();

  if (!query) {
    return reply(`🌸 What movie do you want to search on Archive.org?\n\n*Usage Example:*\n.archivemovie <name>\n\n📝 Example: .archivemovie Nidhanaya`);
  }

  await store.react('⌛');

  try {
    reply(`🔎 Searching: *${query}*`);

    const results = await searchArchiveMovie(query);
    const top = results.slice(0, 5);

    for (const item of top) {
      try {
        await conn.sendMessage(from, { text: formatEntry(item) }, { quoted: m });
      } catch (sendErr) {
        console.error(`[ARCHIVEMOVIE] Failed to send entry "${item.title}":`, sendErr.message);
      }
    }

    await store.react('✅');
  } catch (error) {
    console.error("❌ Archive Movie Search Error:", error);
    await store.react('❌');
    reply(`⚠️ Error searching for movie: ${error.message}`);
  }
});
