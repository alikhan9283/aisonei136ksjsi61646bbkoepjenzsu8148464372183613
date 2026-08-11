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
    pattern: "fb3",
    alias: ["facebook3"],
    react: "⬇️",
    desc: "Download Facebook videos/reels (HD & SD)",
    category: "downloader",
    use: ".fb3 <Facebook URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q ? q.trim() : (m.quoted?.text || "").trim();

        if (!url || !url.includes("facebook.com")) {
            return reply("❌ Please provide/reply to a valid Facebook link\n💡 Use: .fb3 <facebook url>");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/fbdl?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl, AXIOS_DEFAULTS);

        // API returns hd_link / sd_link / download_url directly (no nested
        // "result" array like igdl) — download_url is the same as hd_link,
        // so hd_link is the primary source and download_url is the fallback.
        const videoUrl = data?.hd_link || data?.download_url || data?.sd_link;

        if (!data?.status || !videoUrl) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Invalid or private link.");
        }

        const captionText = `📘 *FACEBOOK DOWNLOAD*\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        try {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                mimetype: "video/mp4",
                caption: captionText
            }, { quoted: mek });
        } catch (hdErr) {
            // HD sometimes fails to send (large file / CDN hiccup) — fall
            // back to SD so the command doesn't dead-end on a working link.
            console.log("[FB3] HD send failed, trying SD:", hdErr.message);
            if (data?.sd_link && data.sd_link !== videoUrl) {
                await conn.sendMessage(from, {
                    video: { url: data.sd_link },
                    mimetype: "video/mp4",
                    caption: captionText
                }, { quoted: mek });
            } else {
                throw hdErr;
            }
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error("FB3 Error:", err);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ Download failed: ${err.message}`);
    }
});
