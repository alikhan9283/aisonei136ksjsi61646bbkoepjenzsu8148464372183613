const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

// Primary source: api.download-lagu-mp3.com — returns a direct download
// URL instantly (no async conversion/polling needed), confirmed via its
// public documentation. Response shape:
// { vidID, vidTitle, vidInfo: { "0": { dloadUrl, bitrate, mp3size }, ... } }
// dloadUrl is protocol-relative (starts with "//"), needs "https:" prepended.
async function getFromDownloadLaguMp3(videoId) {
    const res = await axios.get(`https://api.download-lagu-mp3.com/@api/json/mp3/${videoId}`, { timeout: 20000 });
    const info = res.data?.vidInfo;
    if (!info) throw new Error("No vidInfo in response");

    // Prefer the highest bitrate available
    const entries = Object.values(info).filter((e) => e?.dloadUrl);
    if (!entries.length) throw new Error("No download entries found");
    entries.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const best = entries[0];

    let url = best.dloadUrl;
    if (url.startsWith("//")) url = "https:" + url;
    return url;
}

// Fallback source: supunofc.site — confirmed working but has an async
// conversion step (polling required) and has shown intermittent 500s.
// Only used if the primary (fast, direct) source fails entirely.
const FALLBACK_API_KEY = "supun-b4qb8wgwfd8o0qmzdxfo56cb";
async function getFromSupunofc(videoUrl) {
    const apiUrl = `https://supunofc.site/api/download/down/ytdl/dl?url=${encodeURIComponent(videoUrl)}&type=mp3&apikey=${FALLBACK_API_KEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });
    if (!data?.success || !data?.result?.downloadUrl) throw new Error("No downloadUrl in fallback response");

    const audioUrl = data.result.downloadUrl;
    const progressURL = data.result.metadata?.progressURL;

    if (progressURL) {
        const maxWaitMs = 30000;
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            try {
                const prog = await axios.get(progressURL, { timeout: 8000 });
                const percent = prog.data?.percent ?? prog.data?.finalProgress?.percent;
                if (percent === 100) break;
            } catch {}
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    return audioUrl;
}

cmd({
    pattern: "play2",
    alias: ["song2"],
    react: "🎵",
    desc: "Search and download a song/naat as audio by name (fast)",
    category: "download",
    use: ".play2 <song/naat name>",
    filename: __filename
}, async (client, message, match, { from, reply, q }) => {
    try {
        const query = q ? q.trim() : "";
        if (!query) {
            return reply(`🎵 *PLAY*\n\n⚠️ Please provide a song/naat name\n💡 Use: .play2 <name>\n📝 Example: .play2 Atif Aslam Pehli Dafa\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "🎵", key: message.key } }).catch(() => {});

        const search = await yts(query);
        const video = search.videos?.[0];
        if (!video) throw new Error("No results found for that name");

        const infoCaption =
            `🎵 *${video.title}*\n\n` +
            `👤 *Channel:* ${video.author?.name || "Unknown"}\n` +
            `⏱️ *Duration:* ${video.timestamp}\n` +
            `👁️ *Views:* ${video.views?.toLocaleString() || "0"}\n\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            image: { url: video.thumbnail },
            caption: infoCaption
        }, { quoted: message }).catch(() => {});

        let audioUrl;
        try {
            audioUrl = await getFromDownloadLaguMp3(video.videoId);
        } catch (e) {
            console.log("[PLAY2] primary source failed, trying fallback:", e.message);
            audioUrl = await getFromSupunofc(video.url);
        }

        const audioRes = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            timeout: 40000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        const audioBuffer = Buffer.from(audioRes.data);

        if (!audioBuffer || audioBuffer.length < 1000) {
            throw new Error("Downloaded audio file is empty or too small");
        }

        await client.sendMessage(message.chat, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${video.title?.slice(0, 60) || "audio"}.mp3`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Play2 Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Failed to get audio!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
