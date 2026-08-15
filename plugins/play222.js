const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { cmd } = require("../command");
const { resolveVideo, getStreams, AXIOS_DEFAULTS } = require("../lib/ytHelper");
ffmpeg.setFfmpegPath(ffmpegPath);

cmd({
  pattern: "play7",
  alias: ["song", "ytmp3"],
  desc: "Download YouTube audio by name or link",
  react: '🎵',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  let rawPath, opusPath;
  const query = args.join(" ").trim();

  if (!query) {
    return reply("🌸 Please provide a song name or YouTube link.\n\n*Usage Example:*\n.play <song name / YouTube link>");
  }

  await store.react('⌛');

  try {
    reply(`🔎 Searching: *${query}*`);

    const video = await resolveVideo(query);

    const infoCaption = `‎*_ʏᴏᴜᴛᴜʙᴇ ᴀᴜᴅɪᴏ ʀᴇsᴜʟᴛ_* 🎵
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${video.title}
‎│▸👤 *ᴄʜᴀɴɴᴇʟ:* ${video.author}
‎│▸👁️ *ᴠɪᴇᴡs:* ${video.views}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.duration}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      image: { url: video.thumb },
      caption: infoCaption
    }, { quoted: m });

    const { audioUrl } = await getStreams(video.videoId);
    if (!audioUrl) throw new Error('No audio stream available for this video');

    const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000, headers: AXIOS_DEFAULTS.headers });
    rawPath = path.join('/tmp', `play_${Date.now()}.audio`);
    fs.writeFileSync(rawPath, Buffer.from(audioRes.data));

    opusPath = path.join('/tmp', `play_opus_${Date.now()}.ogg`);
    let sentAsOpus = false;
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .audioCodec('libopus')
          .audioBitrate('96k')
          .audioChannels(2)
          .format('ogg')
          .on('end', resolve)
          .on('error', reject)
          .save(opusPath);
      });
      await conn.sendMessage(from, {
        audio: fs.readFileSync(opusPath),
        mimetype: 'audio/ogg; codecs=opus',
        ptt: false
      }, { quoted: m });
      sentAsOpus = true;
    } catch (e) {
      console.log('[PLAY OPUS CONVERT] failed, falling back to raw file:', e.message);
    }

    if (!sentAsOpus) {
      await conn.sendMessage(from, {
        audio: fs.readFileSync(rawPath),
        mimetype: 'audio/mp4',
        fileName: `${video.title?.slice(0, 30)}.m4a`,
        ptt: false
      }, { quoted: m });
    }

    await store.react('✅');
  } catch (error) {
    console.error("❌ PLAY Error:", error);
    await store.react('❌');
    reply(`⚠️ Error downloading audio: ${error.message}`);
  } finally {
    try { if (rawPath && fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch {}
    try { if (opusPath && fs.existsSync(opusPath)) fs.unlinkSync(opusPath); } catch {}
  }
});
