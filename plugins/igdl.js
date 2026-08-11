const axios = require('axios');
const { cmd } = require('../command');

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

cmd({
    pattern: "igdl",
    alias: ["instagram", "insta", "ig"],
    react: "⬇️",
    desc: "Download Instagram videos/reels/photos",
    category: "downloader",
    use: ".igdl <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q ? q.trim() : (m.quoted?.text || "").trim();

        if (!url || !url.includes("instagram.com")) {
            return reply("❌ Please provide/reply to a valid Instagram link\n💡 Use: .igdl <instagram url>");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/igdl?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl, AXIOS_DEFAULTS);

        if (!data?.status || !Array.isArray(data.result) || !data.result.length) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Invalid or private link.");
        }

        const captionText = `📸 *INSTAGRAM DOWNLOAD*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        // Send everything in parallel — total time is only as long as the
        // slowest single item, instead of the sum of every item's time.
        const sendJobs = data.result
            .filter(item => item.download_url || item.url)
            .map((item, i) => {
                const mediaUrl = item.download_url || item.url;
                const isVideo = (item.type || item.contentType || '').includes('video');
                const payload = isVideo
                    ? { video: { url: mediaUrl }, mimetype: "video/mp4", caption: i === 0 ? captionText : undefined }
                    : { image: { url: mediaUrl }, caption: i === 0 ? captionText : undefined };

                return conn.sendMessage(from, payload, { quoted: mek }).catch(e => {
                    console.log(`[IGDL] failed to send item ${i}:`, e.message);
                });
            });

        await Promise.all(sendJobs);

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error("IGDL Error:", err);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ Download failed: ${err.message}`);
    }
});
