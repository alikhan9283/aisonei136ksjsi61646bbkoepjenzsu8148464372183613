const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

cmd({
    pattern: "video",
    alias: ["mp4", "ytmp4"],
    react: "🎬",
    desc: "Download video from YouTube",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply("⚠️ Please provide a video name or YouTube link!");

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        let search = await yts(q);
        let data = search.videos[0];

        if (!data) return reply("❌ No video found!");

        let url = data.url;

        let desc = `🎬 *ADEEL-MD VIDEO DOWNLOADER* 🎬\n\n` +
                   `🎵 *Title:* ${data.title}\n` +
                   `⏱️ *Duration:* ${data.timestamp}\n` +
                   `👁️ *Views:* ${data.views}\n` +
                   `👤 *Author:* ${data.author.name}\n` +
                   `🔗 *URL:* ${data.url}\n\n` +
                   `> *ᴘᴏᴡᴇʀᴇ🇩 ʙʏ ᴀᴅᴇᴇ🇱-ᴍ🇩* 👑`;

        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        const apiRes = await axios.get(`https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 30000 });

        if (!apiRes.data?.status || !apiRes.data?.result?.video_download) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Could not fetch video download link. Try again later.");
        }

        const videoUrl = apiRes.data.result.video_download;
        const tempFilePath = path.join(__dirname, `../temp/${Date.now()}.mp4`);

        const tempDir = path.dirname(tempFilePath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn(ffmpegPath, [
                '-y',
                '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n',
                '-i', videoUrl,
                '-c', 'copy',
                tempFilePath
            ]);

            ffmpeg.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`FFmpeg exited with code ${code}`));
            });

            ffmpeg.on('error', (err) => reject(err));
        });

        await conn.sendMessage(from, {
            video: fs.readFileSync(tempFilePath),
            mimetype: "video/mp4",
            caption: `🎬 *ADEEL-MD VIDEO DOWNLOADER* 🎬\n\n🎵 *Title:* ${data.title}\n\n> *ᴘᴏᴡᴇʀᴇ🇩 ʙʏ ᴀᴅᴇᴇ🇱-ᴍ🇩* 👑`
        }, { quoted: mek });

        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
    }
});
