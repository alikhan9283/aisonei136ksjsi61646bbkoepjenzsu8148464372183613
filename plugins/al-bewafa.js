const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");

// Voice file must be placed at: <bot_root>/data/bewafa-v.m4a
const AUDIO_PATH = path.join(__dirname, "..", "data", "bewafa-v.m4a");

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

        if (!fs.existsSync(AUDIO_PATH)) {
            throw new Error(`Audio file not found on server at data/bewafa-v.m4a — please upload it there`);
        }

        const pools = [SHAYARI, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];

        await client.sendMessage(message.chat, {
            text: `💔 *${line}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, {
            audio: fs.readFileSync(AUDIO_PATH),
            mimetype: "audio/mp4",
            ptt: true
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Bewafa Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
