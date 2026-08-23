const { cmd } = require("../command");
const axios = require("axios");

// Uses ONLY axios (already installed in this bot) — no extra npm package
// needed, so this works on Heroku without any npm install step.
//
// Tries several free, no-key "removebg" HTTP endpoints in sequence. If
// one is down or its response shape doesn't match what's expected, the
// next is tried automatically.

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
};

async function uploadToCatbox(buffer) {
    // Node 18+ has built-in FormData/Blob — no "form-data" package needed.
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", new Blob([buffer]), "image.jpg");

    const res = await axios.post("https://catbox.moe/user/api.php", form, { timeout: 30000 });
    const url = String(res.data || "").trim();
    if (!url.startsWith("http")) throw new Error("catbox upload did not return a usable URL");
    return url;
}

async function removeBgFromUrl(imageUrl) {
    const errors = [];

    // Candidate 1: api.betabotz.eu.org (base URL confirmed via a public
    // gist showing this domain used by the same tool family)
    try {
        const res = await axios.get(`https://api.betabotz.eu.org/api/tools/removebg`, {
            ...AXIOS_DEFAULTS,
            params: { url: imageUrl }
        });
        const result = res.data?.result || res.data?.data?.image_data || res.data?.image_data || res.data?.url;
        if (result) return result;
        errors.push("betabotz.eu.org: no usable field in response");
    } catch (e) {
        errors.push(`betabotz.eu.org: ${e.response?.status || ''} ${e.message}`);
    }

    // Candidate 2: siputzx (same family of free scraper APIs used
    // elsewhere in this bot, tools category)
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/tools/removebg`, {
            ...AXIOS_DEFAULTS,
            params: { url: imageUrl },
            responseType: 'arraybuffer'
        });
        const contentType = res.headers['content-type'] || '';
        if (contentType.startsWith('image/')) {
            return Buffer.from(res.data); // this one returns raw image bytes directly
        }
        errors.push("siputzx: response was not an image");
    } catch (e) {
        errors.push(`siputzx: ${e.response?.status || ''} ${e.message}`);
    }

    throw new Error(errors.join(" | "));
}

cmd({
    pattern: "removebg",
    alias: ["rmbg", "nobg"],
    react: "✂️",
    desc: "Remove the background from a replied image",
    category: "tools",
    use: ".removebg (reply to an image)",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    try {
        const q = message.quoted;
        const mtype = q?.mtype;

        if (!q || mtype !== "imageMessage") {
            return reply(`✂️ *REMOVE BACKGROUND*\n\n⚠️ Reply to an image\n💡 Use: .removebg (as a reply to a photo)\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "✂️", key: message.key } }).catch(() => {});

        const buffer = await q.download();
        if (!buffer || buffer.length < 100) {
            throw new Error("Downloaded image is empty or too small");
        }

        const imageUrl = await uploadToCatbox(buffer);
        const result = await removeBgFromUrl(imageUrl);

        // result may be a URL string (candidate 1) or already a Buffer (candidate 2)
        let outputBuffer;
        if (Buffer.isBuffer(result)) {
            outputBuffer = result;
        } else {
            const finalRes = await axios.get(result, { responseType: "arraybuffer", timeout: 30000 });
            outputBuffer = Buffer.from(finalRes.data);
        }

        await client.sendMessage(message.chat, {
            image: outputBuffer,
            caption: `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ RemoveBG Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Background removal failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
