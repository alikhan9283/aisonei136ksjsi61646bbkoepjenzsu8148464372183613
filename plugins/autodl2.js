const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { cmd } = require('../command');
ffmpeg.setFfmpegPath(ffmpegPath);

const YT_API_BASE = "https://xjawadtech.vercel.app";

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

const FOOTER = `‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

// ── Link detection ──────────────────────────────────────────
function isYoutubeUrl(str) {
    return /(?:youtube\.com|youtu\.be)/i.test(str);
}
function isTiktokUrl(str) {
    return /(?:tiktok\.com|vt\.tiktok|vm\.tiktok)/i.test(str);
}
function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}
function extractUrl(text) {
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
}

// ── YouTube audio download (7-API fallback, same as play2.js) ──
async function downloadYoutubeAudio(url) {
    const audioAPIs = [
        `${YT_API_BASE}/yta6?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/yta7?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/yta1?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/yta2?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/yta3?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/yta4?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/yta5?url=${encodeURIComponent(url)}`
    ];
    for (const apiUrl of audioAPIs) {
        try {
            const res = await axios.get(apiUrl, { timeout: 15000 });
            const audioUrl = res.data?.status && res.data?.download?.url ? res.data.download.url : null;
            if (audioUrl) return audioUrl;
        } catch (e) { continue; }
    }
    throw new Error('All YouTube audio sources failed');
}

// ── YouTube video download (4-API fallback) ──
async function downloadYoutubeVideo(url) {
    const videoAPIs = [
        `${YT_API_BASE}/ytv1?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/ytv2?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/ytv3?url=${encodeURIComponent(url)}`,
        `${YT_API_BASE}/ytv4?url=${encodeURIComponent(url)}`
    ];
    for (const apiUrl of videoAPIs) {
        try {
            const res = await axios.get(apiUrl, { timeout: 15000 });
            const videoUrl = res.data?.status && res.data?.download?.url ? res.data.download.url : null;
            if (videoUrl) return videoUrl;
        } catch (e) { continue; }
    }
    throw new Error('All YouTube video sources failed');
}

// ── TikTok download (6-API fallback, same pattern as tiktok.js) ──
async function downloadTiktok(url) {
    let lastError = null;

    try {
        const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.data;
        if (d && (d.play || d.hdplay || d.wmplay)) {
            return { video: d.hdplay || d.play || d.wmplay, title: d.title || 'TikTok Video', author: d.author?.nickname || 'Unknown' };
        }
    } catch (e) { lastError = e; }

    try {
        const res = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.result;
        const vidUrl = d?.download?.url || d?.video?.no_watermark || d?.video?.play;
        if (vidUrl) return { video: vidUrl, title: d.title || d.desc || 'TikTok Video', author: d.author?.nickname || 'Unknown' };
    } catch (e) { lastError = e; }

    try {
        const res = await axios.get(`https://api.yanzbotz.my.id/api/downloader/tiktok?url=${encodeURIComponent(url)}&apikey=yanzofc`, AXIOS_DEFAULTS);
        const d = res.data?.result || res.data?.data;
        const vidUrl = d?.video || d?.play || d?.nowm || d?.download_url;
        if (vidUrl) return { video: vidUrl, title: d.title || d.desc || 'TikTok Video', author: d.author || 'Unknown' };
    } catch (e) { lastError = e; }

    try {
        const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.data || res.data;
        const vidUrl = d?.video?.playAddr || d?.video?.noWatermark || d?.play || d?.nowm;
        if (vidUrl) return { video: vidUrl, title: d.title || d.desc || 'TikTok Video', author: d.author?.nickname || 'Unknown' };
    } catch (e) { lastError = e; }

    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.data || res.data?.result;
        const vidUrl = d?.nowm || d?.video || d?.play;
        if (vidUrl) return { video: vidUrl, title: d.title || d.desc || 'TikTok Video', author: d.author || 'Unknown' };
    } catch (e) { lastError = e; }

    try {
        const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/download/tiktok?url=${encodeURIComponent(url)}`, AXIOS_DEFAULTS);
        const d = res.data?.result || res.data;
        const vidUrl = d?.nowm || d?.video || d?.dl;
        if (vidUrl) return { video: vidUrl, title: d.title || d.desc || 'TikTok Video', author: d.author || 'Unknown' };
    } catch (e) { lastError = e; }

    if (lastError) console.error('[AUTODL] All TikTok sources failed. Last error:', lastError.message);
    throw new Error('All TikTok sources failed');
}

// ── Handler: processes a detected link and sends the result ──
async function handleLink(conn, from, quotedMsg, url) {
    if (isYoutubeUrl(url)) {
        const videoId = getVideoId(url);
        if (!videoId) return; // not a real video link, ignore silently

        let vid;
        try {
            vid = await yts({ videoId });
        } catch (e) {
            console.error('[AUTODL] yt-search failed:', e.message);
            return;
        }
        if (!vid) return;

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `‎*_ᴀᴜᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ᴅᴇᴛᴇᴄᴛᴇᴅ_* 📥
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${vid.title}
‎│▸👤 *ᴄʜᴀɴɴᴇʟ:* ${vid.author?.name || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${vid.timestamp}
‎│▸📥 *sᴛᴀᴛᴜs:* Downloading video + audio...
‎╰───────────────━┈⊷
${FOOTER}`
        }, { quoted: quotedMsg });

        try {
            const videoUrl = await downloadYoutubeVideo(url);
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                caption: `🎬 *${vid.title}*\n\n${FOOTER}`
            }, { quoted: quotedMsg });
        } catch (e) {
            console.log('[AUTODL] YouTube video download failed:', e.message);
        }

        try {
            const audioUrl = await downloadYoutubeAudio(url);
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${vid.title}.mp3`,
                ptt: false
            }, { quoted: quotedMsg });
        } catch (e) {
            console.log('[AUTODL] YouTube audio download failed:', e.message);
        }

    } else if (isTiktokUrl(url)) {
        try {
            const data = await downloadTiktok(url);
            await conn.sendMessage(from, {
                video: { url: data.video },
                caption: `‎*_ᴛɪᴋᴛᴏᴋ ᴀᴜᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ_* 📥
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${data.title}
‎│▸👤 *ᴀᴜᴛʜᴏʀ:* ${data.author}
‎╰───────────────━┈⊷
${FOOTER}`
            }, { quoted: quotedMsg });
        } catch (e) {
            console.log('[AUTODL] TikTok download failed:', e.message);
        }
    }
}

