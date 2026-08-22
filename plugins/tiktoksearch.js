// commands/tourl.js
// SARWAR MD — Media to URL Uploader

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const FormData = require('form-data');
const { cmd } = require("../command");

cmd({
    pattern: "tourl",
    alias: ["imgtourl", "imgurl", "url", "geturl", "upload"],
    react: "🖇",
    desc: "📤 Convert media to Catbox URL",
    category: "utility",
    filename: __filename,
    use: ".tourl [reply to media]"
}, async (conn, message, m, { from, reply }) => {
    try {
        // Check if media is quoted
        const quotedMsg = message.quoted || message;
        const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

        if (!mimeType) {
            return reply(`🖇 *MEDIA TO URL*

╭━━━〔 USAGE 〕━━━╮
│ Reply to an image, video, or audio
│ with .tourl
╰━━━━━━━━━━━━━━━━╯

📝 *Example:*
• Reply to an image
• Type: .tourl

⚡ *Features:*
• Uploads to Catbox
• Returns direct URL
• Supports all media types

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
        }

        // Send reaction
        await conn.sendMessage(from, {
            react: { text: '🖇', key: message.key }
        });

        // Download media
        const mediaBuffer = await quotedMsg.download();
        if (!mediaBuffer || mediaBuffer.length === 0) {
            throw new Error("Failed to download media");
        }

        // Determine extension
        let extension = '';
        if (mimeType.includes('image/jpeg')) extension = '.jpg';
        else if (mimeType.includes('image/png')) extension = '.png';
        else if (mimeType.includes('image/webp')) extension = '.webp';
        else if (mimeType.includes('video/mp4')) extension = '.mp4';
        else if (mimeType.includes('audio/mpeg')) extension = '.mp3';
        else if (mimeType.includes('audio/ogg')) extension = '.ogg';
        else if (mimeType.includes('audio/mp4')) extension = '.m4a';
        else if (mimeType.includes('audio/x-m4a')) extension = '.m4a';
        else if (mimeType.includes('audio/wav')) extension = '.wav';
        else if (mimeType.includes('image/gif')) extension = '.gif';
        else extension = '.bin';

        // Save temp file
        const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}${extension}`);
        fs.writeFileSync(tempFilePath, mediaBuffer);

        // Upload using FormData
        const form = new FormData();
        form.append('file', fs.createReadStream(tempFilePath), `file${extension}`);

        const response = await axios.post('https://adeel-xtech-apis.vercel.app/api/imgtourl', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 60000
        });

        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        // Check response
        if (!response.data || response.data.status !== true || !response.data.result || !response.data.result.url) {
            throw new Error("Failed to upload to API");
        }

        const mediaUrl = response.data.result.url.trim();

        // Determine media type
        let mediaType = '📁 File';
        if (mimeType.includes('image')) mediaType = '📸 Image';
        else if (mimeType.includes('video')) mediaType = '🎬 Video';
        else if (mimeType.includes('audio')) mediaType = '🎵 Audio';

        // Format file size
        const size = formatBytes(mediaBuffer.length);

        // Send response
        const caption = `🖇 *${mediaType} UPLOADED*

╭━━━〔 DETAILS 〕━━━╮
│ 📦 Size: ${size}
│ 🔗 URL: ${mediaUrl}
╰━━━━━━━━━━━━━━━━╯

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        await conn.sendMessage(from, {
            text: caption
        }, { quoted: message });

        // Send URL as copyable text
        await conn.sendMessage(from, {
            text: `📋 *Copy this URL:*\n${mediaUrl}`
        }, { quoted: message });

        await conn.sendMessage(from, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error("❌ Tourl Error:", error);
        await conn.sendMessage(from, {
            react: { text: '❌', key: message.key }
        });
        reply(`❌ *Error:* ${error.message || error}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`);
    }
});

// ─────────────────────────────────────────────────────────────
//  HELPER: Format Bytes
// ─────────────────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
}
