const axios = require("axios");
const { cmd } = require("../command");

cmd({
  'pattern': "tiktoksearch2",
  'alias': ["ttsearch2", "tiktoksrch2"],
  'react': '🔎',
  'desc': "Search TikTok videos by keyword (alternate source)",
  'category': "search",
  'use': ".tiktoksearch2 <query>",
  'filename': __filename
}, async (client, message, match, { reply, args }) => {
  try {
    const query = (args && args.length ? args.join(" ") : match || "").trim();

    if (!query) {
      return reply("🍁 Please provide a search query.\n\n*Example:* .tiktoksearch2 funny cats");
    }

    const res = await axios.get('https://www.tikwm.com/api/feed/search', {
      params: {
        keywords: query,
        count: 12,
        cursor: 0,
        region: 'US',
        sort_type: 0,
        publish_time: 0
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tikwm.com/',
        'Origin': 'https://www.tikwm.com',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty'
      },
      timeout: 25000
    });

    const data = res.data;

    if (!data || data.code !== 0 || !data.data || !data.data.videos || data.data.videos.length === 0) {
      return reply(`❌ No results found for *${query}*`);
    }

    const videos = data.data.videos;

    let text = `*🎵 TikTok Search Results (Alt)*\n`;
    text += `*Query:* ${query}\n\n`;

    videos.slice(0, 10).forEach((v, i) => {
      const title = v.title || "Untitled";
      const author = v.author?.nickname || v.author?.unique_id || "Unknown";
      const plays = v.play_count ? `▶ ${formatCount(v.play_count)}` : "";
      const playUrl = v.play || v.hdplay || v.wmplay || "";

      text += `*${i + 1}.* ${title}\n`;
      text += `   👤 ${author}${plays ? `  ${plays}` : ""}\n`;
      if (playUrl) text += `   🔗 ${playUrl}\n`;
      text += `\n`;
    });

    text += `> *© ᴜᴘʟᴏᴀᴅᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    await reply(text);

  } catch (error) {
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
