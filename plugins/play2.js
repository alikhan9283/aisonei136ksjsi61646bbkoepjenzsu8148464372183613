const axios = require('axios');
const yts = require('yt-search');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { cmd } = require("../command");
ffmpeg.setFfmpegPath(ffmpegPath);

// ytdl-core is OPTIONAL — only used as an extra fallback if present.
// If the package isn't installed on the server, everything still works
// using yt-search + the Vreden/Yupra/Okatsu/EliteProTech APIs below.
let ytdl = null;
try { ytdl = require('@distube/ytdl-core'); } catch { ytdl = null; }

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// Starlight's endpoints can be slow (30s+), so they get a longer timeout
const STARLIGHT_TIMEOUT = { ...AXIOS_DEFAULTS, timeout: 55000 };

function isTruncatedDownload(axiosResponse, buffer) {
    const declaredLen = Number(axiosResponse.headers?.['content-length']);
    if (!declaredLen) return false;
    return buffer.length < declaredLen - 500;
}

function isLikelyAudio(buffer) {
    if (!buffer || buffer.length < 15000) return false;
    const head = buffer.slice(0, 12);
    const asText = head.toString('utf8', 0, 20).trim().toLowerCase();
    if (asText.startsWith('<') || asText.startsWith('{') || asText.startsWith('<!doctype')) return false;
    return true;
}

function detectAudioFormat(buffer) {
    const head = buffer.slice(0, 12);
    if (head.slice(0, 3).toString('latin1') === 'ID3' || (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0)) {
        return { mimetype: 'audio/mpeg', ext: 'mp3' };
    }
    if (head.slice(4, 8).toString('latin1') === 'ftyp') {
        return { mimetype: 'audio/mp4', ext: 'm4a' };
    }
    if (head.slice(0, 4).toString('latin1') === 'OggS') {
        return { mimetype: 'audio/ogg', ext: 'ogg' };
    }
    if (head.slice(0, 4).toString('latin1') === 'RIFF') {
        return { mimetype: 'audio/wav', ext: 'wav' };
    }
    return { mimetype: 'audio/mpeg', ext: 'mp3' };
}

async function ytSearch(query) {
    const isUrl = query.includes('youtube.com') || query.includes('youtu.be');

    // If ytdl-core is installed, use it for the most accurate direct-link info
    if (isUrl && ytdl) {
        try {
            const info = await ytdl.getInfo(query);
            return {
                url: query,
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds + 's',
                views: parseInt(info.videoDetails.viewCount).toLocaleString(),
                author: info.videoDetails.author.name,
                thumb: info.videoDetails.thumbnails?.slice(-1)[0]?.url
            };
        } catch (e) { console.log('[PLAY2 ytdl getInfo] failed, falling back to yts:', e.message); }
    }

    // No ytdl-core (or it failed) — extract the video ID and search by ID,
    // which yt-search can resolve without needing ytdl-core at all
    if (isUrl) {
        let videoId = '';
        try {
            const urlObj = new URL(query);
            videoId = urlObj.hostname.includes('youtu.be') ? urlObj.pathname.slice(1) : urlObj.searchParams.get('v');
        } catch {
            videoId = query.split('/').pop().split('?')[0];
        }
        if (videoId) {
            try {
                const search = await yts({ videoId });
                if (search) {
                    return {
                        url: query,
                        title: search.title,
                        duration: search.seconds ? `${search.seconds}s` : search.timestamp,
                        views: (search.views || 0).toLocaleString(),
                        author: search.author?.name || 'Unknown',
                        thumb: search.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    };
                }
            } catch (e) { console.log('[PLAY2 yts by videoId] failed:', e.message); }
        }
        // Last resort: build a minimal object so the download can still proceed
        if (videoId) {
            return {
                url: query,
                title: 'YouTube Video',
                duration: 'N/A',
                views: '0',
                author: 'Unknown',
                thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };
        }
    }

    const search = await yts(query);
    if (!search.videos?.length) throw new Error('No results');
    const v = search.videos[0];
    return { url: v.url, title: v.title, duration: v.timestamp, views: v.views?.toLocaleString() || '0', author: v.author?.name, thumb: v.thumbnail };
}

