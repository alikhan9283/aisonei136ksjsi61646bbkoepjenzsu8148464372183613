const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

async function fetchYtmp4(videoUrl) {
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    try {
      const { data, status } = await axios.get(
        'https://adeel-xtech-apis.vercel.app/api/ytmp4',
        {
          params: { url: videoUrl },
          timeout: 45000,
          validateStatus: () => true
        }
      );

      if (status === 200 && data?.status && data?.result?.video_download) {
        return data;
      }
      lastErr = data?.message || `HTTP ${status}`;
    } catch (e) {
      lastErr = e.message;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(lastErr || 'API failed');
}

cmd({
    pattern: "video",
    alias: ["mp4"],
    desc: "Download YouTube video via Adeel-Xtech API",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Please provide a video name or YouTube link!");

        let videoUrl = q;
        let ytInfo = null;
        const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(q);

        if (!isYT) {
            const searchResults = await yts(q);
            if (!searchResults?.videos?.length) {
                return reply("❌ No video results found on YouTube!");
            }
            ytInfo = searchResults.videos[0];
            videoUrl = ytInfo.url;
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const data = await fetchYtmp4(videoUrl);
        const res = data.result;

        const title = (ytInfo ? ytInfo.title : res.title) || 'YouTube Video';
        const author = (ytInfo ? ytInfo.author?.name : res.author) || 'YouTube';
        const duration = (ytInfo ? ytInfo.timestamp : res.duration) || 'N/A';
        const thumbnail = ytInfo ? ytInfo.thumbnail : res.thumbnail;

        const caption =
`🎬 *${title}*\n\n` +
`👤 *Channel:* ${author}\n` +
`⏱ *Duration:* ${duration}\n\n` +
`> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`;

        if (thumbnail) {
            try {
                await conn.sendMessage(from, { image: { url: thumbnail }, caption }, { quoted: mek });
            } catch (_) {}
        }

        // buffer download
        let buffer = null;
        try {
            const file = await axios.get(res.video_download, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.youtube.com/'
                }
            });
            buffer = Buffer.from(file.data);
        } catch (e) {
            console.log('Buffer fail:', e.message);
        }

        if (buffer && buffer.length > 1000) {
            await conn.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                caption: `*${title}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: { url: res.video_download },
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                caption: `*${title}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error('Video Command Error:', e.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ ${e.message}`);
    }
});
