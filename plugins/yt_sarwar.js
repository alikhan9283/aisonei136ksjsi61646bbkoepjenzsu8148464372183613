const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

// Four independent APIs chained as fallbacks — if one is down or returns
// a bad link, the next is tried automatically before giving up, so the
// command keeps working even if two or three providers fail at once.

const AXIOS_DEFAULTS = { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } };

async function tryJawadTech(videoUrl) {
    const { data } = await axios.get(`https://jawad-tech.vercel.app/download/ytdl`, {
        params: { url: videoUrl }, ...AXIOS_DEFAULTS
    });
    if (!data?.status || !data?.result?.mp4) throw new Error('jawad-tech: no video link');
    return {
        videoUrl: data.result.mp4,
        title: data.result.title,
        thumbnail: data.result.thumbnail,
        duration: data.result.duration
    };
}

async function tryAdeel(videoUrl) {
    const { data } = await axios.get(`https://adeel-xtech-apis.vercel.app/api/ytmp4`, {
        params: { url: videoUrl }, ...AXIOS_DEFAULTS
    });
    const link = data?.result?.video_download || data?.result?.download_url;
    if (!data?.status || !link) throw new Error('adeel-xtech: no video link');
    return {
        videoUrl: link,
        title: data.result.title,
        thumbnail: data.result.thumbnail,
        duration: data.result.duration
    };
}

async function tryVreden(videoUrl) {
    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp4`, {
        params: { url: videoUrl }, ...AXIOS_DEFAULTS
    });
    const link = data?.result?.download?.url;
    if (!data?.status || !link) throw new Error('vreden: no video link');
    return {
        videoUrl: link,
        title: data.result.metadata?.title || data.result.title,
        thumbnail: data.result.metadata?.thumbnail || data.result.thumbnail,
        duration: data.result.metadata?.duration || data.result.duration
    };
}

async function tryYupra(videoUrl) {
    const { data } = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp4`, {
        params: { url: videoUrl }, ...AXIOS_DEFAULTS
    });
    const link = data?.data?.download_url;
    if (!data?.success || !link) throw new Error('yupra: no video link');
    return {
        videoUrl: link,
        title: data.data.title,
        thumbnail: data.data.thumbnail,
        duration: data.data.duration
    };
}

async function fetchVideo(videoUrl, fallbackMeta) {
    const providers = [tryJawadTech, tryAdeel, tryVreden, tryYupra];
    let lastError = null;

    for (const attempt of providers) {
        try {
            const r = await attempt(videoUrl);
            return {
                videoUrl: r.videoUrl,
                title: r.title || fallbackMeta?.title || "YouTube Video",
                thumbnail: r.thumbnail || fallbackMeta?.thumbnail || "",
                duration: r.duration || fallbackMeta?.duration || "?"
            };
        } catch (e) {
            console.log(`[YT provider failed] ${attempt.name}:`, e.message);
            lastError = e;
        }
    }
    throw lastError || new Error("All providers failed");
}

cmd({
    pattern: "yt",
    alias: ["youtube", "ytdl", "ytmp"],
    react: "🎬",
    desc: "Download YouTube video",
    category: "download",
    use: ".yt <url/name>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q, sender }) => {
    const send = (text) => conn.sendMessage(from, {
        text,
        contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363407310860031@newsletter",
                newsletterName: "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
                serverMessageId: 143
            }
        }
    }, { quoted: mek });

    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        if (!q) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return send(`🎬 *YOUTUBE DOWNLOADER*\n\n⚠️ No URL/Name Provided\n💡 Use: .yt <url/name>\n📝 Example: .yt https://youtu.be/xxx\n📝 Example: .yt Alan Walker Faded\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡`);
        }

        let targetUrl, fallbackMeta;

        if (q.includes('youtube.com') || q.includes('youtu.be')) {
            targetUrl = q;
            // Try to resolve real title/thumbnail for a nicer caption, but
            // never let this block the download if it fails.
            try {
                let videoId = '';
                try {
                    const urlObj = new URL(q);
                    videoId = urlObj.hostname.includes('youtu.be') ? urlObj.pathname.slice(1) : urlObj.searchParams.get('v');
                } catch { videoId = q.split('/').pop().split('?')[0]; }
                if (videoId) {
                    const search = await yts({ videoId });
                    if (search) fallbackMeta = { title: search.title, thumbnail: search.thumbnail, duration: search.timestamp || search.seconds };
                }
            } catch (e) { console.log('[YT metadata lookup] failed:', e.message); }
        } else {
            const search = await yts(q);
            const video = search.videos?.[0];
            if (!video) throw new Error("No video found for that search");
            targetUrl = video.url;
            fallbackMeta = { title: video.title, thumbnail: video.thumbnail, duration: video.timestamp };
        }

        const { videoUrl, title, duration } = await fetchVideo(targetUrl, fallbackMeta);

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `🎬 *${title}*\n\n⏱️ Duration: ${duration}\n📥 Downloaded by: SARWAR-MD\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363407310860031@newsletter",
                    newsletterName: "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error("YouTube Error:", err.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        send(`❌ *YouTube Download Failed!*\nReason: ${err.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡`);
    }
});
