const { cmd } = require("../command");
const axios = require("axios");

let remini;
try {
    remini = require("betabotz-tools").remini;
} catch (e) {
    console.error("[REMINI] 'betabotz-tools' package is not installed. Run: npm install betabotz-tools");
}

// Uses betabotz-tools (npm), which wraps a free scraper backed by
// cdn.btch.bz / aemt.me — confirmed via the package's own README/source
// example: remini(url) returns { image_data: <enhanced image url>, image_size }
// No API key needed. Install with: npm install betabotz-tools

cmd({
    pattern: "remini",
    alias: ["enhance", "upscale", "hd"],
    react: "✨",
    desc: "Enhance/upscale the quality of a replied image",
    category: "tools",
    use: ".remini (reply to an image)",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        if (!remini) {
            return reply(`❌ Missing dependency on the server: 'betabotz-tools'\nAsk the bot owner to run: npm install betabotz-tools\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        const q = message.quoted;
        const mtype = q?.mtype;

        if (!q || mtype !== "imageMessage") {
            return reply(`✨ *IMAGE ENHANCER*\n\n⚠️ Reply to an image\n💡 Use: .remini (as a reply to a photo)\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "✨", key: message.key } }).catch(() => {});

        const buffer = await q.download();
        if (!buffer || buffer.length < 100) {
            throw new Error("Downloaded image is empty or too small");
        }

        // Use Node's built-in FormData/Blob (Node 18+) instead of the
        // "form-data" package, so this step needs no extra npm install.
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", new Blob([buffer]), "image.jpg");

        const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
            timeout: 30000
        });
        const imageUrl = String(uploadRes.data).trim();
        if (!imageUrl.startsWith("http")) {
            throw new Error("Failed to get a temporary upload URL for the image");
        }

        const result = await remini(imageUrl);
        if (!result?.image_data) {
            throw new Error("remini service returned no result");
        }

        const finalRes = await axios.get(result.image_data, { responseType: "arraybuffer", timeout: 30000 });

        await client.sendMessage(message.chat, {
            image: Buffer.from(finalRes.data),
            caption: `✨ *Enhanced!*${result.image_size ? `\n📦 ${result.image_size}` : ""}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ Remini Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Image enhancement failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
