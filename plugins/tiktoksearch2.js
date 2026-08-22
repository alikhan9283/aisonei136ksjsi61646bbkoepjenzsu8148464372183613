const axios = require("axios");
const { cmd } = require("../command");

cmd({
  'pattern': "tiktoksearch2",
  'alias': ["ttsearch2", "tiktoksrch2"],
  'react': '🔎',
  'desc': "Search TikTok videos by keyword (alternate providers)",
  'category': "search",
  'use': ".tiktoksearch2 <query>",
  'filename': __filename
}, async (client, message, match, { reply, args }) => {
  try {
    const query = args.join(" ") || match;

    if (!query) {
      return reply("🍁 Please provide a search query.\n\n*Example:* .tiktoksearch2 funny cats");
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

// Alternate provider list — completely separate from tiktoksearch.js
// so that if one command's providers all go down, the other command
// (with its own different providers) can still work independently.
async function searchWithFallback(query) {
  const providers = [
    {
      name: "Nirkyy",
      url: `https://api.nirkyy.eu.org/search/tiktok?q=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.result || data?.data || [];
        return list.map(v => ({
          title: v.title || v.description || "Untitled",
          author: v.author || v.nickname,
          url: v.video || v.url
        }));
      }
    },
    {
      name: "Zenzxz",
      url: `https://api.zenzxz.my.id/search/tiktok?query=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.result || data?.data || [];
        return list.map(v => ({
          title: v.title || v.desc || "Untitled",
          author: v.author?.nickname || v.username,
          url: v.url || v.video_url
        }));
      }
    },
    {
      name: "Zenkey",
      url: `https://zenkey.my.id/api/search/tiktok?q=${encodeURIComponent(query)}`,
      parse: (data) => {
        const list = data?.result || data?.data || [];
        return list.map(v => ({
          title: v.title || v.desc || "Untitled",
          author: v.author,
          url: v.url || v.play
        }));
      }
    },
    {
      name: "Xteam",
      url: `https://api.xteam.xyz/search/tiktok?query=${encodeURIComponent(query)}`,
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
