const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

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
                   `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ* 👑`;

        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        const apiRes = await axios.get(`https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 30000 });

        if (!apiRes.data?.status || !apiRes.data?.result?.video_download) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Could not fetch video download link. Try again later.");
        }

        const videoUrl = apiRes.data.result.video_download;

        const videoBuffer = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        await conn.sendMessage(from, {
            video: Buffer.from(videoBuffer.data),
            mimetype: "video/mp4",
            caption: `*${data.title}*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ* 👑`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
    }
});
