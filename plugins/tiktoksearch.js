const axios = require("axios");
const { cmd } = require("../command");

cmd({
  'pattern': "tiktoksearch",
  'alias': ["ttsearch", "tiktoksrch"],
  'react': '🔎',
  'desc': "Search TikTok videos by keyword",
  'category': "search",
  'use': ".tiktoksearch <query>",
  'filename': __filename
}, async (client, message, match, { reply, args }) => {
  try {
    const query = args.join(" ") || match;

    if (!query) {
      return reply("🍁 Please provide a search query.\n\n*Example:* .tiktoksearch funny cats");
    }

    const result = await searchWithFallback(query);

    if (!result) {
      return reply("❌ No results found or all providers are currently down. Please try again later.");
    }

    const { source, items } = result;

    if (!items || items.length === 0) {
      return reply(`❌ No results found for *${query}*`);
    }

    let text = `*🎵 TikTok Search Results*\n`;
    text += `*Query:* ${query}\n`;
    text += `*Source:* ${source}\n\n`;

    items.slice(0, 10).forEach((item, i) => {
      text += `*${i + 1}.* ${item.title}\n`;
      if (item.author) text += `   👤 ${item.author}\n`;
      if (item.url) text += `   🔗 ${item.url}\n`;
      text += `\n`;
    });

    text += `> *© ᴜᴘʟᴏᴀᴅᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    await reply(text);

  } catch (error) {
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

// Tries a list of free public API providers in order.
// Each provider has its own response shape, so each has its own parser.
// The first provider that returns a usable result wins.
async function searchWithFallback(query) {
  const providers = [
    {
      name: "Vreden",
      url: `https://api.vreden.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.result || data?.data || [];
        return list.map(v => ({
          title: v.title || v.desc || "Untitled",
          author: v.author?.nickname || v.author?.username || v.username,
          url: v.url || v.play || v.video_url
        }));
      }
    },
    {
      name: "Siputzx",
      url: `https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.data || data?.result || [];
        return list.map(v => ({
          title: v.title || v.desc || "Untitled",
          author: v.author?.nickname || v.username,
          url: v.url || v.video?.playAddr
        }));
      }
    },
    {
      name: "Ryzendesu",
      url: `https://api.ryzendesu.vip/api/search/tiktok?query=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.result || data?.data || [];
        return list.map(v => ({
          title: v.title || v.desc || "Untitled",
          author: v.author,
          url: v.url || v.link
        }));
      }
    },
    {
      name: "Ferdev",
      url: `https://api.ferdev.my.id/tiktok/search?text=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.result || data?.data || [];
        return list.map(v => ({
          title: v.title || v.desc || "Untitled",
          author: v.author?.nickname || v.username,
          url: v.url || v.play
        }));
      }
    }
  ];

  for (const provider of providers) {
    try {
      const res = await axios.get(provider.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 20000
      });

      if (!res.data) continue;

      const items = provider.parse(res.data);

      if (items && items.length > 0) {
        return { source: provider.name, items };
      }
    } catch (e) {
      console.error(`${provider.name} failed:`, e.response?.status || e.message);
      continue;
    }
  }

  return null;
}
