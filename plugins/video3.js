const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

cmd({
    pattern: "ytmp4",
    alias: ["video3", "ytvideo3"],
    react: "🎬",
    desc: "Download YouTube video by name or link",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        const query = q ? q.trim() : "";
        if (!query) {
            return reply("❌ Please provide a video name or YouTube link.\n📝 Usage: .ytmp4 <name or link>");
        }

        await conn.sendMessage(from, { react: { text: '🎬', key: mek.key } });

        // Resolve the query into a proper video (title, thumbnail, url) whether
        // the user gave a search term or a direct YouTube link
        let video;
        const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query);

        if (isYT) {
            let videoId = '';
            try {
                const urlObj = new URL(query);
                videoId = urlObj.hostname.includes('youtu.be') ? urlObj.pathname.slice(1) : urlObj.searchParams.get('v');
            } catch {
                videoId = query.split('/').pop().split('?')[0];
            }
            if (!videoId) return reply("❌ Invalid YouTube link.");

            try {
                const search = await yts({ videoId });
                if (search) video = search;
            } catch (e) { console.log('[YTMP4 yts byId] failed:', e.message); }

            if (!video) {
                video = {
                    title: 'YouTube Video',
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    timestamp: 'N/A',
                    views: 0,
                    author: { name: 'Unknown' }
                };
            }
        } else {
            const search = await yts(query);
            if (!search.videos?.length) return reply("❌ No video results found.");
            video = search.videos[0];
        }

        const infoCaption =
            `\`${video.title}\`\n\n` +
            `🎥 *Channel:* ${video.author?.name || 'Unknown'}\n` +
            `👁️ *Views:* ${(video.views || 0).toLocaleString?.() || video.views || 0}\n` +
            `⏳ *Duration:* ${video.timestamp || video.duration?.timestamp || 'N/A'}\n\n` +
            `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: infoCaption
        }, { quoted: mek });

        // Fetch the real, playable download link from the API
        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(video.url)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        if (!data || !data.status || !data.result || !data.result.video_download) {
            return reply("❌ Failed to fetch YouTube video from the API. Try again or use a different link.");
        }

        const { video_download, title, quality } = data.result;

        const videoCaption =
            `\`${title || video.title}\`\n\n` +
            `🎚️ *Quality:* ${quality || 'Unknown'}\n\n` +
            `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        await conn.sendMessage(from, {
            video: { url: video_download },
            mimetype: "video/mp4",
            caption: videoCaption,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363407310860031@newsletter',
                    newsletterName: "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error("❌ YTMP4 Error:", error);
        reply(`⚠️ Error downloading YouTube video: ${error.message}`);
    }
});