async function dlVideo(videoUrl, outPath) {
    // Method 0: Starlight
    try {
        const res = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/youtube-mp4?url=${encodeURIComponent(videoUrl)}&format=360p`, STARLIGHT_TIMEOUT);
        const dlUrl = res.data?.result?.download_url || res.data?.result?.url || res.data?.download_url || res.data?.url;
        if (dlUrl) {
            const vidRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 });
            fs.writeFileSync(outPath, Buffer.from(vidRes.data));
            return;
        }
    } catch (e) { console.log('[PLAY2 dlVideo Starlight] failed:', e.message); }

    try {
        const res = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(videoUrl)}`, AXIOS_DEFAULTS);
        if (res.data?.status && res.data?.result?.download?.url) {
            const vidRes = await axios.get(res.data.result.download.url, { responseType: 'arraybuffer', timeout: 120000 });
            fs.writeFileSync(outPath, Buffer.from(vidRes.data));
            return;
        }
    } catch (e) { console.log('[PLAY2 dlVideo Vreden] failed:', e.message); }

    try {
        const res = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(videoUrl)}`, AXIOS_DEFAULTS);
        if (res.data?.success && res.data?.data?.download_url) {
            const vidRes = await axios.get(res.data.data.download_url, { responseType: 'arraybuffer', timeout: 120000 });
            fs.writeFileSync(outPath, Buffer.from(vidRes.data));
            return;
        }
    } catch (e) { console.log('[PLAY2 dlVideo Yupra] failed:', e.message); }

    // Optional extra fallback if ytdl-core happens to be installed
    if (ytdl) {
        try {
            await new Promise((resolve, reject) => {
                const stream = ytdl(videoUrl, {
                    filter: 'videoandaudio', quality: '18',
                    requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
                });
                const file = fs.createWriteStream(outPath);
                stream.pipe(file);
                stream.on('error', reject);
                file.on('finish', resolve);
                file.on('error', reject);
            });
            if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) return;
        } catch (e) { console.log('[PLAY2 dlVideo ytdl-core] failed:', e.message); }
    }
    throw new Error('No video method available for audio extraction fallback');
}

async function dlAudio(videoUrl, outPath) {
    // Method 0: Starlight
    try {
        const res = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/youtube-mp3?url=${encodeURIComponent(videoUrl)}&format=mp3`, STARLIGHT_TIMEOUT);
        const dlUrl = res.data?.result?.download_url || res.data?.result?.url || res.data?.download_url || res.data?.url;
        if (dlUrl) {
            const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 });
            const buf = Buffer.from(audioRes.data);
            if (isLikelyAudio(buf) && !isTruncatedDownload(audioRes, buf)) { fs.writeFileSync(outPath, buf); return; }
        }
    } catch (e) { console.log('[PLAY2 Method0 Starlight] failed:', e.message); }

    // Method 1: Vreden
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`, AXIOS_DEFAULTS);
        if (res.data?.status && res.data?.result?.download?.url) {
            const audioRes = await axios.get(res.data.result.download.url, { responseType: 'arraybuffer', timeout: 60000 });
            const buf = Buffer.from(audioRes.data);
            if (isLikelyAudio(buf) && !isTruncatedDownload(audioRes, buf)) { fs.writeFileSync(outPath, buf); return; }
        }
    } catch (e) { console.log('[PLAY2 Method1 Vreden] failed:', e.message); }

    // Method 2: Yupra
    try {
        const res = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`, AXIOS_DEFAULTS);
        if (res.data?.success && res.data?.data?.download_url) {
            const audioRes = await axios.get(res.data.data.download_url, { responseType: 'arraybuffer', timeout: 120000 });
            const buf = Buffer.from(audioRes.data);
            if (isLikelyAudio(buf) && !isTruncatedDownload(audioRes, buf)) { fs.writeFileSync(outPath, buf); return; }
        }
    } catch (e) { console.log('[PLAY2 Method2 Yupra] failed:', e.message); }

    // Method 3: Okatsu
    try {
        const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`, AXIOS_DEFAULTS);
        if (res.data?.dl) {
            const audioRes = await axios.get(res.data.dl, { responseType: 'arraybuffer', timeout: 120000 });
            const buf = Buffer.from(audioRes.data);
            if (isLikelyAudio(buf) && !isTruncatedDownload(audioRes, buf)) { fs.writeFileSync(outPath, buf); return; }
        }
    } catch (e) { console.log('[PLAY2 Method3 Okatsu] failed:', e.message); }

    // Method 4: EliteProTech
    try {
        const res = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(videoUrl)}&format=mp3`, AXIOS_DEFAULTS);
        if (res.data?.success && res.data?.downloadURL) {
            const audioRes = await axios.get(res.data.downloadURL, { responseType: 'arraybuffer', timeout: 120000 });
            const buf = Buffer.from(audioRes.data);
            if (isLikelyAudio(buf) && !isTruncatedDownload(audioRes, buf)) { fs.writeFileSync(outPath, buf); return; }
        }
    } catch (e) { console.log('[PLAY2 Method4 EliteProTech] failed:', e.message); }

    // Method 5: video-to-audio extraction fallback
    try {
        const tempVideoPath = outPath.replace(/\.mp3$/, '_temp.mp4');
        await dlVideo(videoUrl, tempVideoPath);
        if (fs.existsSync(tempVideoPath)) {
            try {
                await new Promise((resolve, reject) => {
                    ffmpeg(tempVideoPath)
                        .noVideo()
                        .audioCodec('libmp3lame')
                        .audioBitrate('128k')
                        .format('mp3')
                        .on('end', resolve)
                        .on('error', reject)
                        .save(outPath);
                });
            } finally {
                try { fs.unlinkSync(tempVideoPath); } catch {}
            }
            if (fs.existsSync(outPath) && isLikelyAudio(fs.readFileSync(outPath))) return;
        }
    } catch (e) { console.log('[PLAY2 audio extract fallback] failed:', e.message); }

    throw new Error('No download method available — all APIs failed');
}

