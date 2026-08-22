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

    // METHOD 1: Direct Delirius / Alternative TikTok Search API
    try {
      const res1 = await axios.get(`https://deliriussapi-oficial.vercel.app/search/tiktok?query=${encodeURIComponent(query)}`, {
        timeout: 20000
      });

      if (res1.data && res1.data.status && res1.data.data && res1.data.data.length > 0) {
        searchResults = res1.data.data.map(v => ({
          title: v.title || 'TikTok Video',
          playUrl: v.meta ? v.meta.media[0].org : (v.no_watermark || v.nowm),
          author: v.author ? v.author.nickname : 'TikTok User',
          views: v.views || 0,
          likes: v.like || 0
        }));
      }
    } catch (e1) {
      console.log("Method 1 API failed, attempting Method 2...");
    }

    // METHOD 2: Siputzx TikTok Search API Backup
    if (searchResults.length === 0) {
      try {
        const res2 = await axios.get(`https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`, {
          timeout: 20000
        });

        if (res2.data && res2.data.status && res2.data.data && res2.data.data.length > 0) {
          searchResults = res2.data.data.map(v => ({
            title: v.title || 'TikTok Video',
            playUrl: v.no_watermark || v.play || v.wm,
            author: v.author ? v.author.nickname : 'TikTok User',
            views: v.play_count || 0,
            likes: v.digg_count || 0
          }));
        }
      } catch (e2) {
        console.log("Method 2 API failed.");
      }
    }

    // Filter array to get valid video URLs
    searchResults = searchResults.filter(item => item.playUrl && item.playUrl.startsWith('http'));

    if (searchResults.length === 0) {
      return reply("❌ Search API blocked by TikTok. Try again after a few seconds or try another query.");
    }

    const firstVideo = searchResults[0];

    const caption = 
      `*🎵 T I K T O K  S E A R C H*\n\n` +
      `*📌 Title:* ${firstVideo.title}\n` +
      `*👤 Author:* ${firstVideo.author}\n\n` +
      `> *© ꜱᴇᴀʀᴄʜᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    // Send Direct Video Buffer stream
    await client.sendMessage(message.chat, {
      video: { url: firstVideo.playUrl },
      caption: caption
    }, { quoted: message });

  } catch (error) {
    console.error("TikTok Search Error:", error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});
