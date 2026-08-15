const { cmd } = require("../command");
const axios = require('axios');

// Uses the same Adeel-Xtech txt2img endpoint (Pollinations backend) that
// was already confirmed working earlier in this bot for .txt2img — no
// search/relevance issues since it generates the image directly from a
// fixed prompt instead of depending on search results.
const prompts = [
    "anime girl attitude pose, confident expression, cool aesthetic, detailed anime art, 4k",
    "badass anime girl, sunglasses, cool attitude, cinematic lighting, detailed anime art",
    "anime girl smug expression, stylish outfit, aesthetic background, detailed anime art",
    "confident anime girl, arms crossed, cool pose, vibrant colors, detailed anime art",
    "anime girl with attitude, dramatic lighting, aesthetic vibe, detailed anime art, 4k"
];

async function fetchAttitudeGirl() {
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    const errors = [];

    try {
        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/txt2img?prompt=${encodeURIComponent(prompt)}`;
        const { data } = await axios.get(apiUrl, { timeout: 60000 });
        if (data?.status && data?.result) {
            // Download the actual image bytes server-side — Pollinations can
            // take a while to render, and letting WhatsApp/Baileys fetch the
            // URL directly often times out before the image is ready.
            const imgRes = await axios.get(data.result, { responseType: 'arraybuffer', timeout: 60000 });
            return Buffer.from(imgRes.data);
        }
        errors.push('adeel-xtech: no result in response');
    } catch (e) {
        errors.push(`adeel-xtech: ${e.code || ''} ${e.message}`);
    }

    // Direct Pollinations fallback in case the Adeel wrapper itself is down
    try {
        const seed = Date.now();
        const directUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
        const imgRes = await axios.get(directUrl, { responseType: 'arraybuffer', timeout: 60000 });
        return Buffer.from(imgRes.data);
    } catch (e) {
        errors.push(`pollinations-direct: ${e.code || ''} ${e.message}`);
    }

    throw new Error(errors.join(' | '));
}

cmd({
    pattern: "attitudegirl2",
    alias: ["girlattitude", "attigirl"],
    react: "😎",
    desc: "Random anime girl attitude/aesthetic image",
    category: "anime",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "😎", key: message.key } });

        const imgBuffer = await fetchAttitudeGirl();
        const caption = `‎*_ᴀᴛᴛɪᴛᴜᴅᴇ ɢɪʀʟ_* 😎
‎╭───────────────━┈⊷
‎│▸🎴 AI Generated Attitude Anime Girl
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

        await client.sendMessage(message.chat, { image: imgBuffer, caption }, { quoted: message });
        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("❌ AttitudeGirl Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`⚠️ Error fetching attitude girl image:\n${error.message}`);
    }
});
