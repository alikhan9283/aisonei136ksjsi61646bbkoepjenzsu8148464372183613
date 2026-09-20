const { cmd } = require('../command');
const axios = require('axios');

const fetchTikTokData = async (url) => {
    try {
        const res = await axios.get(
            `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
            { timeout: 30000 }
        );
        if (!res.data || res.data.code !== 0 || !res.data.data) throw new Error("No data");
        return res.data.data;
    } catch (e) {
        return null;
    }
};

cmd({
    pattern: "ttgif",
    alias: ["tiktokgif", "ttslide"],
    desc: "Download TikTok slideshow/GIF images by link",
    category: "download",
    react: "🎞",
    filename: __filename
}, async (sock, message, m, { q }) => {

    const query = q ? q.trim() : "";

    if (!query) {
        return await sock.sendMessage(message.chat, {
            text: "❌ Please provide a TikTok link\n📝 Usage: .ttgif <tiktok link>"
        }, { quoted: message });
    }

    const isTikTok = /tiktok\.com/i.test(query);
    if (!isTikTok) {
        return await sock.sendMessage(message.chat, {
            text: "❌ Please provide a valid TikTok link"
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(message.chat, {
            react: { text: "⏳", key: message.key }
        });

        const data = await fetchTikTokData(query);

        if (!data) {
            await sock.sendMessage(message.chat, {
                react: { text: "❌", key: message.key }
            });
            return sock.sendMessage(message.chat, {
                text: "❌ Failed to fetch TikTok data. The link may be invalid or the server is unavailable."
            }, { quoted: message });
        }

        // Slideshow posts come back as an "images" array (each one a
        // still frame of the slideshow) instead of a single video URL.
        const images = data.images;

        if (!images || !images.length) {
            await sock.sendMessage(message.chat, {
                react: { text: "❌", key: message.key }
            });
            return sock.sendMessage(message.chat, {
                text: "❌ This TikTok link doesn't look like a slideshow/GIF post (no images found). For a normal video, use .video or .ttdl instead."
            }, { quoted: message });
        }

        const captionText =
            `*${data.title || 'TikTok Slideshow'}*\n\n` +
            `👤 *Author:* ${data.author?.nickname || data.author?.unique_id || 'Unknown'}\n` +
            `🖼 *Slides:* ${images.length}\n\n` +
            `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        // Send each slide as an image, first one carries the caption.
        for (let i = 0; i < images.length; i++) {
            await sock.sendMessage(message.chat, {
                image: { url: images[i] },
                caption: i === 0 ? captionText : undefined
            }, { quoted: message });
        }

        // Slideshow posts also carry background music — send it too.
        if (data.music) {
            await sock.sendMessage(message.chat, {
                audio: { url: data.music },
                mimetype: "audio/mpeg",
                ptt: false
            }, { quoted: message });
        }

        await sock.sendMessage(message.chat, {
            react: { text: "✅", key: message.key }
        });

    } catch (err) {
        console.log("TikTok GIF Command Error:", err);
        await sock.sendMessage(message.chat, {
            react: { text: "❌", key: message.key }
        });
        await sock.sendMessage(message.chat, {
            text: "❌ An unexpected error occurred while processing your request."
        }, { quoted: message });
    }
});
