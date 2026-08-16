const { cmd } = require('../command');
const axios = require('axios');

// A "greeting card" command — sends a nice aesthetic background image with
// the good-morning/good-night message as the caption. Deliberately uses
// ONLY axios (already installed and working elsewhere in this bot) — no
// canvas, no jimp, no extra npm package. Both of those needed a package
// install that wasn't done, which silently broke the command with zero
// visible error on Heroku. This version can't have that problem since it
// adds no new dependency at all.

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

const MORNING_LINES = [
    'Wishing you a morning as bright as your smile 🌸',
    'Rise and shine — today is your day! ☀️',
    'A fresh morning, a fresh start. Good morning! 🌷',
    'May your coffee be strong and your day be blessed ☕'
];

const NIGHT_LINES = [
    'Sweet dreams and a peaceful night 🌙',
    'Rest well, tomorrow is a new beginning ✨',
    'May your night be calm and your dreams be sweet 🌌',
    'Close your eyes, the stars are watching over you 💫'
];

async function fetchBackgroundBuffer(mode) {
    const seed = `${mode}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const url = `https://picsum.photos/seed/${seed}/900/1200`;
    const res = await axios.get(url, { ...AXIOS_DEFAULTS, responseType: 'arraybuffer', maxRedirects: 5 });
    return Buffer.from(res.data);
}

cmd({
    pattern: 'goodmorning',
    alias: ['gm', 'morningcard'],
    desc: 'Send a good morning greeting card',
    category: 'fun',
    filename: __filename,
    react: '☀️'
}, async (client, message, match, { from, reply }) => {
    const name = (message.body || '').split(' ').slice(1).join(' ').trim();
    try {
        await client.sendMessage(message.chat, { react: { text: '⏳', key: message.key } });

        const buffer = await fetchBackgroundBuffer('morning');
        const line = MORNING_LINES[Math.floor(Math.random() * MORNING_LINES.length)];

        const caption = `‎*_ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ_* ☀️${name ? `\n‎${name}` : ''}\n\n‎${line}\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: buffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await client.sendMessage(message.chat, { react: { text: '❌', key: message.key } });
        console.error('[GOODMORNING] Error:', e.message);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});

cmd({
    pattern: 'goodnight',
    alias: ['gn', 'nightcard'],
    desc: 'Send a good night greeting card',
    category: 'fun',
    filename: __filename,
    react: '🌙'
}, async (client, message, match, { from, reply }) => {
    const name = (message.body || '').split(' ').slice(1).join(' ').trim();
    try {
        await client.sendMessage(message.chat, { react: { text: '⏳', key: message.key } });

        const buffer = await fetchBackgroundBuffer('night');
        const line = NIGHT_LINES[Math.floor(Math.random() * NIGHT_LINES.length)];

        const caption = `‎*_ɢᴏᴏᴅ ɴɪɢʜᴛ_* 🌙${name ? `\n‎${name}` : ''}\n\n‎${line}\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: buffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await client.sendMessage(message.chat, { react: { text: '❌', key: message.key } });
        console.error('[GOODNIGHT] Error:', e.message);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});
