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
//     which normally requires a signed-in browser session — not something
//     that works headlessly on a server.
//   - The public cobalt.tools instance was blocked by YouTube's own
//     infrastructure in 2026 specifically to stop shared downloaders.
//
// The most viable remaining approach is Invidious — an open-source YouTube
// proxy that serves direct, playable video/audio stream URLs without
// needing a login or PO token. Public instances rotate and occasionally
// get rate-limited, so multiple instances are tried in order here (this
// mirrors the same "try several sources" pattern used elsewhere in this
// bot, e.g. tiktoksearch.js's tikwm-first-then-fallback approach).
// Instance list is the current (2026) trusted list from docs.invidious.io.
// ============================================================================

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
        // Invidious operators ask that requests NOT spoof a browser
        // User-Agent — identify as a bot/script instead, as a courtesy
        // (see nadeko.net's own instance notes).
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

// Tries each Invidious instance until one returns usable stream URLs.
// Returns { audioUrl, videoUrl } — either may be null if that instance
// didn't expose that stream type, so callers should check what they need.
async function getStreams(videoId) {
    let lastError = null;

    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            // local=true makes Invidious proxy the stream URLs through
            // itself instead of returning raw googlevideo.com links, which
            // are more likely to work without extra signature/cipher issues.
            const res = await axios.get(`${instance}/api/v1/videos/${videoId}?local=true`, AXIOS_DEFAULTS);
            const data = res.data;

            // adaptiveFormats has separate audio-only and video-only streams;
            // formatStreams has combined audio+video (usually capped ~360p).
            const adaptive = data?.adaptiveFormats || [];
            const combined = data?.formatStreams || [];

            const audioOnly = adaptive
                .filter(f => f.type?.startsWith('audio/'))
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

            const videoOnly = combined.length
                ? combined[combined.length - 1] // highest quality combined stream
                : adaptive.filter(f => f.type?.startsWith('video/'))[0];

            if (audioOnly?.url || videoOnly?.url) {
                return {
                    audioUrl: audioOnly?.url || null,
                    videoUrl: videoOnly?.url || null,
                    instance
                };
            }
        } catch (e) {
            lastError = e;
            console.log(`[YTHELPER ${instance}] failed:`, e.message);
        }
    }

    if (lastError) console.error('All Invidious instances failed. Last error:', lastError.message);
    throw new Error('No download source available right now — all sources failed');
}

module.exports = { extractVideoId, resolveVideo, getStreams, INVIDIOUS_INSTANCES, AXIOS_DEFAULTS };
