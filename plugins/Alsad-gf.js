const { cmd } = require("../command");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// nekos.best official GIF categories that fit a sad/melancholic mood
// (fictional anime content, no real people).
const categories = ['cry', 'pat', 'hug'];

// Same voice clips used in .bewafa/.nufrat — randomly picked here too,
// so .sad plays a sad voice note alongside the GIF and shayari.
const AUDIO_URLS = [
    "https://files.catbox.moe/9pgorw.ogg", // bewafa
    "https://files.catbox.moe/ra7pbe.ogg", // nufrat
];

const SHAYARI = [
    'دل ٹوٹا تو احساس ہوا، محبت کتنی مہنگی چیز ہے 💔',
    'ہر مسکراہٹ کے پیچھے ایک چھپا ہوا درد ہوتا ہے 😢',
    'تنہائی سب سے بڑی سزا ہے، جو محبت میں ملتی ہے 🥀',
];
const SHAYARI_ROMAN = [
    'Dil toota to ehsaas hua, mohabbat kitni mehngi cheez hai 💔',
    'Har muskurahat ke peeche ek chhupa hua dard hota hai 😢',
    'Tanhai sabse badi saza hai, jo mohabbat mein milti hai 🥀',
];
const SHAYARI_ENGLISH = [
    'Only when the heart breaks do we realize how costly love really is 💔',
    'Behind every smile hides a pain no one sees 😢',
    'Loneliness is the harshest punishment love ever gives 🥀',
];

async function fetchSadGif() {
    const headers = { 'User-Agent': 'SARWAR-MD/1.0 (https://github.com/sarwarali12308)' };

    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000, headers });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error(`No result for category "${category}"`);
    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers });
    return { rawGifBuffer: Buffer.from(gifRes.data), category };
}

async function convertGifToMp4(gifBuffer) {
    const inputPath = path.join('/tmp', `sad_in_${Date.now()}.gif`);
    const outputPath = path.join('/tmp', `sad_out_${Date.now()}.mp4`);
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
    pattern: "sad",
    alias: ["sadmood", "heartbreak"],
    react: "😢",
    desc: "Sad anime GIF with heartbreak shayari",
    category: "fun",
    use: ".sad",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "😢", key: message.key } }).catch(() => {});

        const { rawGifBuffer } = await fetchSadGif();
        const mp4Buffer = await convertGifToMp4(rawGifBuffer);

        const pools = [SHAYARI, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];

        const caption = `😢 *${line}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            video: mp4Buffer,
            gifPlayback: true,
            caption
        }, { quoted: message });

        // Send a random sad voice note alongside the GIF and shayari
        try {
            const audioUrl = AUDIO_URLS[Math.floor(Math.random() * AUDIO_URLS.length)];
            const audioRes = await axios.get(audioUrl, {
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
            console.log("[SAD] audio send failed, continuing without it:", e.message);
        }

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Sad Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
