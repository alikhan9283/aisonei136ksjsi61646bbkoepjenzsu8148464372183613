const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const API_BASE = "https://xjawadtech.vercel.app";

// Helper to extract YouTube video ID
function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}

// ============================================
// COMMAND: play2 (Audio Only) - With Fallback
// ============================================
cmd({
    pattern: "play2",
    alias: ["song2", "music2", "audio2"],
    desc: "Download YouTube audio (alt)",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const text = args.join(" ").trim();
        if (!text) return reply("❌ Please provide song name\nExample: .play2 Shape of You");

        let url = text;
        let vid = null;

        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            const searchFromUrl = await yts({ videoId: videoId });
            vid = searchFromUrl;
        } else {
            const search = await yts(text);
            if (!search.videos || !search.videos.length) {
                return reply("❌ No song found!");
            }
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) return reply("❌ No results found!");

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `‎*_ʏᴏᴜᴛᴜʙᴇ ᴀᴜᴅɪᴏ ʀᴇsᴜʟᴛ_* 🎧
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${vid.title}
‎│▸👤 *ᴀᴜᴛʜᴏʀ:* ${vid.author?.name || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${vid.timestamp}
‎│▸👁️ *ᴠɪᴇᴡs:* ${vid.views?.toLocaleString() || 'N/A'}
‎│▸📥 *sᴛᴀᴛᴜs:* Downloading...
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`
        }, { quoted: mek });

        let audioUrl = null;
        let success = false;

        const audioAPIs = [
            `${API_BASE}/yta6?url=${encodeURIComponent(url)}`,
            `${API_BASE}/yta7?url=${encodeURIComponent(url)}`,
            `${API_BASE}/yta1?url=${encodeURIComponent(url)}`,
            `${API_BASE}/yta2?url=${encodeURIComponent(url)}`,
            `${API_BASE}/yta3?url=${encodeURIComponent(url)}`,
            `${API_BASE}/yta4?url=${encodeURIComponent(url)}`,
            `${API_BASE}/yta5?url=${encodeURIComponent(url)}`
        ];

        for (const apiUrl of audioAPIs) {
            if (!success) {
                try {
                    const response = await axios.get(apiUrl, { timeout: 15000 });
                    audioUrl = response.data?.status && response.data?.download?.url ? response.data.download.url : null;
                    if (audioUrl) {
                        await conn.sendMessage(from, {
                            audio: { url: audioUrl },
                            mimetype: "audio/mpeg",
                            fileName: `${vid.title}.mp3`,
                            ptt: false
                        }, { quoted: mek });
                        success = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        if (!success) {
            return reply("❌ All download sources failed! Try again later.");
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error("❌ PLAY2 ERROR:", err);
        reply("❌ Error occurred! Please try again later.");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
