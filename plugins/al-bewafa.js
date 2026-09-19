const { cmd } = require("../command");
const axios = require("axios");

const AUDIO_URL = "https://files.catbox.moe/9pgorw.ogg";

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

cmd({
    pattern: "bewafa",
    react: "💔",
    desc: "Sad bewafai-themed voice note with shayari",
    category: "fun",
    use: ".bewafa",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "💔", key: message.key } }).catch(() => {});

        const pools = [SHAYARI, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];

        await client.sendMessage(message.chat, {
            text: `💔 *${line}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        const audioRes = await axios.get(AUDIO_URL, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        const audioBuffer = Buffer.from(audioRes.data);

        await client.sendMessage(message.chat, {
            audio: audioBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Bewafa Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
