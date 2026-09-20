const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const YT_API_BASE = "https://xjawadtech.vercel.app";

const FOOTER = `‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:shorts\/|[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}

function isYoutubeUrl(str) {
    return /(?:youtube\.com|youtu\.be)/i.test(str);
}

// Same 4-API fallback pattern used in video.js / play2.js — these APIs
// serve YouTube Shorts the same way as regular videos since Shorts are
// just normal videos under the hood with a shorts/ URL path.
async function downloadYoutubeVideo(url) {
    const videoAPIs = [
        `${YT_API_BASE}/ytv1?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/ytv2?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/ytv3?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/ytv4?url=${encodeURIComponent(url)}`
    ];
    let lastError = null;
    for (const apiUrl of videoAPIs) {
        try {
            const res = await axios.get(apiUrl, { timeout: 15000 });
            const videoUrl = res.data?.status && res.data?.download?.url ? res.data.download.url : null;
            if (videoUrl) return videoUrl;
        } catch (e) {
            lastError = e;
            continue;
        }
    }
    if (lastError) console.error('[YTSHORT] All sources failed. Last error:', lastError.message);
    throw new Error('All YouTube Shorts download sources failed');
}

cmd({
    pattern: "ytshort",
    alias: ["short", "shorts", "ytshorts"],
    desc: "Download a YouTube Shorts video",
    category: "download",
    react: "📱",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    const input = args.join(" ").trim();

    if (!input) {
        return reply(`🌸 Please provide a YouTube Shorts link or name.\n\n*Usage Example:*\n.ytshort <shorts link / name>\n\n📝 Example: .ytshort https://youtube.com/shorts/xxxxxxxxxxx`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let url = input;
        let vid = null;

        if (input.startsWith('http://') || input.startsWith('https://')) {
            if (!isYoutubeUrl(input)) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ Please provide a valid YouTube Shorts URL!');
            }
            const videoId = getVideoId(input);
            if (!videoId) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ Invalid YouTube Shorts URL!');
            }
            vid = await yts({ videoId });
        } else {
            const search = await yts(input);
            if (!search.videos || !search.videos.length) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ No results found!');
            }
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('❌ No results found!');
        }

        const caption = `‎*_ʏᴏᴜᴛᴜʙᴇ sʜᴏʀᴛs_* 📱
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${vid.title}
‎│▸👤 *ᴄʜᴀɴɴᴇʟ:* ${vid.author?.name || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${vid.timestamp}
‎│▸👁️ *ᴠɪᴇᴡs:* ${vid.views?.toLocaleString() || 'N/A'}
‎╰───────────────━┈⊷
${FOOTER}`;

        const videoUrl = await downloadYoutubeVideo(url);

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error("❌ YTShort Error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`⚠️ Error downloading YouTube Shorts: ${error.message}`);
    }
});