// ── Self-registering listener, same pattern as av2.js ──────
function attachAutoDownloader(conn) {
    if (conn.__autoDlAttached) return;
    conn.__autoDlAttached = true;

    conn.ev.on('messages.upsert', async (upsert) => {
        try {
            for (const message of upsert.messages || []) {
                try {
                    if (!message.message) continue;
                    if (message.message.reactionMessage || message.message.protocolMessage) continue;
                    if (message.key.remoteJid === 'status@broadcast') continue;

                    const body =
                        message.message.conversation ||
                        message.message.extendedTextMessage?.text ||
                        '';

                    const url = extractUrl(body.trim());
                    if (!url) continue;
                    if (!isYoutubeUrl(url) && !isTiktokUrl(url)) continue;

                    await handleLink(conn, message.key.remoteJid, message, url);
                } catch (innerErr) {
                    console.error('[AUTODL] per-message error:', innerErr.message);
                }
            }
        } catch (e) {
            console.error('[AUTODL] listener error:', e.message);
        }
    });
}

// A lightweight command just to attach the listener once and confirm status —
// the actual downloading happens automatically for every message after this.
cmd({
    pattern: "autodl",
    alias: ["autodownload"],
    desc: "Enable automatic YouTube/TikTok link downloading",
    category: "download",
    react: "📥",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    attachAutoDownloader(conn);
    reply(`✅ Auto-download is active!\n\nJust paste any *YouTube* or *TikTok* link in this chat and it will download automatically — no command needed.\n\n${FOOTER}`);
});

module.exports.attachAutoDownloader = attachAutoDownloader;
