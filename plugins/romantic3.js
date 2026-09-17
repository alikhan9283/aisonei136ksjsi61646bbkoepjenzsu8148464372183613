const { cmd } = require("../command");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// Uses nekos.best's official animated GIF categories (fictional anime
// content, no real people) — confirmed live-working earlier in this bot
// for .girlsvideo/.boyvideo. "kiss", "hug", "cuddle", "pat" are all
// romantic/affectionate couple-style animations.
const categories = ['kiss', 'hug', 'cuddle', 'pat', 'handhold'];

const SHAYARI_URDU = [
    'تیرے ساتھ گزرا ہر پل، زندگی کا سب سے حسین لمحہ ہے 💞',
    'محبت کوئی لفظ نہیں، تیری موجودگی کا احساس ہے 🌷',
    'دل نے جسے چاہا، وہ تُو ہی تھا، اور تُو ہی رہے گا ✨'
];
const SHAYARI_ROMAN = [
    'Tere sath guzra har pal, zindagi ka sabse haseen lamha hai 💞',
    'Mohabbat koi lafz nahi, teri mojoodgi ka ehsaas hai 🌷',
    'Dil ne jise chaha, wo tu hi tha, aur tu hi rahega ✨'
];
const SHAYARI_ENGLISH = [
    'Every moment with you is the most beautiful part of my life 💞',
    'Love isn\'t just a word — it\'s the feeling of you being near 🌷',
    'Whatever my heart wanted, it was always you ✨'
];

async function fetchLoveGif() {
    // nekos.best requires a properly formatted User-Agent header on every
    // request per their docs — without it, responses can come back
    // malformed/incomplete, which was one cause of the "corrupt GIF" issue.
    const headers = { 'User-Agent': 'SARWAR-MD/1.0 (https://github.com/sarwarali12308)' };

    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000, headers });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error('No gif found');
    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers });
    return { rawGifBuffer: Buffer.from(gifRes.data), category };
}

// WhatsApp's gifPlayback flag expects actual MP4 bytes internally (it
// loops a short video, not a real .gif file) — sending a raw .gif buffer
// with gifPlayback:true is what was causing "media file doesn't exist" /
// unplayable GIF on WhatsApp. Convert to MP4 first, same approach as
// the working .tomp4 sticker-to-video command.
async function convertGifToMp4(gifBuffer) {
    const inputPath = path.join('/tmp', `romantic_in_${Date.now()}.gif`);
    const outputPath = path.join('/tmp', `romantic_out_${Date.now()}.mp4`);
    fs.writeFileSync(inputPath, gifBuffer);

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoFilters(['scale=trunc(iw/2)*2:trunc(ih/2)*2']) // ensure even dimensions, required by libx264
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
    pattern: "romantic",
    alias: ["animelove", "couple"],
    react: "💕",
    desc: "Cute anime love GIF with a romantic line",
    category: "fun",
    use: ".romantic",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "💕", key: message.key } }).catch(() => {});

        const { rawGifBuffer, category } = await fetchLoveGif();
        const mp4Buffer = await convertGifToMp4(rawGifBuffer);

        const pools = [SHAYARI_URDU, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];

        const caption =
            `💞 *${line}* 💞\n\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            video: mp4Buffer,
            gifPlayback: true,
            caption
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Romantic Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
