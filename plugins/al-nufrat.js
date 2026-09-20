const { cmd } = require("../command");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const AUDIO_URL = "https://files.catbox.moe/ra7pbe.ogg";

// nekos.best official GIF categories that fit a sad/hate-heartbreak mood
// (fictional anime content, no real people).
const categories = ['cry', 'pat'];

const SHAYARI = [
    'محبت جب نفرت میں بدل جائے، تو دل سب سے پہلے مرتا ہے 💔',
    'کبھی چاہا تھا جسے دل سے، آج اسی سے نفرت ہو گئی 🖤',
    'نفرت اس سے نہیں، اپنی محبت کی غلطی سے ہے 😢',
];
const SHAYARI_ROMAN = [
    'Mohabbat jab nafrat mein badal jaye, to dil sabse pehle marta hai 💔',
    'Kabhi chaha tha jise dil se, aaj usi se nafrat ho gayi 🖤',
    'Nafrat us se nahi, apni mohabbat ki ghalti se hai 😢',
];
const SHAYARI_ENGLISH = [
    'When love turns to hate, the heart dies first 💔',
    'The one I once loved with all my heart, I now hate just as much 🖤',
    'I don\'t hate them — I hate the mistake of loving them 😢',
];

async function fetchSadGif() {
    const headers = { 'User-Agent': 'SARWAR-MD/1.0 (https://github.com/sarwarali12308)' };
    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000, headers });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error(`No result for category "${category}"`);
    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers });
    return Buffer.from(gifRes.data);
}

async function convertGifToMp4(gifBuffer) {
    const inputPath = path.join('/tmp', `nufrat_in_${Date.now()}.gif`);
    const outputPath = path.join('/tmp', `nufrat_out_${Date.now()}.mp4`);
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
    pattern: "nufrat",
    react: "😔",
    desc: "Sad nufrat-themed (hate/heartbreak) GIF + shayari + voice note",
    category: "fun",
    use: ".nufrat",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "😔", key: message.key } }).catch(() => {});

        const pools = [SHAYARI, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];
        const caption = `😔 *${line}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        try {
            const rawGif = await fetchSadGif();
            const mp4Buffer = await convertGifToMp4(rawGif);
            await client.sendMessage(message.chat, {
                video: mp4Buffer,
                gifPlayback: true,
                caption
            }, { quoted: message });
        } catch (e) {
            console.log("[NUFRAT] gif failed, sending text only:", e.message);
            await client.sendMessage(message.chat, { text: caption }, { quoted: message });
        }

        try {
            const audioRes = await axios.get(AUDIO_URL, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });
            await client.sendMessage(message.chat, {
                audio: Buffer.from(audioRes.data),
                mimetype: "audio/ogg; codecs=opus",
                ptt: true
            }, { quoted: message });
        } catch (e) {
            console.log("[NUFRAT] audio failed:", e.message);
        }

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Nufrat Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
