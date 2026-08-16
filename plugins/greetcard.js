const { cmd } = require('../command');
const axios = require('axios');
const Jimp = require('jimp');

// A "greeting card" generator — pulls a background image and overlays a
// good-morning/good-night message + the sender's name, then sends it as
// an actual image. Uses Jimp instead of "canvas" because Jimp has ZERO
// native dependencies (pure JavaScript) — canvas is a native module that
// often fails to install silently on Heroku without extra buildpacks,
// which was causing this whole file to fail to load with no error visible
// in the (inaccessible) Heroku logs.

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

const MORNING_LINES = [
    'Wishing you a morning as bright as your smile',
    'Rise and shine, today is your day!',
    'A fresh morning, a fresh start. Good morning!',
    'May your coffee be strong and your day be blessed'
];

const NIGHT_LINES = [
    'Sweet dreams and a peaceful night',
    'Rest well, tomorrow is a new beginning',
    'May your night be calm and your dreams be sweet',
    'Close your eyes, the stars are watching over you'
];

async function fetchBackgroundBuffer(mode) {
    const seed = `${mode}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const url = `https://picsum.photos/seed/${seed}/900/1200`;
    try {
        const res = await axios.get(url, { ...AXIOS_DEFAULTS, responseType: 'arraybuffer', maxRedirects: 5 });
        return Buffer.from(res.data);
    } catch (e) {
        console.log('[GREETCARD] background fetch failed, using plain color:', e.message);
        return null;
    }
}

async function generateCard(mode, name) {
    const width = 900, height = 1200;

    let image;
    const bgBuffer = await fetchBackgroundBuffer(mode);
    if (bgBuffer) {
        try {
            image = await Jimp.read(bgBuffer);
            image.cover(width, height);
        } catch (e) {
            console.log('[GREETCARD] background decode failed, using plain color:', e.message);
            image = null;
        }
    }
    if (!image) {
        const baseColor = mode === 'night' ? 0x0a0a28ff : 0x3c2a0aff;
        image = new Jimp(width, height, baseColor);
    }

    // Dark overlay so text stays readable — built as a semi-transparent
    // black rectangle drawn near the bottom two-thirds of the card.
    const overlay = new Jimp(width, height, 0x00000000);
    const overlayColor = mode === 'night' ? 0x050519 : 0x2a1505;
    for (let y = 0; y < height; y++) {
        // stronger opacity toward the bottom, lighter toward the top
        const progress = y / height;
        const alpha = Math.min(0.92, Math.max(0.08, progress * 0.95));
        const rowColor = Jimp.rgbaToInt(
            (overlayColor >> 16) & 0xff,
            (overlayColor >> 8) & 0xff,
            overlayColor & 0xff,
            Math.round(alpha * 255)
        );
        for (let x = 0; x < width; x += 4) { // step by 4px for performance
            overlay.setPixelColor(rowColor, x, y);
            overlay.setPixelColor(rowColor, Math.min(x + 1, width - 1), y);
            overlay.setPixelColor(rowColor, Math.min(x + 2, width - 1), y);
            overlay.setPixelColor(rowColor, Math.min(x + 3, width - 1), y);
        }
    }
    image.composite(overlay, 0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1, opacityDest: 1 });

    // Fonts — Jimp ships built-in bitmap fonts, no external font files needed
    const titleFont = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const nameFont = await Jimp.loadFont(mode === 'night' ? Jimp.FONT_SANS_32_WHITE : Jimp.FONT_SANS_32_WHITE);
    const msgFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    const footerFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    const title = mode === 'night' ? 'Good Night' : 'Good Morning';
    image.print(titleFont, 0, height - 380, {
        text: title, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, width);

    if (name) {
        image.print(nameFont, 0, height - 290, {
            text: name, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
        }, width);
    }

    const lines = mode === 'night' ? NIGHT_LINES : MORNING_LINES;
    const message = lines[Math.floor(Math.random() * lines.length)];
    image.print(msgFont, 80, height - 220, {
        text: message, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, width - 160);

    image.print(footerFont, 0, height - 60, {
        text: 'SARWAR-MD', alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, width);

    return image.getBufferAsync(Jimp.MIME_PNG);
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
