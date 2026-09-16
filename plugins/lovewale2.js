const { cmd } = require("../command");
const axios = require("axios");

// Same "fake animated progress bar" style as .hack — purely a visual/text
// animation effect (edits one message repeatedly to simulate loading),
// no real process happening. Romantic/dil theme instead of hacking theme.

const SHAYARI_URDU = [
    'تیرے بغیر یہ دل کی دھڑکن بھی ادھوری سی لگتی ہے...\nتُو مل جائے تو شاید یہ زندگی پوری ہو جائے 💔',
    'ہزاروں خواہشیں تھیں دل میں، مگر ایک ہی سچی تھی —\nتُو میری بن جائے 🖤',
    'نہ جانے کیوں دل ہر پل تیری طرف کھنچا چلا جاتا ہے،\nشاید یہی تو محبت کہلاتی ہے 💘'
];
const SHAYARI_ROMAN = [
    'Tere bina ye dil ki dhadkan bhi adhoori si lagti hai...\nTu mil jaye to shayad ye zindagi poori ho jaye 💔',
    'Hazaaron khwahishen thi dil mein, magar ek hi sacchi thi —\nTu meri ban jaye 🖤',
    'Na jaane kyun dil har pal teri taraf khincha chala jata hai,\nshayad yehi to mohabbat kehlati hai 💘'
];
const SHAYARI_ENGLISH = [
    'Every heartbeat whispers your name...\nMaybe love was always meant to find its way to you 💔',
    'A thousand wishes lived in my heart, but only one was true —\nbe mine 🖤',
    'I don\'t know why my heart keeps drifting toward you,\nmaybe that\'s just what love feels like 💘'
];

async function fetchRomanticImage() {
    // nekos.best "waifu"/"smug" categories — fictional anime art, no real
    // people, confirmed live-working earlier in this bot for .attitudegirl.
    const categories = ['waifu', 'smug', 'happy', 'wave'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, { timeout: 20000 });
    const url = res.data?.results?.[0]?.url;
    if (!url) throw new Error('No image found');
    const imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    return Buffer.from(imgRes.data);
}

function bar(percent) {
    const filled = Math.round(percent / 10);
    return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${percent}%`;
}

cmd({
    pattern: "loveyou",
    alias: ["iloveyou", "loveu"],
    react: "💞",
    desc: "Animated 'love you' sequence with shayari and a romantic pic",
    category: "fun",
    use: ".loveyou",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "💞", key: message.key } }).catch(() => {});

        // Step 1: connecting-style intro
        const sent = await client.sendMessage(message.chat, {
            text: `💗 *CONNECTING TO HEART...*\n\nMohabbat ......[OK]\nEhsaas ........[OK]\nYaadein ........[OK]\n\n✅ Connected 💓`
        }, { quoted: message });

        await new Promise((r) => setTimeout(r, 1500));

        // Step 2: animated progress bar, edited in place a few times
        for (const percent of [20, 45, 70, 90, 100]) {
            await client.sendMessage(message.chat, {
                text: `💘 *SENDING LOVE...*\n\n${bar(percent)}`,
                edit: sent.key
            }).catch(async () => {
                // If edit isn't supported by this client version, just
                // send a new message instead of failing the whole thing.
                await client.sendMessage(message.chat, { text: `💘 *SENDING LOVE...*\n\n${bar(percent)}` });
            });
            await new Promise((r) => setTimeout(r, 900));
        }

        // Step 3: the actual message — pick a random language + line
        const pools = [SHAYARI_URDU, SHAYARI_ROMAN, SHAYARI_ENGLISH];
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const line = pool[Math.floor(Math.random() * pool.length)];

        let imageBuffer;
        try {
            imageBuffer = await fetchRomanticImage();
        } catch (e) {
            console.log("[LOVEYOU] image fetch failed, sending text only:", e.message);
        }

        const caption =
            `💞💞💞 *I LOVE YOU* 💞💞💞\n\n` +
            `${line}\n\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        if (imageBuffer) {
            await client.sendMessage(message.chat, { image: imageBuffer, caption }, { quoted: message });
        } else {
            await client.sendMessage(message.chat, { text: caption }, { quoted: message });
        }

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ LoveYou Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ Error: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
