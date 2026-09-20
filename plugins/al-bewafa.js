const { cmd } = require("../command");
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const AUDIO_URL = "https://files.catbox.moe/9pgorw.ogg";

// nekos.best official GIF categories that fit a sad/betrayal mood
// (fictional anime content, no real people).
const categories = ['cry', 'pat'];

const SHAYARI = [
    'وہ جو کبھی میری زندگی کا حصہ تھا، آج بیوفائی کی مثال بن گیا 💔',
    'محبت میں دیا ہر زخم، بیوفائی کی داستان بن گیا 🖤',
    'یقین کیا تھا جس پر، وہی سب سے بڑا دھوکہ نکلا 😢',
];
const SHAYARI_ROMAN = [
    'Wo jo kabhi meri zindagi ka hissa tha, aaj bewafai ki misaal ban gaya 💔',
    'Mohabbat mein diya har zakham, bewafai ki dastaan ban gaya 🖤',
    'Yaqeen kiya tha jis par, wohi sabse bada dhoka nikla 😢',
];
const SHAYARI_ENGLISH = [
    'The one who was once my whole world became the story of betrayal 💔',
    'Every wound love gave me turned into a tale of being betrayed 🖤',
    'The one I trusted most turned out to be the biggest deception 😢',
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
    const inputPath = path.join('/tmp', `bewafa_in_${Date.now()}.gif`);
    const outputPath = path.join('/tmp', `bewafa_out_${Date.now()}.mp4`);
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
    pattern: "bewafa",
    react: "💔",
    desc: "Sad bewafai-themed GIF + shayari + voice note",
    category: "fun",
    use: ".bewafa",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "💔", key: message.key } }).catch(() => {});

        const pools = [SHAYARI, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];
        const caption = `💔 *${line}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        try {
            const rawGif = await fetchSadGif();
            const mp4Buffer = await convertGifToMp4(rawGif);
            await client.sendMessage(message.chat, {
                video: mp4Buffer,
                gifPlayback: true,
                caption
            }, { quoted: message });
        } catch (e) {
            console.log("[BEWAFA] gif failed, sending text only:", e.message);
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
            console.log("[BEWAFA] audio failed:", e.message);
        }

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Bewafa Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
