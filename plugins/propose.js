const { cmd } = require('../command');
const axios = require('axios');

// A romantic "propose card" — sends a heart/love-themed background image
// with a deep, heartfelt shayari-style caption featuring the given name.
// Uses ONLY axios (already installed) — no canvas/jimp/extra dependency,
// so it can't silently fail to load like the earlier greeting-card
// commands did when a new package wasn't installed on the server.

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Three shayari pools — Urdu script, English, and Roman Urdu — {name}
// gets replaced with the given name. A random language + line is picked
// each time the command runs.
const SHAYARI_URDU = [
    'تیرے بغیر یہ دل کی دھڑکن بھی ادھوری سی لگتی ہے، {name}...\nتُو مل جائے تو شاید یہ زندگی پوری ہو جائے 💔',
    'ہزاروں خواہشیں تھیں دل میں، مگر ایک ہی سچی تھی — {name}، تُو میری بن جائے 🖤',
    'دنیا کی ہر دولت چھوڑ دوں، بس {name} تُو میرے پاس رہے... یہی میری سب سے بڑی خواہش ہے ✨',
    'نہ جانے کیوں دل ہر پل {name} کی طرف کھنچا چلا جاتا ہے،\nشاید یہی تو محبت کہلاتی ہے 💘',
    '{name}، تیرے نام سے ہی سکون ملتا ہے دل کو،\nتُو مل جائے تو یہ ادھوری کہانی پوری ہو جائے 🥀'
];

const SHAYARI_ENGLISH = [
    'Every heartbeat whispers your name, {name}...\nMaybe love was always meant to find its way to you 💔',
    'A thousand wishes lived in my heart, but only one was true — {name}, be mine 🖤',
    'I would leave every riches of this world behind, if only {name} stayed by my side ✨',
    'I don\'t know why my heart keeps drifting toward {name},\nmaybe that\'s just what love feels like 💘',
    '{name}, just your name brings peace to my heart,\nif you come, this unfinished story finally completes itself 🥀'
];

const SHAYARI_ROMAN = [
    'Tere bina ye dil ki dhadkan bhi adhoori si lagti hai, {name}...\nTu mil jaye to shayad ye zindagi poori ho jaye 💔',
    'Hazaaron khwahishen thi dil mein, magar ek hi sacchi thi — {name}, tu meri ban jaye 🖤',
    'Duniya ki har daulat chhod doon, bas {name} tu mere paas rahe... yehi meri sabse badi khwahish hai ✨',
    'Na jaane kyun dil har pal {name} ki taraf khincha chala jata hai,\nshayad yehi to mohabbat kehlati hai 💘',
    '{name}, tere naam se hi sukoon milta hai dil ko,\ntu mil jaye to ye adhoori kahani poori ho jaye 🥀'
];

async function fetchHeartBackground() {
    const queries = ['red rose petals dark', 'love hearts aesthetic dark', 'romantic sunset couple silhouette'];
    const q = queries[Math.floor(Math.random() * queries.length)];
    const seed = `love-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    // Picsum doesn't support text search, so it's used purely as a random
    // aesthetic background — the theme comes through in the shayari caption
    const url = `https://picsum.photos/seed/${seed}/900/1200`;
    const res = await axios.get(url, { ...AXIOS_DEFAULTS, responseType: 'arraybuffer', maxRedirects: 5 });
    return Buffer.from(res.data);
}

cmd({
    pattern: 'propose',
    alias: ['love', 'iloveyou', 'proposecard'],
    desc: 'Send a romantic propose card with shayari for someone',
    category: 'fun',
    filename: __filename,
    react: '❤️'
}, async (client, message, match, { from, reply }) => {
    const name = (message.body || '').split(' ').slice(1).join(' ').trim();

    if (!name) {
        return reply(`💌 *PROPOSE CARD*\n\n⚠️ Kisi ka naam bhi to batao!\n📝 Use: .propose <naam>\n📝 Example: .propose Ayesha\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }

    try {
        await client.sendMessage(message.chat, { react: { text: '❤️', key: message.key } });

        const buffer = await fetchHeartBackground();
        const allPools = [SHAYARI_URDU, SHAYARI_ENGLISH, SHAYARI_ROMAN];
        const pool = allPools[Math.floor(Math.random() * allPools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, name);

        const caption = `‎💘 *_ᴘʀᴏᴘᴏsᴇ ᴄᴀʀᴅ_* 💘\n\n‎${line}\n\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: buffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await client.sendMessage(message.chat, { react: { text: '❌', key: message.key } });
        console.error('[PROPOSE] Error:', e.message);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});
