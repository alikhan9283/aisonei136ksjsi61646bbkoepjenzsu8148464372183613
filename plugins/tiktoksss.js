const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

function isTikTokUrl(str) {
    return /tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(str);
}

// Six independent sources, tried in order. tikwm is primary since its exact
// response shape (play/hdplay/wmplay/music/title/duration) was directly
// confirmed live; the rest are kept as fallbacks so one dead API never
// takes the whole command down.
async function downloadTikTok(url) {
    let lastError = null;

    // Source 1: tikwm.com (confirmed working — primary)
    try {
        const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.data;
        if (d && (d.play || d.hdplay || d.wmplay)) {
            return {
                video: d.hdplay || d.play || d.wmplay,
                title: d.title || 'TikTok Video',
                author: d.author?.nickname || d.author?.unique_id || 'Unknown',
                duration: d.duration ? `${d.duration}s` : 'Unknown',
                music: d.music || null,
                source: 'tikwm'
            };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKDL tikwm] failed:', e.message); }

    // Source 2: Vreden
    try {
        const res = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.result;
        const vidUrl = d?.download?.url || d?.video?.no_watermark || d?.video?.play;
        if (vidUrl) {
            return {
                video: vidUrl,
                title: d.title || d.desc || 'TikTok Video',
                author: d.author?.nickname || d.author || 'Unknown',
                duration: d.duration || 'Unknown',
                music: d.music?.url || null,
                source: 'vreden'
            };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKDL vreden] failed:', e.message); }

    // Source 3: Yanzbotz
    try {
        const res = await axios.get(`https://api.yanzbotz.my.id/api/downloader/tiktok?url=${encodeURIComponent(url)}&apikey=yanzofc`, AXIOS_DEFAULTS);
        const d = res.data?.result || res.data?.data;
        const vidUrl = d?.video || d?.play || d?.nowm || d?.download_url;
        if (vidUrl) {
            return {
                video: vidUrl,
                title: d.title || d.desc || 'TikTok Video',
                author: d.author || 'Unknown',
                duration: d.duration || 'Unknown',
                music: d.music || null,
                source: 'yanzbotz'
            };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKDL yanzbotz] failed:', e.message); }

    // Source 4: Ryzendesu
    try {
        const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.data || res.data;
        const vidUrl = d?.video?.playAddr || d?.video?.noWatermark || d?.play || d?.nowm;
        if (vidUrl) {
            return {
                video: vidUrl,
                title: d.title || d.desc || 'TikTok Video',
                author: d.author?.nickname || d.author || 'Unknown',
                duration: d.duration || 'Unknown',
                music: d.music || null,
                source: 'ryzendesu'
            };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKDL ryzendesu] failed:', e.message); }

    // Source 5: Siputzx
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.data || res.data?.result;
        const vidUrl = d?.nowm || d?.video || d?.play;
        if (vidUrl) {
            return {
                video: vidUrl,
                title: d.title || d.desc || 'TikTok Video',
                author: d.author || 'Unknown',
                duration: d.duration || 'Unknown',
                music: d.music || null,
                source: 'siputzx'
            };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKDL siputzx] failed:', e.message); }

    // Source 6: Okatsu
    try {
        const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/download/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.result || res.data;
        const vidUrl = d?.nowm || d?.video || d?.dl;
        if (vidUrl) {
            return {
                video: vidUrl,
                title: d.title || d.desc || 'TikTok Video',
                author: d.author || 'Unknown',
                duration: d.duration || 'Unknown',
                music: d.music || null,
                source: 'okatsu'
            };
        }
    } catch (e) { lastError = e; console.log('[TIKTOKDL okatsu] failed:', e.message); }

    if (lastError) console.error('All TikTok download sources failed. Last error:', lastError.message);
    throw new Error('All download sources failed — link may be invalid, private, or removed');
}

cmd({
  pattern: "tiktok4",
  alias: ["tt4", "ttdl", "tiktokdl"],
  desc: "Download a TikTok video from its URL",
  react: '📥',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  const url = args[0];

  if (!url) {
    return reply(`📥 *TIKTOK DOWNLOADER*

⚠️ No URL Provided
💡 Use: .tiktok <url>
📝 Example: .tiktok https://vt.tiktok.com/xxxxx

‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`);
  }

  if (!isTikTokUrl(url)) {
    await store.react('❌');
    return reply(`❌ Invalid TikTok URL!

‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`);
  }

  await store.react('⌛');

  try {
    const data = await downloadTikTok(url);

    const caption = `‎*_ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ_* 📥
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${data.title}
‎│▸👤 *ᴀᴜᴛʜᴏʀ:* ${data.author}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${data.duration}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      video: { url: data.video },
      caption
    }, { quoted: m });

    await store.react('✅');
  } catch (error) {
    console.error("❌ TikTok Download Error:", error);
    await store.react('❌');
    reply(`⚠️ Error downloading TikTok video: ${error.message}`);
  }
});
