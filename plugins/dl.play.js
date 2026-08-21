const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function isYoutubeLink(text) {
  return /(youtube\.com|youtu\.be)/.test(text);
}

// Single API - adeel-xtech only
async function downloadAudio(videoUrl) {
  const apiUrl = `https://adeel-xtech-apis.vercel.app/api/ytmp3?url=${encodeURIComponent(videoUrl)}`;

  // Step 1: get metadata + stream link
  const { data } = await axios.get(apiUrl, { timeout: 25000 });

  if (!data?.status || !data?.result?.audio_download) {
    throw new Error('API_NO_RESULT: ' + JSON.stringify(data));
  }

  const meta = {
    title: data.result.title,
    duration: data.result.duration,
    quality: data.result.quality,
    thumbnail: data.result.thumbnail,
    creator: data.creator
  };

  let streamUrl = data.result.audio_download;

  // Step 2: download actual audio, try as-is first, then force https as fallback
  const attempts = [streamUrl];
  if (streamUrl.startsWith('http://')) {
    attempts.push(streamUrl.replace('http://', 'https://'));
  }

  let lastErr;
  for (const url of attempts) {
    try {
      const audioRes = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxRedirects: 10,
        validateStatus: (status) => status < 500,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': '*/*'
        }
      });

      if (audioRes.status >= 400) {
        lastErr = new Error(`Stream returned ${audioRes.status}`);
        continue;
      }

      if (!audioRes?.data || audioRes.data.length === 0) {
        lastErr = new Error('AUDIO_BUFFER_EMPTY');
        continue;
      }

      return { buffer: Buffer.from(audioRes.data), meta };

    } catch (err) {
      lastErr = err;
      continue;
    }
  }

  throw lastErr || new Error('STREAM_DOWNLOAD_FAILED');
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
            vid = videoId ? await yts({ videoId }) : (await yts(q)).all[0];
          } catch (e) {
            vid = null;
          }
          if (!vid) {
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

        if (vid.thumbnail) {
          await conn.sendMessage(from, { image: { url: vid.thumbnail }, caption }, { quoted: mek });
        } else {
          await reply(caption);
        }

        try {
          const result = await downloadAudio(vid.url);

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

        } catch (downloadErr) {
          console.log(`[${pattern}] downloadAudio error:`, downloadErr.message);
          await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
          await reply(`❌ Failed to download audio.\n\n*Reason:* ${downloadErr.message}`);
        }

      } catch (error) {
        console.log(`[${pattern}] Error:`, error);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        await reply("❌ An error occurred while processing your request. Please try again.");
      }
    }
  );
});
