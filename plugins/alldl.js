const { cmd } = require("../command");
const axios = require("axios");

// API key provided directly by the user for this endpoint.
const API_KEY = "supun-b4qb8wgwfd8o0qmzdxfo56cb";

// This endpoint is a UNIVERSAL "Get All Dl" downloader — confirmed from
// the provider's own dashboard, it covers: TikTok, Douyin, Instagram,
// Facebook, YouTube, Twitter, Threads, CapCut, Spotify, SoundCloud,
// Pinterest, Bilibili, Snapchat, Pixiv. So this command accepts a link
// from any of those platforms, not just YouTube.

cmd({
    pattern: "alldl",
    alias: ["dlall", "universaldl", "getdl"],
    react: "📥",
    desc: "Download from any supported platform (TikTok, Instagram, Facebook, YouTube, Twitter, Spotify, SoundCloud, Pinterest, Bilibili, Snapchat, Pixiv, etc.)",
    category: "download",
    use: ".alldl <link>",
    filename: __filename
}, async (client, message, match, { from, reply, q }) => {
    try {
        const url = q ? q.trim() : "";
        if (!url || !/^https?:\/\//i.test(url)) {
            return reply(`📥 *UNIVERSAL DOWNLOADER*\n\n⚠️ Please provide a valid link\n💡 Use: .alldl <link>\n\n🌐 *Supported:* TikTok, Instagram, Facebook, YouTube, Twitter, Threads, CapCut, Spotify, SoundCloud, Pinterest, Bilibili, Snapchat, Pixiv\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "📥", key: message.key } }).catch(() => {});

        async function fetchFromApi(targetUrl) {
            const apiUrl = `https://supunofc.site/api/download/getdl/dl?url=${encodeURIComponent(targetUrl)}&apikey=${API_KEY}`;
            const { data } = await axios.get(apiUrl, { timeout: 40000 });
            return data;
        }

        let data;
        try {
            data = await fetchFromApi(url);
        } catch (e) {
            // Some links (e.g. Instagram reel share links with tracking
            // params like ?stkn=...) can cause a 500 on the provider's
            // side. Retry once with those params stripped off.
            if (e.response?.status === 500) {
                console.log("[AllDL] first attempt got 500, retrying with query params stripped");
                try {
                    const cleanUrl = url.split("?")[0];
                    data = await fetchFromApi(cleanUrl);
                } catch (e2) {
                    throw e2;
                }
            } else {
                throw e;
            }
        }

        if (!data?.success || !data?.result) {
            throw new Error(data?.message || "This link could not be processed");
        }

        const r = data.result;
        const platform = r.platform || r.platformName || "unknown";
        const title = r.title || "";
        const thumbnail = r.thumbnail;

        // Different platforms can come back with slightly different result
        // shapes: a `downloads` array (video with multiple qualities), a
        // single `url`/`videoUrl`/`audioUrl`, or an `images` array (e.g.
        // Pinterest/Instagram photo posts). Handle each gracefully.
        const downloads = Array.isArray(r.downloads) ? r.downloads : [];
        const images = Array.isArray(r.images) ? r.images : [];

        let infoCaption = `📥 *${title || "Downloaded Media"}*\n\n🌐 *Platform:* ${platform}`;
        if (r.duration) {
            const mins = Math.floor(r.duration / 60);
            const secs = r.duration % 60;
            infoCaption += `\n⏱️ *Duration:* ${mins}:${String(secs).padStart(2, "0")}`;
        }
        if (r.author?.name) infoCaption += `\n👤 *Author:* ${r.author.name}`;
        infoCaption += `\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        if (thumbnail && (downloads.length || images.length)) {
            try {
                await client.sendMessage(message.chat, {
                    image: { url: thumbnail },
                    caption: infoCaption
                }, { quoted: message });
            } catch (e) {
                console.log("[AllDL] thumbnail send failed, continuing without it:", e.message);
            }
        }

        if (downloads.length) {
            const preferred =
                downloads.find((d) => d.ext === "mp4" && d.quality?.includes("720")) ||
                downloads.find((d) => d.ext === "mp4") ||
                downloads.find((d) => d.ext === "mp3") ||
                downloads[0];

            const isAudio = preferred.ext === "mp3" || preferred.label?.toLowerCase().includes("audio");

            // Download the actual bytes server-side instead of handing
            // WhatsApp a raw URL to fetch itself — YouTube's redirect/CDN
            // links in particular are slow enough that WhatsApp's own
            // fetch attempt was timing out ("Failed to fetch stream").
            const mediaRes = await axios.get(preferred.url, {
                responseType: "arraybuffer",
                timeout: 90000,
                maxContentLength: 200 * 1024 * 1024,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });
            const mediaBuffer = Buffer.from(mediaRes.data);

            if (isAudio) {
                await client.sendMessage(message.chat, {
                    audio: mediaBuffer,
                    mimetype: "audio/mpeg",
                    caption: `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
                }, { quoted: message });
            } else {
                await client.sendMessage(message.chat, {
                    video: mediaBuffer,
                    mimetype: preferred.ext === "webm" ? "video/webm" : "video/mp4",
                    caption: !thumbnail ? infoCaption : `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
                }, { quoted: message });
            }
        } else if (images.length) {
            // Send up to 5 images to avoid flooding the chat
            const picks = images.slice(0, 5);
            for (let i = 0; i < picks.length; i++) {
                const imgUrl = typeof picks[i] === "string" ? picks[i] : picks[i]?.url;
                if (!imgUrl) continue;
                await client.sendMessage(message.chat, {
                    image: { url: imgUrl },
                    caption: i === 0 && !thumbnail ? infoCaption : undefined
                }, { quoted: message });
            }
        } else if (r.url || r.videoUrl || r.audioUrl) {
            const directUrl = r.videoUrl || r.audioUrl || r.url;
            const isAudioDirect = !!r.audioUrl;

            const mediaRes = await axios.get(directUrl, {
                responseType: "arraybuffer",
                timeout: 90000,
                maxContentLength: 200 * 1024 * 1024,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });
            const mediaBuffer = Buffer.from(mediaRes.data);

            await client.sendMessage(message.chat, {
                [isAudioDirect ? "audio" : "video"]: mediaBuffer,
                mimetype: isAudioDirect ? "audio/mpeg" : "video/mp4",
                caption: !thumbnail ? infoCaption : `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
            }, { quoted: message });
        } else {
            throw new Error("No downloadable media found in the response for this link");
        }

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ AllDL Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Download failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
