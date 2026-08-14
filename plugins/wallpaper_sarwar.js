const { cmd } = require("../command");
const axios = require('axios');

// Curated anime-style prompts so ".wallpaper" gives a fresh HD anime-style
// image each time without needing a search-based wallpaper API (which kept
// failing). Pollinations is the same image provider seen powering the
// Adeel txt2img API, so it's confirmed reachable.
const prompts = [
    "cinematic anime boy with glowing blue eyes, neon city background, ultra detailed, 4k wallpaper",
    "anime girl with cherry blossoms, soft lighting, studio ghibli style, ultra hd wallpaper",
    "anime warrior in red hoodie, ice crystals, dramatic lighting, 4k detailed wallpaper",
    "dark fantasy anime landscape, glowing runes, moonlight, cinematic 4k wallpaper",
    "anime samurai silhouette, sunset, cherry blossom petals, ultra detailed wallpaper",
    "cyberpunk anime city street, neon lights, rain reflections, 4k cinematic wallpaper",
    "anime mecha robot, epic battle scene, dramatic sky, ultra hd wallpaper",
    "anime girl with white hair, galaxy background, glowing particles, 4k wallpaper",
    "anime dragon flying over mountains, epic fantasy, cinematic 4k wallpaper",
    "anime demon hunter with sword, dark aura, dramatic lighting, ultra detailed wallpaper"
];

cmd({
    pattern: "wallpaper2",
    alias: ["animewall", "animehd", "anime4k"],
    react: "🖼️",
    desc: "Get a random anime HD wallpaper",
    category: "fun",
    use: ".wallpaper",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendMessage(message.chat, { react: { text: "🖼️", key: message.key } });

        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        const seed = Date.now();
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;

        // Verify the image actually resolves before sending, so a dead
        // response doesn't silently show as a broken image in chat.
        await axios.head(imageUrl, { timeout: 25000 }).catch(async () => {
            // Some hosts don't support HEAD — fall back to a light GET check
            await axios.get(imageUrl, { timeout: 25000, responseType: 'arraybuffer', maxContentLength: 50 * 1024 * 1024 });
        });

        const caption =
            `╭───────────────⊷\n` +
            `│  ⑅⃝⃕͜➳ᷝ͢•ⷨ *ANIME HD WALLPAPER* 🖼️\n` +
            `├───────────────⊷\n` +
            `│ ▸ 🔍 *QUERY:* Random\n` +
            `│ ▸ 📐 *QUALITY:* HD\n` +
            `╰───────────────⊷\n\n` +
            `> ⑅⃝⃕͜➳ᷝ͢•ⷨ ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`;

        await client.sendMessage(message.chat, {
            image: { url: imageUrl },
            caption: caption
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error("❌ Wallpaper Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`❌ *Failed to fetch wallpaper!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
