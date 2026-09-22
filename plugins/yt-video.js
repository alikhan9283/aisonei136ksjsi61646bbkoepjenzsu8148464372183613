const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

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

        const { data } = await axios.get(
            `https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(videoUrl)}`,
            { timeout: 35000 }
        );

        if (!data?.status || !data?.result?.video_download) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Failed to fetch video from server. Please try again later.");
        }

        const res = data.result;
        const title = ytInfo ? ytInfo.title : res.title;
        const author = ytInfo ? ytInfo.author.name : res.author;
        const duration = ytInfo ? ytInfo.timestamp : res.duration;
        const thumbnail = ytInfo ? ytInfo.thumbnail : res.thumbnail;

        const caption =
`🎬 *${title || 'YouTube Video'}*\n\n` +
`👤 *Channel:* ${author || 'YouTube'}\n` +
`⏱ *Duration:* ${duration || 'N/A'}\n\n` +
`> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`;

        if (thumbnail) {
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption
            }, { quoted: mek });
        }

        // Browser wali working link se file download karke WhatsApp ko buffer bhejo
        const file = await axios.get(res.video_download, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            }
        });

        await conn.sendMessage(from, {
            video: Buffer.from(file.data),
            mimetype: 'video/mp4',
            fileName: `${title || 'video'}.mp4`,
            caption: `*${title || 'YouTube Video'}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error('Video Command Error:', e.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("❌ An unexpected error occurred while processing your request.");
    }
});
