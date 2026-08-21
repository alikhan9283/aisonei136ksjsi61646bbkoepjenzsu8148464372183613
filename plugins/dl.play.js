const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

// Extract YouTube video ID from various URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYoutubeLink(text) {
  return /(youtube\.com|youtu\.be)/.test(text);
}

// Single API - adeel-xtech (only source, no fallback)
async function downloadAudio(videoUrl) {
  try {
    const apiUrl = `https://adeel-xtech-apis.vercel.app/api/ytmp3?url=${encodeURIComponent(videoUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (!data?.status || !data?.result?.audio_download) {
      return null;
    }

    const meta = {
      title: data.result.title,
      duration: data.result.duration,
      quality: data.result.quality,
      thumbnail: data.result.thumbnail,
      creator: data.creator
    };

    // Download actual audio buffer from the resolved link
    const audioRes = await axios.get(data.result.audio_download, {
      responseType: 'arraybuffer',
      timeout: 60000
    });

    if (!audioRes?.data) return null;

    return {
      buffer: Buffer.from(audioRes.data),
      meta
    };
  } catch (err) {
    console.log(`[downloadAudio] adeel-xtech failed: ${err.message}`);
    return null;
  }
}

const commands = ["play", "song", "mp3"];

commands.forEach((pattern) => {
  cmd(
    {
      pattern,
      desc: "Download and send audio from YouTube (search or link)",
      category: "download",
      react: "🎵",
      filename: __filename
    },
    async (conn, mek, m, { from, q, reply }) => {
      try {
        if (!q || !q.trim()) {
          return reply(`❓ Please provide a song name or YouTube link.\nExample: *.${pattern} judaai maar deti hai*`);
        }

        let vid;

        if (isYoutubeLink(q)) {
          const videoId = extractVideoId(q);
          try {
            const searchResult = videoId
              ? await yts({ videoId })
              : (await yts(q)).all[0];
            vid = searchResult;
          } catch (e) {
            vid = null;
          }

          if (!vid) {
            // Fallback minimal vid object if yts lookup fails
            vid = {
              title: "Unknown Title",
              url: q,
              timestamp: "N/A",
              views: 0,
              author: { name: "Unknown" },
              thumbnail: ""
            };
          }
        } else {
          const searchResults = await yts(q);
          vid = searchResults?.all?.[0];
          if (!vid) {
            return reply(`❌ No results found for *${q}*`);
          }
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const caption =
          `🎵 *${vid.title}*\n\n` +
          `👤 *Channel:* ${vid.author?.name || "Unknown"}\n` +
          `⏱️ *Duration:* ${vid.timestamp || "N/A"}\n` +
          `👁️ *Views:* ${vid.views ? vid.views.toLocaleString() : "N/A"}\n` +
          `🔗 *Link:* ${vid.url}\n\n` +
          `> Downloading audio, please wait...`;

        const thumb = vid.thumbnail;
        if (thumb) {
          await conn.sendMessage(
            from,
            { image: { url: thumb }, caption },
            { quoted: mek }
          );
        } else {
          await reply(caption);
        }

        const result = await downloadAudio(vid.url);

        if (result?.buffer) {
          await conn.sendMessage(
            from,
            {
              audio: result.buffer,
              mimetype: "audio/mpeg",
              fileName: `${(result.meta?.title || vid.title || "audio").slice(0, 60)}.mp3`,
              ptt: false
            },
            { quoted: mek }
          );
          await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        } else {
          await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
          await reply("❌ Failed to download audio. All sources are currently unavailable, please try again later.");
        }
      } catch (error) {
        console.log(`[${pattern}] Error:`, error);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        await reply("❌ An error occurred while processing your request. Please try again.");
      }
    }
  );
});
