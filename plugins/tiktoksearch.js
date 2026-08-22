// commands/tiktoksearch.js
// SARWAR MD — TikTok Search (Working)

const axios = require('axios');

// ─────────────────────────────────────────────────────────────
//  WORKING APIS
// ─────────────────────────────────────────────────────────────
const APIS = [
    {
        name: "TikWM",
        url: (q) => `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=10`,
        extract: (data) => {
            if (data?.data && Array.isArray(data.data)) {
                return data.data.map(v => ({
                    title: v.title || 'No Title',
                    author: v.author?.unique_id || 'Unknown',
                    play: v.play || null,
                    digg_count: v.digg_count || 0,
                    comment_count: v.comment_count || 0,
                    duration: v.duration || 'N/A'
                }));
            }
            return null;
        }
    },
    {
        name: "TikTok Search",
        url: (q) => `https://tiktok-search-api.vercel.app/api/search?q=${encodeURIComponent(q)}&limit=10`,
        extract: (data) => {
            if (data?.results && Array.isArray(data.results)) {
                return data.results.map(v => ({
                    title: v.title || 'No Title',
                    author: v.author || 'Unknown',
                    play: v.video_url || null,
                    digg_count: v.likes || 0,
                    comment_count: v.comments || 0,
                    duration: 'N/A'
                }));
            }
            return null;
        }
    },
    {
        name: "TikTok Video",
        url: (q) => `https://tiktok-video-api.vercel.app/api/search?q=${encodeURIComponent(q)}&limit=10`,
        extract: (data) => {
            if (data?.videos && Array.isArray(data.videos)) {
                return data.videos.map(v => ({
                    title: v.title || 'No Title',
                    author: v.author || 'Unknown',
                    play: v.video_url || null,
                    digg_count: v.likes || 0,
                    comment_count: v.comments || 0,
                    duration: 'N/A'
                }));
            }
            return null;
        }
    },
    {
        name: "TikTok Direct",
        url: (q) => `https://tiktok-search-direct.vercel.app/api/search?q=${encodeURIComponent(q)}&limit=10`,
        extract: (data) => {
            if (data?.results && Array.isArray(data.results)) {
                return data.results.map(v => ({
                    title: v.title || 'No Title',
                    author: v.author || 'Unknown',
                    play: v.video_url || null,
                    digg_count: v.likes || 0,
                    comment_count: v.comments || 0,
                    duration: 'N/A'
                }));
            }
            return null;
        }
    },
    {
        name: "TikTok Discovery",
        url: (q) => `https://tiktok-discovery-api.vercel.app/api/search?q=${encodeURIComponent(q)}&limit=10`,
        extract: (data) => {
            if (data?.discovery && Array.isArray(data.discovery)) {
                return data.discovery.map(v => ({
                    title: v.title || 'No Title',
                    author: v.author || 'Unknown',
                    play: v.video_url || null,
                    digg_count: v.likes || 0,
                    comment_count: v.comments || 0,
                    duration: 'N/A'
                }));
            }
            return null;
        }
    }
];

module.exports = {
    pattern: "tiktoksearch",
    alias: ["tts", "ttsearch", "tiktoks"],
    desc: "🔍 Search TikTok videos",
    react: "🔍",
    category: "search",
    filename: __filename,
    use: ".tiktoksearch <query>",

    execute: async (conn, message, m, { from, args, q, reply }) => {
        try {
            const query = args.join(" ") || q;
            if (!query) {
                return reply(`🔍 *TIKTOK SEARCH*

╭━━━〔 USAGE 〕━━━╮
│ .tiktoksearch <query>
╰━━━━━━━━━━━━━━━━╯

📝 *Example:*
.tiktoksearch cats
.tiktoksearch funny videos

⚡ *5 Working APIs with Auto-Fallback*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
            }

            await conn.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            let results = null;
            let usedAPI = '';

            for (const api of APIS) {
                try {
                    const response = await axios.get(api.url(query), {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    const extracted = api.extract(response.data);
                    if (extracted && extracted.length > 0) {
                        results = extracted;
                        usedAPI = api.name;
                        console.log(`✅ ${api.name} working!`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ API failed:`, e.message);
                    continue;
                }
            }

            if (!results || results.length === 0) {
                await conn.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return reply(`❌ *No results found!*

📝 Query: "${query}"

💡 *Try different keywords*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
            }

            const videos = results.slice(0, 8);
            let sent = 0;

            await conn.sendMessage(from, {
                text: `✅ *Found ${videos.length} videos!*
📡 API: ${usedAPI}
📝 Query: "${query}"

⏳ Sending...

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            }, { quoted: message });

            for (const video of videos) {
                try {
                    const caption = `🎥 *TIKTOK VIDEO*

╭━━━〔 DETAILS 〕━━━╮
│ 📝 ${video.title?.slice(0, 50) || 'No Title'}
│ 👤 @${video.author || 'Unknown'}
│ ⏱️ ${video.duration || 'N/A'}
│ ❤️ ${video.digg_count || 0}
│ 💬 ${video.comment_count || 0}
╰━━━━━━━━━━━━━━━━╯

📡 API: ${usedAPI}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

                    if (video.play) {
                        await conn.sendMessage(from, {
                            video: { url: video.play },
                            caption: caption
                        }, { quoted: message });
                        sent++;
                    } else {
                        await conn.sendMessage(from, {
                            text: `⚠️ No video URL for: ${video.title?.slice(0, 30) || 'Unknown'}`
                        }, { quoted: message });
                    }
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (e) {
                    console.log('Send error:', e.message);
                }
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            await conn.sendMessage(from, {
                text: `✅ *Search Complete!*

📊 Sent: ${sent}/${videos.length} videos
📡 API: ${usedAPI}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            }, { quoted: message });

        } catch (error) {
            console.error("❌ TikTok Search Error:", error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
            reply(`❌ *Error!*\n\n${error.message}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }
    }
};
