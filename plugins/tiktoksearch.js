const axios = require("axios");
const { cmd } = require("../command");

cmd({
  'pattern': "ttsearch",
  'alias': ["tiktoksearch", "tiktoks", "tts"],
  'react': '🎵',
  'desc': "Search videos on TikTok",
  'category': "media",
  'use': ".ttsearch [search query]",
  'filename': __filename
}, async (client, message, match, { reply }) => {
  try {
    let query = '';
    if (typeof match === 'string') {
      query = match.trim();
    } else if (Array.isArray(match)) {
      query = match.join(' ').trim();
    } else if (match && typeof match === 'object') {
      query = (match.text || match.query || '').trim();
    }

    if (!query && message.text) {
      const parts = message.text.split(' ');
      parts.shift();
      query = parts.join(' ').trim();
    }

    if (!query) {
      return reply("🍁 Please provide a search term!\n*Example:* `.ttsearch status video`");
    }

    let searchResults = [];

    // API METHOD 1: Widipe / Ayu-Tech TikTok API
    try {
      const res1 = await axios.get(`https://widipe.com/tiktoksearch?query=${encodeURIComponent(query)}`, {
        timeout: 15000
      });

      if (res1.data && res1.data.status && res1.data.result) {
        const items = Array.isArray(res1.data.result) ? res1.data.result : (res1.data.result.videos || []);
        searchResults = items.map(v => ({
          title: v.title || v.caption || 'TikTok Video',
          playUrl: v.play || v.no_watermark || v.wm || v.nowm,
          author: v.author ? (v.author.nickname || v.author.unique_id) : 'TikTok User'
        }));
      }
    } catch (e1) {
      console.log("Widipe API failed, trying method 2...");
    }

    // API METHOD 2: BK9 Active TikTok API
    if (searchResults.length === 0) {
      try {
        const res2 = await axios.get(`https://bk9.fun/search/tiktok?q=${encodeURIComponent(query)}`, {
          timeout: 15000
        });

        if (res2.data && res2.data.status && res2.data.BK9) {
          searchResults = res2.data.BK9.map(v => ({
            title: v.title || 'TikTok Video',
            playUrl: v.nowm || v.wm,
            author: v.author ? v.author.nickname : 'TikTok User'
          }));
        }
      } catch (e2) {
        console.log("BK9 API failed.");
      }
    }

    // Filter out invalid URLs
    searchResults = searchResults.filter(item => item.playUrl && item.playUrl.startsWith('http'));

    if (searchResults.length === 0) {
      return reply("❌ All TikTok search servers are currently down. Please try again after some time.");
    }

    const firstVideo = searchResults[0];

    const caption = 
      `*🎵 T I K T O K  S E A R C H*\n\n` +
      `*📌 Title:* ${firstVideo.title}\n` +
      `*👤 Author:* ${firstVideo.author}\n\n` +
      `> *© ꜱᴇᴀʀᴄʜᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    // Send Video
    await client.sendMessage(message.chat, {
      video: { url: firstVideo.playUrl },
      caption: caption
    }, { quoted: message });

  } catch (error) {
    console.error("TikTok Search Error:", error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});
