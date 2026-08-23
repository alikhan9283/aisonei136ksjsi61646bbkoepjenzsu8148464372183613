const { cmd } = require("../command");
const { removebg } = require("betabotz-tools");
const axios = require("axios");

// Uses betabotz-tools (npm), which wraps a free scraper backed by
// cdn.btch.bz / aemt.me — confirmed via the package's own README/source
// example: removebg(url) returns { image_data: <result image url>, image_size }
// No API key needed. Install with: npm install betabotz-tools

cmd({
    pattern: "removebg",
    alias: ["rmbg", "nobg"],
    react: "✂️",
    desc: "Remove the background from a replied image",
    category: "tools",
    use: ".removebg (reply to an image)",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    let downloadedBuffer;
    try {
        const q = message.quoted;
        const mtype = q?.mtype;

        if (!q || mtype !== "imageMessage") {
            return reply(`✂️ *REMOVE BACKGROUND*\n\n⚠️ Reply to an image\n💡 Use: .removebg (as a reply to a photo)\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "✂️", key: message.key } }).catch(() => {});

        // betabotz-tools' removebg() takes a direct image URL, not a
        // buffer — so we need a temporary public URL. We upload the
        // downloaded image bytes to a free anonymous host (catbox.moe)
        // first, then pass that URL to removebg().
        const buffer = await q.download();
        if (!buffer || buffer.length < 100) {
            throw new Error("Downloaded image is empty or too small");
        }

        const FormData = require("form-data");
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", buffer, { filename: "image.jpg" });

        const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders(),
            timeout: 30000
        });
        const imageUrl = String(uploadRes.data).trim();
        if (!imageUrl.startsWith("http")) {
            throw new Error("Failed to get a temporary upload URL for the image");
        }

        const result = await removebg(imageUrl);
        if (!result?.image_data) {
            throw new Error("removebg service returned no result");
        }

        const finalRes = await axios.get(result.image_data, { responseType: "arraybuffer", timeout: 30000 });

        await client.sendMessage(message.chat, {
            image: Buffer.from(finalRes.data),
            caption: `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ RemoveBG Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Background removal failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
