const { cmd } = require("../command");
const axios = require("axios");

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
    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000 });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error('No gif found');
    const gifRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return { buffer: Buffer.from(gifRes.data), category };
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

        const { buffer, category } = await fetchLoveGif();

        const pools = [SHAYARI_URDU, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];

        const caption =
            `💞 *${line}* 💞\n\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            video: buffer,
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