cmd({
  pattern: "play2",
  alias: ["song2", "ytmp3b"],
  desc: "Download YouTube audio by name or link (alt)",
  react: '🎵',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  let outPath, opusPath;
  const query = args.join(" ").trim();

  if (!query) {
    return reply("🌸 Please provide a song name or YouTube link.\n\n*Usage Example:*\n.play2 <song name / YouTube link>");
  }

  await store.react('⌛');

  try {
    reply(`🔎 Searching: *${query}*`);

    const video = await ytSearch(query);

    const infoCaption = `‎*_ʏᴏᴜᴛᴜʙᴇ ᴀᴜᴅɪᴏ ʀᴇsᴜʟᴛ_* 🎵
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${video.title}
‎│▸👤 *ᴄʜᴀɴɴᴇʟ:* ${video.author || 'Unknown'}
‎│▸👁️ *ᴠɪᴇᴡs:* ${video.views || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.duration || "Unknown"}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      image: { url: video.thumb },
      caption: infoCaption
    }, { quoted: m });

    outPath = path.join('/tmp', `play2_${Date.now()}.mp3`);
    await dlAudio(video.url, outPath);
    if (!fs.existsSync(outPath)) throw new Error('Download failed');

    opusPath = path.join('/tmp', `play2_opus_${Date.now()}.ogg`);
    let sentAsOpus = false;
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(outPath)
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
      console.log('[PLAY2 OPUS CONVERT] failed, falling back to raw file:', e.message);
    }

    if (!sentAsOpus) {
      const audioBuf = fs.readFileSync(outPath);
      const { mimetype, ext } = detectAudioFormat(audioBuf);
      await conn.sendMessage(from, {
        audio: audioBuf,
        mimetype,
        fileName: `${video.title?.slice(0, 30)}.${ext}`,
        ptt: false
      }, { quoted: m });
    }

    await store.react('✅');
  } catch (error) {
    console.error("❌ PLAY2 Error:", error);
    await store.react('❌');
    reply(`⚠️ Error downloading audio: ${error.message}`);
  } finally {
    try { if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}
    try { if (opusPath && fs.existsSync(opusPath)) fs.unlinkSync(opusPath); } catch {}
  }
});
