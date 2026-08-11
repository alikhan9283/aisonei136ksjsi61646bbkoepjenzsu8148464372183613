const axios = require('axios');
const { cmd } = require('../command');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

function isLikelyAudio(buffer) {
    if (!buffer || buffer.length < 15000) return false;
    const head = buffer.slice(0, 12);
    const asText = head.toString('utf8', 0, 20).trim().toLowerCase();
    if (asText.startsWith('<') || asText.startsWith('{') || asText.startsWith('<!doctype')) return false;
    return true;
}

cmd({
    pattern: "tiktokmp3",
    alias: ["ttaudio", "ttmp3"],
    react: "🎵",
    desc: "Download TikTok audio only",
    category: "downloader",
    use: ".tiktokmp3 <TikTok URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    let tempVideoPath, opusPath;
    try {
        const url = q ? q.trim() : "";

        if (!url || !url.includes('tiktok')) {
            return reply("❌ Please provide a TikTok link.\n📝 Usage: .tiktokmp3 <link>");
        }

        await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });

        const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 30000 });
        const d = res.data?.data;
        if (!d) throw new Error('Failed to fetch TikTok data');

        const caption =
            `\`${d.title?.slice(0, 60) || 'TikTok Audio'}\`\n\n` +
            `👤 *Author:* @${d.author?.unique_id || 'unknown'}\n\n` +
            `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`;

        // Try direct music URL first
        if (d.music) {
            try {
                const musicUrl = d.music.startsWith('http') ? d.music : `https://tikwm.com${d.music}`;
                const audioRes = await axios.get(musicUrl, {
                    responseType: 'arraybuffer', timeout: 40000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.tiktok.com/' }
                });
                const buf = Buffer.from(audioRes.data);
                if (isLikelyAudio(buf)) {
                    await conn.sendMessage(from, {
                        audio: buf,
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: mek });
                    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                    return;
                }
            } catch (e) { console.log('[TIKTOKMP3 direct music] failed:', e.message); }
        }

        // Fallback: download video, extract audio locally with ffmpeg
        const videoUrl = d.play?.startsWith('http') ? d.play : `https://tikwm.com${d.play}`;
        if (!videoUrl) throw new Error('No video available to extract audio from');

        const videoRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer', timeout: 40000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.tiktok.com/' }
        });
        tempVideoPath = path.join('/tmp', `tt_temp_${Date.now()}.mp4`);
        fs.writeFileSync(tempVideoPath, Buffer.from(videoRes.data));

        opusPath = path.join('/tmp', `tt_audio_${Date.now()}.ogg`);
        await new Promise((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .noVideo()
                .audioCodec('libopus')
                .audioBitrate('96k')
                .format('ogg')
                .on('end', resolve)
                .on('error', reject)
                .save(opusPath);
        });

        await conn.sendMessage(from, {
            audio: fs.readFileSync(opusPath),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("❌ TikTok Audio Error:", error);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`⚠️ Error downloading TikTok audio: ${error.message}`);
    } finally {
        try { if (tempVideoPath && fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath); } catch {}
        try { if (opusPath && fs.existsSync(opusPath)) fs.unlinkSync(opusPath); } catch {}
    }
});
