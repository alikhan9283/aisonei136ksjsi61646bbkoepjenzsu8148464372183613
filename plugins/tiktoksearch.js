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
    // FIX: Safely parse `match` regardless of whether it's String, Array, or Object
    let query = '';
    if (typeof match === 'string') {
      query = match.trim();
    } else if (Array.isArray(match)) {
      query = match.join(' ').trim();
    } else if (match && typeof match === 'object') {
      query = (match.text || match.query || '').trim();
    }

    // Fallback if match parameter is empty: extract text directly from message
    if (!query && message.text) {
      const parts = message.text.split(' ');
      parts.shift(); // Remove command pattern (.ttsearch)
      query = parts.join(' ').trim();
    }

    if (!query) {
      return reply("🍁 Please provide a search term!\n*Example:* `.ttsearch status video`");
    }

    let searchResults = [];

    // PRIMARY LOGIC: tikwm API
    try {
      const res1 = await axios.get(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=10`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      if (res1.data && res1.data.data && res1.data.data.videos && res1.data.data.videos.length > 0) {
        searchResults = res1.data.data.videos.map(v => ({
          title: v.title || 'TikTok Video',
          playUrl: v.play || v.wmplay,
          cover: v.cover,
          author: v.author ? v.author.nickname : 'Unknown',
          views: v.play_count || 0,
          likes: v.digg_count || 0
        }));
      }
    } catch (e1) {
      console.log("Primary TikTok API failed, attempting Backup API 1...");
    }

    // FALLBACK LOGIC 1: Vercel TikTok Downloader API
    if (searchResults.length === 0) {
      try {
        const res2 = await axios.get(`https://tiktok-downloader-api.vercel.app/api/search?q=${encodeURIComponent(query)}&limit=10`, {
          timeout: 15000
        });

        if (res2.data && res2.data.data && res2.data.data.length > 0) {
          searchResults = res2.data.data.map(v => ({
            title: v.title || v.caption || 'TikTok Video',
            playUrl: v.play || v.nowatermark || v.url,
            cover: v.cover,
            author: v.author ? v.author.nickname : 'Unknown',
            views: v.views || 0,
            likes: v.likes || 0
          }));
        }
      } catch (e2) {
        console.log("Backup API 1 failed, attempting Backup API 2...");
      }
    }

    // FALLBACK LOGIC 2: Public Backup Endpoint
    if (searchResults.length === 0) {
      try {
        const res3 = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(query)}`, {
          timeout: 15000
        });

        if (res3.data && res3.data.video && res3.data.video.noWatermark) {
          searchResults.push({
            title: res3.data.title || 'TikTok Video',
            playUrl: res3.data.video.noWatermark,
            cover: res3.data.cover,
            author: res3.data.author ? res3.data.author.name : 'Unknown',
            views: 0,
            likes: 0
          });
        }
      } catch (e3) {
        console.log("All TikTok search APIs failed.");
      }
    }

    if (searchResults.length === 0) {
      throw new Error("No TikTok results found for your search query. Please try different keywords.");
    }

    // Send Top Video Result
    const firstVideo = searchResults[0];

    const caption = 
      `*🎵 T I K T O K  S E A R C H*\n\n` +
      `*📌 Title:* ${firstVideo.title}\n` +
      `*👤 Author:* ${firstVideo.author}\n` +
      `*👁️ Views:* ${formatNumber(firstVideo.views)}\n` +
      `*❤️ Likes:* ${formatNumber(firstVideo.likes)}\n\n` +
      `> *© ꜱᴇᴀʀᴄʜᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍ德 🍸*`;

    // Send Video file
    if (firstVideo.playUrl) {
      await client.sendMessage(message.chat, {
        video: { url: firstVideo.playUrl },
        caption: caption
      }, { quoted: message });
    } else {
      await sendButtons(client, message.chat, {
        title: '',
        text: caption,
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 Watch Online',
              url: firstVideo.playUrl
            })
          }
        ]
      });
    }

  } catch (error) {
    console.error("TikTok Search Error:", error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

function formatNumber(num) {
  if (!num || isNaN(num)) return '0';
  return Number(num).toLocaleString();
}
