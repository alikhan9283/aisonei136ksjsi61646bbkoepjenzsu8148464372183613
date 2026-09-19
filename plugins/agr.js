const { cmd } = require("../command");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// nekos.best official GIF categories (fictional anime content, no real
// people). Soft/cute actions.
const categories = ['dance', 'wave', 'blush', 'happy', 'wink'];

async function fetchGif() {
    // nekos.best requires a properly formatted User-Agent header on every
    // request per their docs — without it, responses can come back
    // malformed/incomplete, causing "corrupt GIF" / unplayable media.
    const headers = { 'User-Agent': 'SARWAR-MD/1.0 (https://github.com/sarwarali12308)' };

    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000, headers });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error(`No result for category "${category}"`);
    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers });
    return { rawGifBuffer: Buffer.from(gifRes.data), category };
}

// WhatsApp's gifPlayback flag expects actual MP4 bytes internally, not a
// real .gif file — convert first, same fix as the working .tomp4 command.
async function convertGifToMp4(gifBuffer) {
    const inputPath = path.join('/tmp', `gv_in_${Date.now()}.gif`);
    const outputPath = path.join('/tmp', `gv_out_${Date.now()}.mp4`);
    fs.writeFileSync(inputPath, gifBuffer);

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoFilters(['scale=trunc(iw/2)*2:trunc(ih/2)*2'])
                .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'])
                .toFormat('mp4')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            throw new Error('Conversion produced an empty file');
        }
        return fs.readFileSync(outputPath);
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }
}

cmd({
    pattern: "girlsvideo",
    alias: ["animegirlgif", "waifugif"],
    react: "🎀",
    desc: "Random anime-style animated GIF (girl-themed action)",
    category: "anime",
    use: ".girlsvideo",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🎀", key: message.key } }).catch(() => {});

        const { rawGifBuffer, category } = await fetchGif();
        const mp4Buffer = await convertGifToMp4(rawGifBuffer);

        const caption = `╭───────────────⊷\n│  🎀 *ANIME GIF*\n├───────────────⊷\n│ ▸ 🎬 *Action:* ${category}\n╰───────────────⊷\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            video: mp4Buffer,
            gifPlayback: true,
            caption
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ GirlsVideo Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`⚠️ Error fetching anime gif: ${error.message}`);
    }
});
