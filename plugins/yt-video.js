const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');
const { HttpsProxyAgent } = require('https-proxy-agent');

const ADEEL_API = 'https://adeel-xtech-apis.vercel.app/api/ytmp4';
const USER_AGENT =
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_PROXY = String(process.env.VIDEO_PROXY || '').trim();
const VIDEO_PROXY_AGENT = VIDEO_PROXY ? new HttpsProxyAgent(VIDEO_PROXY) : null;

function proxyConfig() {
    return VIDEO_PROXY_AGENT
        ? { httpsAgent: VIDEO_PROXY_AGENT, httpAgent: VIDEO_PROXY_AGENT, proxy: false }
        : {};
}

function extractVideoId(input) {
    try {
        const value = String(input || '').trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

        const parsed = new URL(value);
        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) {
            return null;
        }
        if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0] || null;
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v');

        const parts = parsed.pathname.split('/').filter(Boolean);
        return ['shorts', 'embed', 'v'].includes(parts[0]) ? parts[1] || null : null;
    } catch (_) {
        return null;
    }
}

function cleanUrl(value) {
    // The API can return a long URL with line breaks. Remove all whitespace before using it.
    return typeof value === 'string' ? value.replace(/[\r\n\t\s]+/g, '') : null;
}

async function getFreshAdeelResult(videoUrl) {
    const response = await axios.get(ADEEL_API, {
        params: { url: videoUrl },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json'
        }
    });

    const data = response.data || {};
    const result = data.result || {};
    const downloadUrl = cleanUrl(result.video_download || result.download);

    if (response.status !== 200 || data.status !== true || !downloadUrl) {
        throw new Error(data.message || `Adeel-Xtech API returned status ${response.status}`);
    }

    return {
        title: result.title || 'YouTube Video',
        duration: result.duration || 'N/A',
        author: result.author || 'YouTube',
        quality: result.quality || '360p',
        thumbnail: cleanUrl(result.thumbnail) || '',
        downloadUrl
    };
}

async function downloadFromAdeel(videoUrl) {
    let lastError;

    // Google video URLs are temporary. A retry fetches a completely new URL from the API.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            const result = await getFreshAdeelResult(videoUrl);
            const file = await axios.get(result.downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxRedirects: 10,
                maxContentLength: MAX_VIDEO_BYTES,
                maxBodyLength: MAX_VIDEO_BYTES,
                validateStatus: (status) => status === 200 || status === 206,
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                    Referer: 'https://www.youtube.com/',
                    Origin: 'https://www.youtube.com',
                    Connection: 'keep-alive'
                },
                ...proxyConfig()
            });

            const contentType = String(file.headers['content-type'] || '').toLowerCase();
            const bytes = Buffer.from(file.data);
            const looksLikeVideo =
                contentType.includes('video') ||
                contentType.includes('octet-stream') ||
                bytes.slice(0, 4).toString() === '\x00\x00\x00\x18' ||
                bytes.slice(4, 8).toString() === 'ftyp';

            if (!looksLikeVideo || bytes.length === 0) {
                throw new Error(`Google source returned ${contentType || 'invalid video data'}`);
            }

            return { ...result, buffer: bytes, contentType: 'video/mp4' };
        } catch (error) {
            lastError = error;
            if (attempt === 1) continue;
        }
    }

    throw lastError || new Error('Unable to download the video');
}

cmd({
    pattern: 'video',
    alias: ['mp4'],
    desc: 'Download video by name or link',
    category: 'download',
    react: '🎬',
    filename: __filename
}, async (sock, message, m, { q }) => {
    const query = String(q || '').trim();

    if (!query) {
        return sock.sendMessage(message.chat, {
            text: 'Please provide a video name or YouTube link.'
        }, { quoted: message });
    }

    try {
        let videoUrl;
        let searchVideo = null;
        const videoId = extractVideoId(query);

        if (videoId) {
            // Direct links skip yt-search and are handled faster.
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            const search = await yts(query);
            if (!search?.videos?.length) {
                return sock.sendMessage(message.chat, {
                    text: 'No video results found.'
                }, { quoted: message });
            }
            searchVideo = search.videos[0];
            videoUrl = searchVideo.url;
        }

        await sock.sendMessage(message.chat, {
            react: { text: '⏳', key: message.key }
        });

        // Download the exact URL returned by Adeel-Xtech, not the URL directly in WhatsApp.
        const downloaded = await downloadFromAdeel(videoUrl);
        const title = downloaded.title || searchVideo?.title || 'YouTube Video';
        const author = downloaded.author || searchVideo?.author?.name || 'YouTube';
        const duration = downloaded.duration || searchVideo?.timestamp || 'N/A';
        const thumbnail = downloaded.thumbnail || searchVideo?.thumbnail;
        const safeName = title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'video';

        if (thumbnail) {
            await sock.sendMessage(message.chat, {
                image: { url: thumbnail },
                caption:
                    `*${title}*\n\n` +
                    `Channel: ${author}\n` +
                    `Duration: ${duration}\n` +
                    `Quality: ${downloaded.quality}\n\n` +
                    '> Powered by Adeel-MD'
            }, { quoted: message });
        }

        await sock.sendMessage(message.chat, {
            video: downloaded.buffer,
            mimetype: downloaded.contentType,
            fileName: `${safeName}.mp4`,
            caption:
                `*${title}*\n\n` +
                `Channel: ${author}\n` +
                `Duration: ${duration}\n` +
                `Quality: ${downloaded.quality}\n\n` +
                '> Powered by Adeel-MD'
        }, { quoted: message });

        await sock.sendMessage(message.chat, {
            react: { text: '✅', key: message.key }
        });
    } catch (error) {
        console.error(
            'Video Command Error:',
            VIDEO_PROXY ? '[proxy enabled]' : '[direct connection]',
            error.response?.status || error.message
        );
        await sock.sendMessage(message.chat, {
            text: 'Video download failed. Please try again.'
        }, { quoted: message });
await sock.sendMessage(message.chat, {
            react: { text: '❌', key: message.key }
        });
    }
});
