const { cmd } = require('../command');
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ');
}

function cleanTitle(title) {
    if (!title) return 'Facebook Video';
    return decodeHtml(title).replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().substring(0, 80) || 'Facebook Video';
}

// Six independent sources tried in order — whichever returns a usable
// video URL first wins. Logs every individual failure so a "download
// failed" message always has a real reason behind it in the console.
async function fetchFbVideo2(url) {
    const encodedUrl = encodeURIComponent(url);
    const errors = [];

    // Source 1: DavidCyrilTech
    try {
        const r = await axios.get(`https://apis.davidcyriltech.my.id/facebook2?url=${encodedUrl}`, AXIOS_DEFAULTS);
        if (r.data?.status && r.data?.video?.downloads?.length) {
            const v = r.data.video;
            const hd = v.downloads.find(d => d.quality === 'HD')?.downloadUrl;
            const sd = v.downloads.find(d => d.quality === 'SD')?.downloadUrl || v.downloads[0]?.downloadUrl;
            const videoUrl = hd || sd;
            if (videoUrl) return { url: videoUrl, hd: hd || null, sd: sd || null, title: cleanTitle(v.title), source: 'davidcyriltech' };
        }
    } catch (e) { errors.push(`davidcyriltech: ${e.message}`); }

    // Source 2: NexRay
    try {
        const r = await axios.get(`https://api.nexray.web.id/downloader/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        if (r.data?.status && r.data?.result) {
            const d = r.data.result;
            const videoUrl = d.video_hd || d.video_sd;
            if (videoUrl) return { url: videoUrl, hd: d.video_hd || null, sd: d.video_sd || null, title: cleanTitle(d.title), source: 'nexray' };
        }
    } catch (e) { errors.push(`nexray: ${e.message}`); }

    // Source 3: Starlights
    try {
        const r = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/fbdl?url=${encodedUrl}`, AXIOS_DEFAULTS);
        if (r.data?.status && r.data?.result) {
            const d = r.data.result;
            const videoUrl = d.video_hd || d.video_sd || d.url;
            if (videoUrl) return { url: videoUrl, hd: d.video_hd || null, sd: d.video_sd || null, title: cleanTitle(d.title || r.data.title), source: 'starlights' };
        }
    } catch (e) { errors.push(`starlights: ${e.message}`); }

    // Source 4: Vreden
    try {
        const r = await axios.get(`https://api.vreden.my.id/api/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        const d = r.data?.result;
        if (d) {
            const videoUrl = d.hd || d.sd || d.url || d.download?.hd || d.download?.sd;
            if (videoUrl) return { url: videoUrl, hd: d.hd || d.download?.hd || null, sd: d.sd || d.download?.sd || null, title: cleanTitle(d.title), source: 'vreden' };
        }
    } catch (e) { errors.push(`vreden: ${e.message}`); }

    // Source 5: Siputzx
    try {
        const r = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        const d = r.data?.data || r.data;
        if (d) {
            const videoUrl = d.hd || d.sd || d.url;
            if (videoUrl) return { url: videoUrl, hd: d.hd || null, sd: d.sd || null, title: cleanTitle(d.title), source: 'siputzx' };
        }
    } catch (e) { errors.push(`siputzx: ${e.message}`); }

    // Source 6: Ryzendesu
    try {
        const r = await axios.get(`https://api.ryzendesu.vip/api/downloader/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        const d = r.data?.data || r.data;
        if (d) {
            const videoUrl = d.hd || d.sd || d.url || d.download;
            if (videoUrl) return { url: videoUrl, hd: d.hd || null, sd: d.sd || null, title: cleanTitle(d.title), source: 'ryzendesu' };
        }
    } catch (e) { errors.push(`ryzendesu: ${e.message}`); }

    console.error('[FACEBOOK2] All sources failed:', errors.join(' | '));
    throw new Error('All 6 sources failed right now — try again shortly.');
}

cmd({
    pattern: 'facebook2',
    alias: ['fb2', 'fbdl2'],
    desc: 'Download Facebook video (Long/Short/Reels) — v2',
    category: 'download',
    filename: __filename,
    react: '📘'
}, async (conn, mek, m, { from, args, reply }) => {
    const url = args[0]?.trim();

    if (!url) {
        return reply(`🌸 What Facebook video do you want to download?\n\n*Usage Example:*\n.facebook2 <facebook url>`);
    }

    if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.me')) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return reply(`❌ Invalid Facebook URL!`);
    }

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    try {
        const data = await fetchFbVideo2(url);

        const caption =
`‎*_ғᴀᴄᴇʙᴏᴏᴋ ᴠɪᴅᴇᴏ_* 📘
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${data.title}
‎│▸📺 *ǫᴜᴀʟɪᴛʏ:* ${data.hd ? 'HD ✅' : 'SD'}
‎│▸🔗 *sᴏᴜʀᴄᴇ:* ${data.source}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

        await conn.sendMessage(from, {
            video: { url: data.url },
            mimetype: 'video/mp4',
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`⚠️ Error downloading Facebook video: ${e.message}`);
    }
});
