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

        // This IS a genuinely async conversion (confirmed: the API's own
        // response shows progress still at 3% / percent 0 right after the
        // initial request) — there's no way to skip the wait, but we can
        // poll efficiently: check often (every 2s) and stop the INSTANT
        // it's done, instead of always waiting a fixed amount either way.
        if (progressURL) {
            const maxWaitMs = 60000; // hard ceiling so it can't hang forever
            const pollIntervalMs = 2000;
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitMs) {
                try {
                    const prog = await axios.get(progressURL, { timeout: 8000 });
                    const percent = prog.data?.percent ?? prog.data?.finalProgress?.percent;
                    const progressVal = prog.data?.progress ?? prog.data?.finalProgress?.progress;
                    const hasError = prog.data?.error || prog.data?.finalProgress?.error;

                    if (hasError) {
                        throw new Error("Conversion service reported an error while processing");
                    }
                    // percent === 100 is the real "done" signal per this API
                    if (percent === 100) break;
                } catch (e) {
                    if (e.message?.includes("Conversion service")) throw e;
                    // transient poll failure — just try again next loop
                }
                await new Promise((r) => setTimeout(r, pollIntervalMs));
            }
        }

        // Now attempt the actual download — a few quick retries in case
        // there's a brief propagation delay right after hitting 100%.
        let audioBuffer = null;
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const audioRes = await axios.get(audioUrl, {
                    responseType: "arraybuffer",
                    timeout: 20000,
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                });
                const buf = Buffer.from(audioRes.data);
                if (buf.length > 1000) {
                    audioBuffer = buf;
                    break;
                }
                lastErr = new Error("File not ready yet");
            } catch (e) {
                lastErr = e;
            }
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        }

        if (!audioBuffer) {
            throw lastErr || new Error("Audio file never became ready");
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
