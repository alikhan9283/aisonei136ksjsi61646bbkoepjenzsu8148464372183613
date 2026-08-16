const { cmd } = require('../command');
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');

// A "greeting card" generator — pulls a soft aesthetic background image and
// overlays a good-morning/good-night message + the sender's name in a
// clean card layout, then sends it as an actual image (not just text).
// This is intentionally a from-scratch generator (no third-party "card
// API") so it never depends on an external service going down.

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

async function fetchBackground(mode) {
    const errors = [];
    const category = mode === 'night' ? 'https://api.waifu.pics/sfw/waifu' : 'https://api.waifu.pics/sfw/smile';

    try {
        const res = await axios.get(category, AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { errors.push(`waifu.pics: ${e.message}`); }

    try {
        const res = await axios.get('https://api.waifu.im/search?is_nsfw=false', AXIOS_DEFAULTS);
        const img = res.data?.images?.[0]?.url;
        if (img) return img;
    } catch (e) { errors.push(`waifu.im: ${e.message}`); }

    console.error('[GREETCARD] background fetch failed:', errors.join(' | '));
    return null; // caller falls back to a plain gradient background
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

    const bgUrl = await fetchBackground(mode);
    if (bgUrl) {
        try {
            const bgRes = await axios.get(bgUrl, { responseType: 'arraybuffer', timeout: 20000, headers: AXIOS_DEFAULTS.headers });
            const img = await loadImage(Buffer.from(bgRes.data));
            // Cover-fit the background image
            const scale = Math.max(width / img.width, height / img.height);
            const w = img.width * scale, h = img.height * scale;
            ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
        } catch (e) {
            console.log('[GREETCARD] background image load failed, using gradient:', e.message);
        }
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
}, async (conn, mek, m, { from, args, reply }) => {
    const name = args.join(' ').trim();
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const buffer = await generateCard('morning', name);
        await conn.sendMessage(from, {
            image: buffer,
            caption: `‎*_ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ_* ☀️\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
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
}, async (conn, mek, m, { from, args, reply }) => {
    const name = args.join(' ').trim();
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const buffer = await generateCard('night', name);
        await conn.sendMessage(from, {
            image: buffer,
            caption: `‎*_ɢᴏᴏᴅ ɴɪɢʜᴛ_* 🌙\n‎*╭───────◉◉◉────━┈៚*\n‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* \n‎*╰───────◉◉◉────━┈៚*`
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        console.error('[GOODNIGHT] Error:', e);
        reply(`⚠️ Error generating card: ${e.message}`);
    }
});
