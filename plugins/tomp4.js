const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

cmd({
    pattern: "tomp4",
    alias: ["stickertovideo", "sticker2video", "s2v"],
    react: "🎬",
    desc: "Convert a replied sticker (animated) into a video/mp4",
    category: "converter",
    use: ".tomp4 (reply to a sticker)",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    let inputPath, outputPath;
    try {
        const q = message.quoted;
        const mtype = q?.mtype;

        if (!q || mtype !== "stickerMessage") {
            return reply(`🎬 *STICKER TO VIDEO*\n\n⚠️ Reply to a sticker\n💡 Use: .tomp4 (as a reply to a sticker)\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "🎬", key: message.key } });

        const buffer = await q.download();
        inputPath = path.join('/tmp', `tomp4_in_${Date.now()}.webp`);
        outputPath = path.join('/tmp', `tomp4_out_${Date.now()}.mp4`);
        fs.writeFileSync(inputPath, buffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoFilters([
                    'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0'
                ])
                .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'])
                .toFormat('mp4')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            throw new Error('Conversion failed — the sticker may not be animated (static stickers have no video to convert)');
        }

        await client.sendMessage(message.chat, {
            video: fs.readFileSync(outputPath),
            mimetype: 'video/mp4',
            caption: `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error("❌ ToMP4 Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } });
        reply(`❌ *Conversion failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    } finally {
        try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
        try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }
});
