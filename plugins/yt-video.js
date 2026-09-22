const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const ADEEL_API = 'https://adeel-xtech-apis.vercel.app/api/ytmp4';
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function extractVideoId(input) {
    try {
        const value = String(input || '').trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

        const parsed = new URL(value);
        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) {
            return null;
        }

        if (parsed.hostname === 'youtu.be') {
            return parsed.pathname.slice(1).split('/')[0] || null;
        }

        if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (['shorts', 'embed', 'v'].includes(parts[0])) return parts[1] || null;
        return null;
    } catch (_) {
        return null;
    }
}

function cleanUrl(value) {
    return typeof value === 'string' ? value.replace(/[\r\n\t\s]+/g, '') : null;
}

async function getAdeelResult(videoUrl) {
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
        throw new Error(data.message || `Adeel-Xtech API failed with status ${response.status}`);
    }

    return {
        title: result.title || 'YouTube Video',
        duration: result.duration || 'N/A',
        author: result.author || 'YouTube',
        quality: result.quality || '360p',
        thumbnail: result.thumbnail || '',
        downloadUrl
    };
}

async function downloadFreshVideo(videoUrl) {
    let lastError;

    // A Google video URL is temporary, so fetch the Adeel response again on retry.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            const result = await getAdeelResult(videoUrl);
            const file = await axios.get(result.downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxRedirects: 10,
                maxContentLength: MAX_VIDEO_BYTES,
                maxBodyLength: MAX_VIDEO_BYTES,
                validateStatus: (status) => status >= 200 && status < 300,
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8'
                }
            });

            const contentType = String(file.headers['content-type'] || '').toLowerCase();
            if (!contentType.includes('video') && !contentType.includes('octet-stream')) {
                throw new Error(`Download source returned ${contentType || 'unknown content'}`);
            }

            return {
                ...result,
                buffer: Buffer.from(file.data),
                contentType: contentType.includes('video') ? contentType : 'video/mp4'
            };
        } catch (error) {
            lastError = error;
            if (attempt === 1) continue;
        }
    }

    throw lastError || new Error('Video download failed');
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
            text: '❌ Please provide a video name or YouTube link'
        }, { quoted: message });
    }

    try {
        let videoUrl;
        let video = null;
        const videoId = extractVideoId(query);

        if (videoId) {
            // Do not run yt-search for a direct link; this makes the command faster.
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else {
            const search = await yts(query);
            if (!search?.videos?.length) {
                return sock.sendMessage(message.chat, {
                    text: '❌ No video results found'
                }, { quoted: message });
            }
            video = search.videos[0];
            videoUrl = video.url;
        }

        await sock.sendMessage(message.chat, {
            react: { text: '⏳', key: message.key }
        });

        // Download bytes first. Sending the temporary Google URL directly causes 403 errors.
        const downloaded = await downloadFreshVideo(videoUrl);
        const title = downloaded.title || video?.title || 'YouTube Video';
        const author = downloaded.author || video?.author?.name || 'YouTube';
        const duration = downloaded.duration || video?.timestamp || 'N/A';
        const thumbnail = downloaded.thumbnail || video?.thumbnail;

        if (thumbnail) {
            await sock.sendMessage(message.chat, {
                image: { url: thumbnail },
                caption:
                    `*${title}*\n\n` +
                    `🎥 *Channel:* ${author}\n` +
                    `⏳ *Duration:* ${duration}\n` +
                    `🎞️ *Quality:* ${downloaded.quality}\n\n` +
                    '> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*'
            }, { quoted: message });
        }

        await sock.sendMessage(message.chat, {
            video: downloaded.buffer,
            mimetype: downloaded.contentType || 'video/mp4',
            fileName: `${title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}.mp4`,
            caption:
                `*${title}*\n\n` +
                `🎥 *Channel:* ${author}\n` +
                `⏳ *Duration:* ${duration}\n` +
                `🎞️ *Quality:* ${downloaded.quality}\n\n` +
                '> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*'
        }, { quoted: message });

        await sock.sendMessage(message.chat, {
            react: { text: '✅', key: message.key }
        });
    } catch (error) {
        console.error('Video Command Error:', error.response?.status || error.message);
        await sock.sendMessage(message.chat, {
            text: '❌ Video download failed. Please try the command again; the source link may have expired.'
        }, { quoted: message });
        await sock.sendMessage(message.chat, {
            react: { text: '❌', key: message.key }
});
    }
});
