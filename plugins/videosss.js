const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { cmd } = require("../command");
const { resolveVideo, getStreams, AXIOS_DEFAULTS } = require("../lib/ytHelper");

cmd({
  pattern: "video7",
  alias: ["ytmp4", "ytvideo"],
  desc: "Download YouTube video by name or link",
  react: '🎬',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  let rawPath;
  const query = args.join(" ").trim();

  if (!query) {
    return reply("🌸 Please provide a video name or YouTube link.\n\n*Usage Example:*\n.video <name / YouTube link>");
  }

  await store.react('⌛');

  try {
    reply(`🔎 Searching: *${query}*`);

    const video = await resolveVideo(query);
    const { videoUrl } = await getStreams(video.videoId);
    if (!videoUrl) throw new Error('No video stream available for this video');

    const caption = `‎*_ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ_* 🎬
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${video.title}
‎│▸👤 *ᴄʜᴀɴɴᴇʟ:* ${video.author}
‎│▸👁️ *ᴠɪᴇᴡs:* ${video.views}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.duration}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 90000, headers: AXIOS_DEFAULTS.headers });
    rawPath = path.join('/tmp', `video_${Date.now()}.mp4`);
    fs.writeFileSync(rawPath, Buffer.from(videoRes.data));

    await conn.sendMessage(from, {
      video: fs.readFileSync(rawPath),
      mimetype: 'video/mp4',
      caption
    }, { quoted: m });

    await store.react('✅');
  } catch (error) {
    console.error("❌ VIDEO Error:", error);
    await store.react('❌');
    reply(`⚠️ Error downloading video: ${error.message}`);
  } finally {
    try { if (rawPath && fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch {}
  }
});
