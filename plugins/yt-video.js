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
        if (!q) {
            return reply("❌ Please provide a video name or YouTube link!");
        }

        let videoUrl = q;
        let ytInfo = null;

        const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(q);

        if (!isYT) {
            const searchResults = await yts(q);
            if (!searchResults || !searchResults.videos.length) {
                return reply("❌ No video results found on YouTube!");
            }
            ytInfo = searchResults.videos[0];
            videoUrl = ytInfo.url;
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(videoUrl)}`;
        const { data } = await axios.get(apiUrl, { timeout: 35000 });

        if (!data || !data.status || !data.result || !data.result.video_download) {
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
                caption: caption
            }, { quoted: mek });
        }

        await conn.sendMessage(from, {
            video: { url: res.video_download },
            mimetype: "video/mp4",
            fileName: `${title || 'video'}.mp4`,
            caption: `*${title || 'YouTube Video'}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("Video Command Error:", e.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("❌ An unexpected error occurred while processing your request.");
    }
});
