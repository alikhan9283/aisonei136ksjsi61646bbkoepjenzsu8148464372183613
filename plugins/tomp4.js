const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

function runFfmpeg(inputPath, outputPath, isStaticFallback) {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);

        if (isStaticFallback) {
            command = command
                .inputOptions(['-loop', '1'])
                .videoFilters([
                    'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0'
                ])
                .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '3', '-movflags', '+faststart']);
        } else {
            command = command
                .videoFilters([
                    'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0'
                ])
                .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']);
        }

        command
            .toFormat('mp4')
            .on('start', (cmdLine) => console.log('[TOMP4] ffmpeg start:', cmdLine))
            .on('stderr', (line) => console.log('[TOMP4] ffmpeg stderr:', line))
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

async function safeReply(client, message, reply, text) {
    try {
        await reply(text);
    } catch (e) {
        console.log('[TOMP4] reply() helper failed, falling back to sendMessage:', e.message);
        try {
            await client.sendMessage(message.chat, { text }, { quoted: message });
        } catch (e2) {
            console.error('[TOMP4] sendMessage fallback also failed:', e2.message);
        }
    }
}

cmd({
    pattern: "tomp4",
    alias: ["stickertovideo", "sticker2video", "s2v"],
    react: "🎬",
    desc: "Convert a replied sticker (animated or static) into a video/mp4",
    category: "converter",
    use: ".tomp4 (reply to a sticker)",
    filename: __filename
}, async (client, message, match, { from, reply }) => {
    let inputPath, outputPath;

    try {
        const q = message.quoted;
        const mtype = q?.mtype;

        if (!q || mtype !== "stickerMessage") {
            await safeReply(client, message, reply, `🎬 *STICKER TO VIDEO*\n\n⚠️ Reply to a sticker\n💡 Use: .tomp4 (as a reply to a sticker)\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
            return;
        }

        await client.sendMessage(message.chat, { react: { text: "🎬", key: message.key } }).catch(() => {});

        console.log('[TOMP4] downloading sticker...');
        const buffer = await q.download();
        console.log('[TOMP4] downloaded, size:', buffer?.length);

        if (!buffer || buffer.length < 20) {
            throw new Error('Downloaded sticker is empty or too small — the media may have expired');
        }

        const isWebp = buffer.slice(0, 4).toString('latin1') === 'RIFF' && buffer.slice(8, 12).toString('latin1') === 'WEBP';
        if (!isWebp) {
            throw new Error('Downloaded file is not a valid WebP sticker');
        }

        inputPath = path.join('/tmp', `tomp4_in_${Date.now()}.webp`);
        outputPath = path.join('/tmp', `tomp4_out_${Date.now()}.mp4`);
        fs.writeFileSync(inputPath, buffer);
        console.log('[TOMP4] wrote input file:', inputPath, fs.statSync(inputPath).size, 'bytes');

        let converted = false;
        let lastError = null;

        try {
            await runFfmpeg(inputPath, outputPath, false);
            converted = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
            console.log('[TOMP4] animated conversion result:', converted);
        } catch (e) {
            lastError = e;
            console.log('[TOMP4] animated conversion threw:', e.message);
        }

        if (!converted) {
            try {
                await runFfmpeg(inputPath, outputPath, true);
                converted = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
                console.log('[TOMP4] static fallback conversion result:', converted);
            } catch (e) {
                lastError = e;
                console.log('[TOMP4] static fallback conversion threw:', e.message);
            }
        }

        if (!converted) {
            throw new Error(lastError?.message || 'ffmpeg conversion failed for an unknown reason');
        }

        console.log('[TOMP4] sending video, size:', fs.statSync(outputPath).size);
        await client.sendMessage(message.chat, {
            video: fs.readFileSync(outputPath),
            mimetype: 'video/mp4',
            caption: `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});

    } catch (error) {
        console.error("❌ ToMP4 Error:", error?.stack || error);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        await safeReply(client, message, reply, `❌ *Conversion failed!*\nReason: ${error?.message || 'Unknown error'}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    } finally {
        try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
        try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }
});
