const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

// Uses @dark-yasiya/yt-dl.js — this package is ALREADY listed in this
// bot's own package.json, so no npm install/`.update` is needed for it.
// This avoids the unreliable third-party wrapper APIs (Vreden,
// supunofc.site, download-lagu-mp3.com) that kept returning 500s —
// this library talks to YouTube directly instead of going through an
// extra unofficial middleman service.
let ytdl;
try {
    ytdl = require("@dark-yasiya/yt-dl.js");
} catch (e) {
    console.error("[PLAY2] '@dark-yasiya/yt-dl.js' failed to load:", e.message);
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
        if (!ytdl) {
            return reply(`❌ Required module '@dark-yasiya/yt-dl.js' failed to load on the server.\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

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

        // This package's exact function name/signature may differ slightly
        // by version — try the common ytmp3(url) shape first, and surface
        // a clear error if the module's exports don't match so it can be
        // corrected quickly rather than failing silently.
        if (typeof ytdl.ytmp3 !== "function") {
            throw new Error(`Module loaded but 'ytmp3' function not found. Available exports: ${Object.keys(ytdl).join(", ")}`);
        }

        const result = await ytdl.ytmp3(video.url);

        const downloadUrl =
            result?.download ||
            result?.downloadUrl ||
            result?.url ||
            result?.data?.download ||
            result?.result?.download;

        if (!downloadUrl) {
            throw new Error(`No download URL in response. Response keys: ${Object.keys(result || {}).join(", ")}`);
        }

        const audioRes = await axios.get(downloadUrl, {
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
