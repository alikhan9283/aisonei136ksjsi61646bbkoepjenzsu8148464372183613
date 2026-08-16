const { cmd } = require('../command');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

// A "greeting card" generator — pulls a soft background image and overlays
// a good-morning/good-night message + the sender's name in a clean card
// layout, then sends it as an actual image (not just text). This is a
// from-scratch generator (no third-party "card API") so it never depends
// on a single external service going down.
//
// Background source: Picsum (picsum.photos) — verified against official
// docs, no API key needed, reliable static-file CDN (not a JSON API that
// can 403/ENOTFOUND like waifu.pics did on this server before).

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
    try {
        const res = await axios.get(url, { ...AXIOS_DEFAULTS, responseType: 'arraybuffer', maxRedirects: 5 });
        return Buffer.from(res.data);
    } catch (e) {
        console.log('[GREETCARD] background fetch failed, using plain gradient:', e.message);
        return null; // caller falls back to a plain gradient background
    }
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

async function generateCard(mode, name) {
    const width = 900, height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgBuffer = await fetchBackgroundBuffer(mode);
    if (bgBuffer) {
        try {
            const img = await loadImage(bgBuffer);
            // Cover-fit the background image
            const scale = Math.max(width / img.width, height / img.height);
            const w = img.width * scale, h = img.height * scale;
            ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
        } catch (e) {
            console.log('[GREETCARD] background image decode failed, using gradient:', e.message);
        }
    }

    // If no background was drawn (fetch or decode failed), paint a base
    // color first so the overlay gradient isn't sitting on a blank canvas
    if (!bgBuffer) {
        ctx.fillStyle = mode === 'night' ? '#0a0a28' : '#3c2a0a';
        ctx.fillRect(0, 0, width, height);
    }

    // Dark gradient overlay (top transparent, bottom solid) so text stays readable
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (mode === 'night') {
        gradient.addColorStop(0, 'rgba(10,10,40,0.15)');
        gradient.addColorStop(0.55, 'rgba(10,10,40,0.55)');
        gradient.addColorStop(1, 'rgba(5,5,25,0.92)');
    } else {
        gradient.addColorStop(0, 'rgba(60,40,10,0.10)');
        gradient.addColorStop(0.55, 'rgba(80,50,10,0.45)');
        gradient.addColorStop(1, 'rgba(50,25,5,0.88)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Greeting title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    const title = mode === 'night' ? 'Good Night' : 'Good Morning';
    ctx.fillText(title, width / 2, height - 340);

    // Personalized name line
    if (name) {
        ctx.font = '42px sans-serif';
        ctx.fillStyle = mode === 'night' ? '#c9d6ff' : '#ffe1a8';
        ctx.fillText(name, width / 2, height - 275);
    }

    // Message line(s), word-wrapped
    const lines = mode === 'night' ? NIGHT_LINES : MORNING_LINES;
    const message = lines[Math.floor(Math.random() * lines.length)];
    ctx.font = '34px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    const wrapped = wrapText(ctx, message, width - 140);
    let y = height - 190;
    for (const line of wrapped) {
        ctx.fillText(line, width / 2, y);
        y += 46;
    }

    // Footer branding
    ctx.shadowBlur = 0;
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('SARWAR-MD', width / 2, height - 40);

    return canvas.toBuffer('image/png');
}

cmd({
    pattern: 'goodmorning',
    alias: ['gm', 'morningcard'],
    desc: 'Generate a good morning greeting card',
    category: 'fun',
    filename: __filename,
    react: '☀️'
}, async (client, message, match, { from, reply }) => {
    const name = (message.body || '').split(' ').slice(1).join(' ').trim();
    try {
        await client.sendMessage(message.chat, { react: { text: '⏳', key: message.key } });
        const buffer = await generateCard('morning', name);
        await client.sendMessage(message.chat, {
            image: buffer,
            caption: `‎*_ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ_* ☀️\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`
        }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await client.sendMessage(message.chat, { react: { text: '❌', key: message.key } });
        console.error('[GOODMORNING] Error:', e);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});

cmd({
    pattern: 'goodnight',
    alias: ['gn', 'nightcard'],
    desc: 'Generate a good night greeting card',
    category: 'fun',
    filename: __filename,
    react: '🌙'
}, async (client, message, match, { from, reply }) => {
    const name = (message.body || '').split(' ').slice(1).join(' ').trim();
    try {
        await client.sendMessage(message.chat, { react: { text: '⏳', key: message.key } });
        const buffer = await generateCard('night', name);
        await client.sendMessage(message.chat, {
            image: buffer,
            caption: `‎*_ɢᴏᴏᴅ ɴɪɢʜᴛ_* 🌙\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`
        }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await client.sendMessage(message.chat, { react: { text: '❌', key: message.key } });
        console.error('[GOODNIGHT] Error:', e);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});
