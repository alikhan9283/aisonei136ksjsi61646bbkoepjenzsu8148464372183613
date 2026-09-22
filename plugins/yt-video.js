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

        // 1) API call
        let data;
        try {
            const res = await axios.get(
                `https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(videoUrl)}`,
                { timeout: 40000 }
            );
            data = res.data;
        } catch (apiErr) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ API error: ${apiErr.message}`);
        }

        if (!data?.status || !data?.result?.video_download) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ API failed: ${data?.message || 'No video_download link'}`);
        }

        const res = data.result;
        const title = (ytInfo ? ytInfo.title : res.title) || 'YouTube Video';
        const author = (ytInfo ? ytInfo.author?.name : res.author) || 'YouTube';
        const duration = (ytInfo ? ytInfo.timestamp : res.duration) || 'N/A';
        const thumbnail = ytInfo ? ytInfo.thumbnail : res.thumbnail;
        const downUrl = res.video_download;

        const caption =
`🎬 *${title}*\n\n` +
`👤 *Channel:* ${author}\n` +
`⏱ *Duration:* ${duration}\n\n` +
`> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`;

        if (thumbnail) {
            try {
                await conn.sendMessage(from, {
                    image: { url: thumbnail },
                    caption
                }, { quoted: mek });
            } catch (_) {}
        }

        // 2) File download (buffer)
        let buffer = null;
        try {
            const file = await axios.get(downUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    'Referer': 'https://www.youtube.com/'
                }
            });
            buffer = Buffer.from(file.data);
        } catch (dlErr) {
            console.log('Buffer download failed:', dlErr.message);
        }

        // 3) Send video
        try {
            if (buffer && buffer.length > 1000) {
                await conn.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${title}.mp4`,
                    caption: `*${title}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
                }, { quoted: mek });
            } else {
                // fallback: direct URL
                await conn.sendMessage(from, {
                    video: { url: downUrl },
                    mimetype: 'video/mp4',
                    fileName: `${title}.mp4`,
                    caption: `*${title}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
                }, { quoted: mek });
            }
        } catch (sendErr) {
            // last fallback: document
            try {
                if (buffer && buffer.length > 1000) {
                    await conn.sendMessage(from, {
                        document: buffer,
                        mimetype: 'video/mp4',
                        fileName: `${title}.mp4`
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        document: { url: downUrl },
                        mimetype: 'video/mp4',
                        fileName: `${title}.mp4`
                    }, { quoted: mek });
                }
            } catch (docErr) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply(`❌ Send failed:\nBuffer: ${buffer ? 'yes' : 'no'}\nError: ${sendErr.message}`);
            }
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error('Video Command Error:', e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ Error: ${e.message}`);
    }
});
