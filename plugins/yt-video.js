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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxRedirects: 10,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': '*/*'
    }
  });
  if (!res?.data || res.data.length === 0) {
    throw new Error('EMPTY_BUFFER');
  }
  return Buffer.from(res.data);
}

// Single API - adeel-xtech only, with retry on the video download step
async function downloadVideo(videoUrl) {
  const apiUrl = `https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(videoUrl)}`;

  // Step 1: get metadata + download link (retry too, in case this call itself fails)
  let data;
  let lastMetaErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(apiUrl, { timeout: 25000 });
      data = res.data;
      break;
    } catch (err) {
      lastMetaErr = err;
      await sleep(1500);
    }
  }

  if (!data) {
    throw new Error(`API_UNREACHABLE: ${lastMetaErr?.message || 'unknown'}`);
  }

  if (!data?.status || !data?.result?.video_download) {
    throw new Error('API_NO_RESULT: ' + JSON.stringify(data));
  }

  const meta = {
    title: data.result.title,
    duration: data.result.duration,
    author: data.result.author,
    quality: data.result.quality,
    thumbnail: data.result.thumbnail,
    creator: data.creator
  };

  const downloadUrl = data.result.video_download;

  // Step 2: download actual video - retry up to 3 times with delay
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buffer = await fetchBuffer(downloadUrl);
      return { buffer, meta };
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await sleep(2000 * attempt); // 2s, then 4s
    }
  }

  throw lastErr || new Error('VIDEO_DOWNLOAD_FAILED');
}

const commands = ["video", "ytmp4", "yta"];

commands.forEach((pattern) => {
  cmd(
    {
      pattern,
      desc: "Download and send video from YouTube (search or link)",
      category: "download",
      react: "🎬",
      filename: __filename
    },
    async (conn, mek, m, { from, q, reply }) => {
      try {
        if (!q || !q.trim()) {
          return reply(`❓ Please provide a video name or YouTube link.\nExample: *.${pattern} judaai maar deti hai*`);
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
          `🎬 *${vid.title}*\n\n` +
          `👤 *Channel:* ${vid.author?.name || "Unknown"}\n` +
          `⏱️ *Duration:* ${vid.timestamp || "N/A"}\n` +
          `👁️ *Views:* ${vid.views ? vid.views.toLocaleString() : "N/A"}\n\n` +
          `> Downloading video, please wait...\n\n` +
          `_Powered by SARWAR MD_`;

        if (vid.thumbnail) {
          await conn.sendMessage(from, { image: { url: vid.thumbnail }, caption }, { quoted: mek });
        } else {
          await reply(caption);
        }

        try {
          const result = await downloadVideo(vid.url);

          await conn.sendMessage(
            from,
            {
              video: result.buffer,
              mimetype: "video/mp4",
              caption: `🎬 *${result.meta?.title || vid.title}*\n\n_Powered by SARWAR MD_`,
              fileName: `${(result.meta?.title || vid.title || "video").slice(0, 60)}.mp4`
            },
            { quoted: mek }
          );
          await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (downloadErr) {
          console.log(`[${pattern}] downloadVideo error:`, downloadErr.message);
          await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
          await reply(`❌ Failed to download video.\n\n*Reason:* ${downloadErr.message}\n\n_Please try again in a moment._`);
        }

      } catch (error) {
        console.log(`[${pattern}] Error:`, error);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        await reply("❌ An error occurred while processing your request. Please try again.");
      }
    }
  );
});
