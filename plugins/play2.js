const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

const API_KEY = "supun-b4qb8wgwfd8o0qmzdxfo56cb";

cmd({
    pattern: "play2",
    alias: ["song2", "naat", "audio"],
    react: "🎵",
    desc: "Search and download a song/naat as audio by name",
    category: "download",
    use: ".play <song/naat name>",
    filename: __filename
}, async (client, message, match, { from, reply, q }) => {
    try {
        const query = q ? q.trim() : "";
        if (!query) {
            return reply(`🎵 *PLAY*\n\n⚠️ Please provide a song/naat name\n💡 Use: .play <name>\n📝 Example: .play Atif Aslam Pehli Dafa\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "🎵", key: message.key } }).catch(() => {});

        // Step 1: search YouTube for the name given
        const search = await yts(query);
        const video = search.videos?.[0];
        if (!video) {
            throw new Error("No results found for that name");
        }

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

        // Step 2: ask the converter API to turn that video into mp3
        const apiUrl = `https://supunofc.site/api/download/down/ytdl/dl?url=${encodeURIComponent(video.url)}&type=mp3&apikey=${API_KEY}`;
        const { data } = await axios.get(apiUrl, { timeout: 40000 });

        if (!data?.success || !data?.result?.downloadUrl) {
            throw new Error(data?.message || "Conversion service returned no audio link");
        }

        const audioUrl = data.result.downloadUrl;
        const progressURL = data.result.metadata?.progressURL;

        // This is an async conversion service — the downloadUrl may not be
        // instantly ready. Poll the progress endpoint (if given) for up to
        // ~30s before attempting the actual download.
        if (progressURL) {
            for (let i = 0; i < 10; i++) {
                try {
                    const prog = await axios.get(progressURL, { timeout: 10000 });
                    const percent = prog.data?.percent ?? prog.data?.progress;
                    if (percent === 100 || prog.data?.download_url) break;
                } catch (e) {
                    // progress check failing isn't fatal, just stop polling
                    break;
                }
                await new Promise((r) => setTimeout(r, 3000));
            }
        }

        // Step 3: download the actual audio bytes server-side
        const audioRes = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            timeout: 60000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        const audioBuffer = Buffer.from(audioRes.data);

        if (!audioBuffer || audioBuffer.length < 1000) {
            throw new Error("Downloaded audio file is empty or too small — conversion may not have finished yet, try again in a moment");
        }

        await client.sendMessage(message.chat, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${video.title?.slice(0, 60) || "audio"}.mp3`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Play Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Failed to get audio!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
