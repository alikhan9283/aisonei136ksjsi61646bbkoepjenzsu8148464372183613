const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

cmd({
    pattern: "sticker5",
    alias: ["s", "stiker"],
    react: "🎨",
    desc: "Convert an image/video into a high-quality sticker",
    category: "converter",
    use: ".sticker (reply to an image/video)",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    let inputPath, outputPath;
    try {
        const q = message.quoted;
        const mtype = q?.mtype;

        if (!q || (mtype !== "imageMessage" && mtype !== "videoMessage")) {
            return reply(`🎨 *STICKER MAKER*\n\n⚠️ Reply to an image or short video\n💡 Use: .sticker (as a reply)\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "🎨", key: message.key } });

        const buffer = await q.download();
        const ext = mtype === "videoMessage" ? 'mp4' : 'png';
        inputPath = path.join('/tmp', `sticker_in_${Date.now()}.${ext}`);
        outputPath = path.join('/tmp', `sticker_out_${Date.now()}.webp`);
        fs.writeFileSync(inputPath, buffer);

        await new Promise((resolve, reject) => {
            let command = ffmpeg(inputPath);

            if (mtype === "videoMessage") {
                command = command
                    .duration(6) // WhatsApp animated stickers cap around 6s
                    .fps(15)
                    .videoFilters([
                        'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
                    ])
                    .outputOptions(['-vcodec', 'libwebp', '-lossless', '0', '-qscale', '75', '-preset', 'default', '-loop', '0', '-an', '-vsync', '0']);
            } else {
                command = command
                    .videoFilters([
                        'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
                    ])
                    .outputOptions(['-vcodec', 'libwebp', '-lossless', '1', '-qscale', '100', '-preset', 'picture']);
            }

            command
                .toFormat('webp')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });

        if (!fs.existsSync(outputPath)) throw new Error('Sticker conversion failed');

        await client.sendMessage(message.chat, {
            sticker: fs.readFileSync(outputPath),
            packname: "⑅⃝⃕͜➳ᷝ͢•ⷨ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
            author: "923242895504"
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error("❌ Sticker Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`❌ *Sticker creation failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    } finally {
        try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
        try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }
});
