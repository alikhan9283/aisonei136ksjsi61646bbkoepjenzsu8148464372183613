const axios = require('axios');
const yts = require('yt-search');

// ============================================================================
// IMPORTANT — READ BEFORE EDITING
// ============================================================================
// As of 2026, YouTube has aggressively locked down direct-download access:
//   - The old small unofficial APIs (starlight, vreden ytmp3/ytmp4, etc.)
//     are unstable/dead — many return "Read timeout" or empty responses.
//   - @distube/ytdl-core is archived (Aug 2025) and throws "Sign in to
//     confirm you're not a bot" on nearly every request.
//   - yt-dlp itself now needs a PO token to avoid the same bot-check,
//     which normally requires a signed-in browser session.
//   - The public cobalt.tools instance was blocked by YouTube's own
//     infrastructure in 2026 specifically to stop shared downloaders.
//   - Invidious public instances (tried first in an earlier version of
//     this file) are documented by Invidious's own maintainers as
//     routinely CAPTCHA'd/rate-limited/dead — this is a known, ongoing,
//     project-wide issue, not something specific to this bot.
//
// Piped (github.com/TeamPiped/Piped) is tried FIRST here because it's a
// separate, independently-run project from Invidious — different backend
// implementation, different instance operators, different proxy
// infrastructure — so it fails independently of Invidious rather than
// hitting the same underlying blocks. Its /streams/:id endpoint returns
// ready-to-use proxied stream URLs (audioStreams[], videoStreams[]) with
// no login or token needed. Invidious instances are kept as a second
// layer of fallback in case Piped instances are also down.
// ============================================================================

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi-libre.kavin.rocks',
    'https://pipedapi.leptons.xyz',
    'https://piped-api.privacy.com.de',
    'https://pipedapi.adminforge.de',
    'https://api.piped.yt',
    'https://pipedapi.drgns.space',
    'https://pipedapi.owo.si'
];

const INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://yt.chocolatemoo53.com',
    'https://invidious.tiekoetter.com',
    'https://invidious.jing.rocks',
    'https://iv.nboeck.de'
];

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: {
        // Both Piped and Invidious operators ask that requests not spoof
        // a browser User-Agent — identify as a bot/script as a courtesy.
        'User-Agent': 'SarwarMD-WhatsApp-Bot/1.0'
    }
};

function extractVideoId(query) {
    if (!query) return null;
    const trimmed = query.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    try {
        const url = new URL(trimmed);
        if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
        if (url.hostname.includes('youtube.com')) {
            if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
            return url.searchParams.get('v');
        }
    } catch {
        // not a URL
    }
    return null;
}

// Resolves a search term or URL into { videoId, title, author, duration, views, thumb }
async function resolveVideo(query) {
    const directId = extractVideoId(query);
    if (directId) {
        try {
            const search = await yts({ videoId: directId });
            if (search) {
                return {
                    videoId: directId,
                    title: search.title,
                    author: search.author?.name || 'Unknown',
                    duration: search.timestamp || 'Unknown',
                    views: (search.views || 0).toLocaleString(),
                    thumb: search.thumbnail || `https://img.youtube.com/vi/${directId}/hqdefault.jpg`
                };
            }
        } catch (e) { console.log('[YTHELPER resolve by id] failed:', e.message); }
        return {
            videoId: directId,
            title: 'YouTube Video',
            author: 'Unknown',
            duration: 'Unknown',
            views: '0',
            thumb: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`
        };
    }

    const search = await yts(query);
    if (!search.videos?.length) throw new Error('No results found for that search');
    const v = search.videos[0];
    return {
        videoId: v.videoId,
        title: v.title,
        author: v.author?.name || 'Unknown',
        duration: v.timestamp || 'Unknown',
        views: v.views?.toLocaleString() || '0',
        thumb: v.thumbnail
    };
}

// Tries each Piped instance first (independent infra from Invidious),
// then falls back to Invidious instances. Returns whichever gives usable
// audio/video stream URLs first.
async function getStreams(videoId) {
    let lastError = null;

    // --- Layer 1: Piped ---
    for (const instance of PIPED_INSTANCES) {
        try {
            const res = await axios.get(`${instance}/streams/${videoId}`, AXIOS_DEFAULTS);
            const data = res.data;

            const audioStreams = data?.audioStreams || [];
            const videoStreams = data?.videoStreams || [];

            const bestAudio = audioStreams
                .filter(s => s.url)
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

            // Prefer a combined (non videoOnly) stream so audio comes with it;
            // fall back to the first available video-only stream otherwise.
            const bestVideo = videoStreams.find(s => s.url && s.videoOnly === false)
                || videoStreams.find(s => s.url);

            if (bestAudio?.url || bestVideo?.url) {
                return {
                    audioUrl: bestAudio?.url || null,
                    videoUrl: bestVideo?.url || null,
                    source: 'piped',
                    instance
                };
            }
        } catch (e) {
            lastError = e;
            console.log(`[YTHELPER piped ${instance}] failed:`, e.message);
        }
    }

    // --- Layer 2: Invidious (fallback) ---
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const res = await axios.get(`${instance}/api/v1/videos/${videoId}?local=true`, AXIOS_DEFAULTS);
            const data = res.data;

            const adaptive = data?.adaptiveFormats || [];
            const combined = data?.formatStreams || [];

            const audioOnly = adaptive
                .filter(f => f.type?.startsWith('audio/'))
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

            const videoOnly = combined.length
                ? combined[combined.length - 1]
                : adaptive.filter(f => f.type?.startsWith('video/'))[0];

            if (audioOnly?.url || videoOnly?.url) {
                return {
                    audioUrl: audioOnly?.url || null,
                    videoUrl: videoOnly?.url || null,
                    source: 'invidious',
                    instance
                };
            }
        } catch (e) {
            lastError = e;
            console.log(`[YTHELPER invidious ${instance}] failed:`, e.message);
        }
    }

    if (lastError) console.error('All Piped and Invidious instances failed. Last error:', lastError.message);
    throw new Error('No download source available right now — all sources failed');
}

module.exports = { extractVideoId, resolveVideo, getStreams, PIPED_INSTANCES, INVIDIOUS_INSTANCES, AXIOS_DEFAULTS };
