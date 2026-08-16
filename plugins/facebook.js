const { cmd } = require('../command');
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// ── Helper: decode HTML entities ──────────────────────────
function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ').replace(/\\n/g, '\n');
}

function cleanTitle(title) {
    if (!title) return 'Facebook Video';
    return decodeHtml(title)
        .replace(/#\w+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 80) || 'Facebook Video';
}

// ── Try every API in order; each one that returns a usable video URL wins ──
// NOTE: "video is private" style errors only ever came from EVERY source
// failing at once — there's no separate private-detection logic anywhere
// here, so a public video failing just meant the sources available at the
// time were down. More independent sources below reduces that risk.
async function fetchFbVideo(url) {
    const encodedUrl = encodeURIComponent(url);
    const errors = [];

    // Source 1: DavidCyrilTech (confirmed live in an active WhatsApp bot repo)
    try {
        const r = await axios.get(`https://apis.davidcyriltech.my.id/facebook2?url=${encodedUrl}`, AXIOS_DEFAULTS);
        if (r.data?.status && r.data?.video?.downloads?.length) {
            const v = r.data.video;
            const hd = v.downloads.find(d => d.quality === 'HD')?.downloadUrl;
            const sd = v.downloads.find(d => d.quality === 'SD')?.downloadUrl || v.downloads[0]?.downloadUrl;
            const videoUrl = hd || sd;
            if (videoUrl) return {
                url: videoUrl, hd: hd || null, sd: sd || null,
                title: cleanTitle(v.title), thumb: v.thumbnail || '', source: 'davidcyriltech'
            };
        }
    } catch (e) { errors.push(`davidcyriltech: ${e.message}`); }

    // Source 2: NexRay
    try {
        const r = await axios.get(`https://api.nexray.web.id/downloader/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        if (r.data?.status && r.data?.result) {
            const d = r.data.result;
            const videoUrl = d.video_hd || d.video_sd;
            if (videoUrl) return {
                url: videoUrl, hd: d.video_hd || null, sd: d.video_sd || null,
                title: cleanTitle(d.title), thumb: d.thumbnail || '', source: 'nexray'
            };
        }
    } catch (e) { errors.push(`nexray: ${e.message}`); }

    // Source 3: Starlights
    try {
        const r = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/fbdl?url=${encodedUrl}`, AXIOS_DEFAULTS);
        if (r.data?.status && r.data?.result) {
            const d = r.data.result;
            const videoUrl = d.video_hd || d.video_sd || d.url;
            if (videoUrl) return {
                url: videoUrl, hd: d.video_hd || null, sd: d.video_sd || null,
                title: cleanTitle(d.title || r.data.title), thumb: d.thumbnail || '', source: 'starlights'
            };
        }
    } catch (e) { errors.push(`starlights: ${e.message}`); }

    // Source 4: Vreden
    try {
        const r = await axios.get(`https://api.vreden.my.id/api/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        const d = r.data?.result;
        if (d) {
            const videoUrl = d.hd || d.sd || d.url || d.download?.hd || d.download?.sd;
            if (videoUrl) return {
                url: videoUrl, hd: d.hd || d.download?.hd || null, sd: d.sd || d.download?.sd || null,
                title: cleanTitle(d.title), thumb: d.thumbnail || '', source: 'vreden'
            };
        }
    } catch (e) { errors.push(`vreden: ${e.message}`); }

    // Source 5: Siputzx
    try {
        const r = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodedUrl}`, AXIOS_DEFAULTS);
        const d = r.data?.data || r.data;
        if (d) {
            const videoUrl = d.hd || d.sd || d.url;
            if (videoUrl) return {
                url: videoUrl, hd: d.hd || null, sd: d.sd || null,
                title: cleanTitle(d.title), thumb: d.thumbnail || '', source: 'siputzx'
            };
        }
    } catch (e) { errors.push(`siputzx: ${e.message}`); }

    // Source 6: SnapSave-style HTML scrape
    try {
        const r = await axios.post(
            'https://snapsave.app/action.php',
            new URLSearchParams({ url }),
            { timeout: 25000, headers: { ...AXIOS_DEFAULTS.headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://snapsave.app/' } }
        );
        const html = typeof r.data === 'string' ? r.data : '';
        const hdMatch = html.match(/href="([^"]+)"[^>]*>HD/i);
        const sdMatch = html.match(/href="([^"]+)"[^>]*>SD/i);
        const videoUrl = hdMatch?.[1] || sdMatch?.[1];
        if (videoUrl) return {
            url: decodeURIComponent(videoUrl),
            hd: hdMatch?.[1] ? decodeURIComponent(hdMatch[1]) : null,
            sd: sdMatch?.[1] ? decodeURIComponent(sdMatch[1]) : null,
            title: 'Facebook Video', thumb: '', source: 'snapsave'
        };
    } catch (e) { errors.push(`snapsave: ${e.message}`); }

    console.error('[FACEBOOK] All sources failed:', errors.join(' | '));
    throw new Error('All sources failed right now. The link may genuinely be private, or every source is temporarily down — try again shortly.');
}

// ── MAIN COMMAND ────────────────────────────────────────────
cmd({
    pattern: 'facebook',
    alias: ['fb', 'fbdl', 'fbdown', 'fbvideo'],
    desc: 'Download Facebook video (Long/Short/Reels)',
    category: 'download',
    filename: __filename,
    react: '📘'
}, async (conn, mek, m, { from, args, reply }) => {
    const url = args[0]?.trim();

    if (!url) {
        return reply(
`╭─❏ 「 FACEBOOK DOWNLOADER」
│
│ 📘 Supports:
│  • Long videos
│  • Short videos
│  • Facebook Reels
│
│ 📝 Usage:
│  .facebook <facebook url>
│
│ 🔗 Example:
│  .facebook https://fb.watch/xxx
│  .facebook https://www.facebook.com/.../videos/...
╰───────────────
> © 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴍᴅ`
        );
    }

    if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.me')) {
        return reply('❌ *Invalid URL!*\n\nPlease provide a valid Facebook link.\n\n> _𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴍᴅ');
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const data = await fetchFbVideo(url);

        const caption =
`╭─❏ 「 *FACEBOOK VIDEO*」
│
│ 📌 ${data.title}
│ 📺 Quality: ${data.hd ? 'HD ✅' : 'SD'}
│
╰───────────────
> © 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴍᴅ`;

        await conn.sendMessage(from, {
            video: { url: data.url },
            mimetype: 'video/mp4',
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(
`❌ *Download Failed!*

${e.message}

> © 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴍᴅ`
        );
    }
});
