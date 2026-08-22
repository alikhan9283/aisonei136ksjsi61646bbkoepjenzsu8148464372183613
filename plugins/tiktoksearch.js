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
    const query = (args && args.length ? args.join(" ") : match || "").trim();

    if (!query) {
      return reply("🍁 Please provide a search query.\n\n*Example:* .tiktoksearch funny cats");
    }

    const res = await axios.get('https://tikwm.com/api/feed/search', {
      params: { keywords: query, count: 10, cursor: 0 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://tikwm.com/'
      },
      timeout: 25000
    });

    const data = res.data;

    if (!data || data.code !== 0 || !data.data || !data.data.videos || data.data.videos.length === 0) {
      return reply(`❌ No results found for *${query}*`);
    }

    const videos = data.data.videos;
    let text = `*🎵 TikTok Search Results*\n*Query:* ${query}\n\n`;

    videos.slice(0, 10).forEach((v, i) => {
      const title = v.title || "Untitled";
      const author = v.author?.nickname || v.author?.unique_id || "Unknown";
      const playUrl = v.play || v.hdplay || v.wmplay || "";
      const duration = v.duration ? `${v.duration}s` : "";

      text += `*${i + 1}.* ${title}\n`;
      text += `   👤 ${author}${duration ? `  ⏱ ${duration}` : ""}\n`;
      if (playUrl) text += `   🔗 ${playUrl}\n\n`;
    });

    text += `> *© ᴜᴘʟᴏᴀᴅᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    await reply(text);

  } catch (error) {
    console.error("tiktoksearch error:", error.response?.status || error.message);
    await reply(`❌ Error: ${error.message || error}`);
  }
});
