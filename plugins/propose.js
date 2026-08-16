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

// Deep, intense shayari-style lines — {name} gets replaced with the given name
const SHAYARI_LINES = [
    'तेरे बिना ये दिल की धड़कन भी अधूरी सी लगती है, {name}...\nतू मिल जाए तो शायद ये ज़िंदगी पूरी हो जाए 💔',
    'हज़ारों ख्वाहिशें थीं दिल में, मगर एक ही सच्ची थी — {name}, तू मेरी बन जाए 🖤',
    'दुनिया की हर दौलत छोड़ दूं, बस {name} तू मेरे पास रहे... यही मेरी सबसे बड़ी ख्वाहिश है ✨',
    'ना जाने क्यों दिल हर पल {name} की तरफ खिंचा चला जाता है,\nशायद यही तो मोहब्बत कहलाती है 💘',
    '{name}, तेरे नाम से ही सुकून मिलता है दिल को,\nतू मिल जाए तो ये अधूरी कहानी पूरी हो जाए 🥀',
    'हर धड़कन में बस एक ही नाम है — {name},\nतुझसे मोहब्बत करना ही मेरी सबसे बड़ी सच्चाई है ❤️‍🔥',
    'मैं जानता हूं ये रास्ता मुश्किल है, {name},\nमगर तेरे बिना जीना उससे भी मुश्किल है 💔✨'
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
        const line = SHAYARI_LINES[Math.floor(Math.random() * SHAYARI_LINES.length)].replace(/\{name\}/g, name);

        const caption = `‎💘 *_ᴘʀᴏᴘᴏsᴇ ᴄᴀʀᴅ_* 💘\n\n‎${line}\n\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: buffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await client.sendMessage(message.chat, { react: { text: '❌', key: message.key } });
        console.error('[PROPOSE] Error:', e.message);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});
