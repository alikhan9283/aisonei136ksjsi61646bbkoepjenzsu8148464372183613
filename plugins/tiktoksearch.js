const axios = require("axios");
const { cmd } = require("../command");
const { sendButtons } = require('gifted-btns');

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

    // METHOD 1: TikWM POST Request (Most reliable for search)
    try {
      const params = new URLSearchParams();
      params.append('keywords', query);
      params.append('count', '10');
      params.append('cursor', '0');
      params.append('web', '1');

      const res1 = await axios.post('https://tikwm.com/api/feed/search', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        },
        timeout: 20000
      });

      if (res1.data && res1.data.data && res1.data.data.videos && res1.data.data.videos.length > 0) {
        searchResults = res1.data.data.videos.map(v => ({
          title: v.title || 'TikTok Video',
          playUrl: v.play ? (v.play.startsWith('http') ? v.play : `https://tikwm.com${v.play}`) : '',
          cover: v.cover,
          author: v.author ? v.author.nickname : 'Unknown',
          views: v.play_count || 0,
          likes: v.digg_count || 0
        }));
      }
    } catch (e1) {
      console.log("TikWM POST search failed, trying fallback...");
    }

    // METHOD 2: Direct Search Stream Backup
    if (searchResults.length === 0) {
      try {
        const res2 = await axios.get(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36'
          },
          timeout: 15000
        });

        if (res2.data && res2.data.data && res2.data.data.videos) {
          searchResults = res2.data.data.videos.map(v => ({
            title: v.title || 'TikTok Video',
            playUrl: v.play ? (v.play.startsWith('http') ? v.play : `https://tikwm.com${v.play}`) : '',
            cover: v.cover,
            author: v.author ? v.author.nickname : 'Unknown',
            views: v.play_count || 0,
            likes: v.digg_count || 0
          }));
        }
      } catch (e2) {
        console.log("Secondary API failed.");
      }
    }

    // Filter valid downloadable links
    searchResults = searchResults.filter(item => item.playUrl !== '');

    if (searchResults.length === 0) {
      return reply("❌ Unable to fetch TikTok results right now. Please try again with a different query.");
    }

    const firstVideo = searchResults[0];

    const caption = 
      `*🎵 T I K T O K  S E A R C H*\n\n` +
      `*📌 Title:* ${firstVideo.title}\n` +
      `*👤 Author:* ${firstVideo.author}\n` +
      `*👁️ Views:* ${formatNumber(firstVideo.views)}\n` +
      `*❤️ Likes:* ${formatNumber(firstVideo.likes)}\n\n` +
      `> *© ꜱᴇᴀʀᴄʜᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    // Send Video file directly
    await client.sendMessage(message.chat, {
      video: { url: firstVideo.playUrl },
      caption: caption
    }, { quoted: message });

  } catch (error) {
    console.error("TikTok Search Error:", error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

function formatNumber(num) {
  if (!num || isNaN(num)) return '0';
  return Number(num).toLocaleString();
}
