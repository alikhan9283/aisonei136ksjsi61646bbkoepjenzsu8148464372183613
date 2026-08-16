const { cmd } = require('../command');
const axios = require('axios');

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

// ── Helper: clean title ────────────────────────────────────
function cleanTitle(title) {
    if (!title) return 'Facebook Video';
    return decodeHtml(title)
        .replace(/#\w+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 80) || 'Facebook Video';
}

// ── Try all APIs ───────────────────────────────────────────
async function fetchFbVideo(url) {
    const encodedUrl = encodeURIComponent(url);
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    // API 1: NexRay
    try {
        const r = await axios.get(
            `https://api.nexray.web.id/downloader/facebook?url=${encodedUrl}`,
            { timeout: 25000, headers }
        );
        if (r.data?.status && r.data?.result) {
            const d = r.data.result;
            const videoUrl = d.video_hd || d.video_sd;
            if (videoUrl) return {
                url: videoUrl,
                hd: d.video_hd || null,
                sd: d.video_sd || null,
                title: cleanTitle(d.title),
                thumb: d.thumbnail || '',
                source: 'nexray'
            };
        }
    } catch {}

    // API 2: JawadTech
    try {
        const r = await axios.get(
            `https://jawad-tech.vercel.app/downloader?url=${encodedUrl}`,
            { timeout: 25000, headers }
        );
        if (r.data?.status && Array.isArray(r.data?.result)) {
            const hd = r.data.result.find(v => v.quality === 'HD');
            const sd = r.data.result.find(v => v.quality === 'SD');
            const videoUrl = hd?.url || sd?.url;
            if (videoUrl) return {
                url: videoUrl,
                hd: hd?.url || null,
                sd: sd?.url || null,
                title: cleanTitle(r.data.title),
                thumb: r.data.thumbnail || '',
                source: 'jawadtech'
            };
        }
    } catch {}

    // API 3: Starlights
    try {
        const r = await axios.get(
            `https://apis-starlights-team.koyeb.app/starlight/fbdl?url=${encodedUrl}`,
            { timeout: 25000, headers }
        );
        if (r.data?.status && r.data?.result) {
            const d = r.data.result;
            const videoUrl = d.video_hd || d.video_sd || d.url;
            if (videoUrl) return {
                url: videoUrl,
                hd: d.video_hd || null,
                sd: d.video_sd || null,
                title: cleanTitle(d.title || r.data.title),
                thumb: d.thumbnail || '',
                source: 'starlights'
            };
        }
    } catch {}

    // API 4: DrkamranAPI
    try {
        const r = await axios.get(
            `https://drkamran.vercel.app/api/download/facebook?url=${encodedUrl}`,
            { timeout: 25000, headers }
        );
        if (r.data?.status && r.data?.data) {
            const d = r.data.data;
            const videoUrl = d.hd || d.sd || d.url;
            if (videoUrl) return {
                url: videoUrl,
                hd: d.hd || null,
                sd: d.sd || null,
                title: cleanTitle(d.title),
                thumb: d.thumbnail || '',
                source: 'drkamran'
            };
        }
    } catch {}

    // API 5: SnapSave style
    try {
        const r = await axios.post(
            'https://snapsave.app/action.php',
            new URLSearchParams({ url }),
            {
                timeout: 25000,
                headers: {
                    ...headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://snapsave.app/'
                }
            }
        );
        const html = typeof r.data === 'string' ? r.data : '';
        const hdMatch = html.match(/href="([^"]+)"[^>]*>HD/i);
        const sdMatch = html.match(/href="([^"]+)"[^>]*>SD/i);
        const videoUrl = hdMatch?.[1] || sdMatch?.[1];
        if (videoUrl) return {
            url: decodeURIComponent(videoUrl),
            hd: hdMatch?.[1] ? decodeURIComponent(hdMatch[1]) : null,
            sd: sdMatch?.[1] ? decodeURIComponent(sdMatch[1]) : null,
            title: 'Facebook Video',
            thumb: '',
            source: 'snapsave'
        };
    } catch {}

    throw new Error('All 5 APIs failed. Video may be private or restricted.');
}

// ── MAIN COMMAND ────────────────────────────────────────────
cmd({
    pattern: 'facebook5',
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
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`
        );
    }

    // Validate URL
    if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.me')) {
        return reply('❌ *Invalid URL!*\n\nPlease provide a valid Facebook link.\n\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗');
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const data = await fetchFbVideo(url);

        const caption =
`╭─❏ 「 FACEBOOK VIDEO」
│
│ 📌 ${data.title}
│ 📺 Quality: ${data.hd ? 'HD ✅' : 'SD'}
│ 🔗 Source: ${data.source}
│
╰───────────────
> ©𝐏𝐨𝐰𝐞𝐫𝐞᷊ᴅ 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;

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

💡 *Possible reasons:*
• Video is private or restricted
• Link has expired
• Try copying the link again

> ©𝐏𝐨𝐰𝐞𝐫𝐞᷊ᴅ 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`
        );
    }
});
