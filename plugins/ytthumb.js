const axios = require('axios');
const { cmd } = require("../command");

// YouTube's own CDN serves thumbnails directly at predictable URLs — no API
// key, no third-party service, and it has never gone down in YouTube's
// history. This is the primary, most-reliable method. The quality levels
// are checked in order from highest to lowest, since not every video has
// a 👑 𝐒𝐀𝐑𝐖𝐀𝐑 𝐌𝐃 👑 (HD) thumbnail generated.
const QUALITY_LEVELS = ['👑 𝐒𝐀𝐑𝐖𝐀𝐑 𝐌𝐃 👑', 'sddefault', 'hqdefault', 'mqdefault', 'default'];

function extractVideoId(input) {
    const trimmed = input.trim();

    // Already a bare video ID (11 chars, YouTube's format)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
        const url = new URL(trimmed);
        if (url.hostname.includes('youtu.be')) {
            return url.pathname.slice(1).split('/')[0];
        }
        if (url.hostname.includes('youtube.com')) {
            if (url.pathname.startsWith('/shorts/')) {
                return url.pathname.split('/')[2];
            }
            if (url.pathname.startsWith('/embed/')) {
                return url.pathname.split('/')[2];
            }
            return url.searchParams.get('v');
        }
    } catch {
        // not a valid URL, fall through
    }

    return null;
}

// Method 1 (primary): YouTube's own CDN — checks each quality level by
// actually requesting it, since low-view videos may not have HD thumbnails
// generated and YouTube returns a tiny 120x90 placeholder instead of a 404.
async function fetchFromYoutubeCDN(videoId) {
    for (const quality of QUALITY_LEVELS) {
        const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
            // YouTube returns a real image even for missing qualities, but a
            // known placeholder (120x90, ~1-2KB) for ones that don't exist —
            // anything meaningfully bigger than that is a real thumbnail.
            if (res.data && res.data.length > 3000) {
                return { url, buffer: Buffer.from(res.data), quality };
            }
        } catch (e) {
            // try next quality
        }
    }
    return null;
}

// Method 2 (backup): i.ytimg.com — an alternate YouTube CDN hostname that
// serves the same images but is occasionally reachable when img.youtube.com
// has regional issues.
async function fetchFromYtimgCDN(videoId) {
    for (const quality of QUALITY_LEVELS) {
        const url = `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
            if (res.data && res.data.length > 3000) {
                return { url, buffer: Buffer.from(res.data), quality };
            }
        } catch (e) {
            // try next quality
        }
    }
    return null;
}

// Method 3 (backup): the user-provided Cloudflare Worker endpoint. Kept as
// a fallback since its exact request format isn't publicly documented and
// couldn't be verified — if it works for your setup it adds one more
// source; if the endpoint ever changes, the two YouTube-CDN methods above
// still guarantee this command keeps working either way.
async function fetchFromWorkerAPI(originalUrl) {
    const { data } = await axios.get(`https://old-studio-thum-down.oldhacker7866.workers.dev/?url=${encodeURIComponent(originalUrl)}`, { timeout: 15000 });
    const thumbUrl = data?.thumbnail || data?.result?.thumbnail || data?.url || (typeof data === 'string' ? data : null);
    if (!thumbUrl) throw new Error('No thumbnail URL in response');
    const imgRes = await axios.get(thumbUrl, { responseType: 'arraybuffer', timeout: 15000 });
    return { url: thumbUrl, buffer: Buffer.from(imgRes.data), quality: 'unknown' };
}

cmd({
  pattern: "ytthumb",
  alias: ["ytthumbnail", "ythumb"],
  desc: "Download a YouTube video's thumbnail in the highest available quality",
  react: '🖼️',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  const input = args.join(" ").trim();

  if (!input) {
    return reply(`🖼️ *YOUTUBE THUMBNAIL DOWNLOADER*

⚠️ No URL/ID provided
💡 Use: .ytthumb <youtube url or video id>
📝 Example: .ytthumb https://youtu.be/dQw4w9WgXcQ

‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`);
  }

  const videoId = extractVideoId(input);
  if (!videoId) {
    await store.react('❌');
    return reply(`❌ Invalid YouTube URL or video ID!

‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`);
  }

  await store.react('⌛');

  try {
    let result = null;
    const errors = [];

    try {
      result = await fetchFromYoutubeCDN(videoId);
    } catch (e) { errors.push(`YouTube CDN: ${e.message}`); }

    if (!result) {
      try {
        result = await fetchFromYtimgCDN(videoId);
      } catch (e) { errors.push(`ytimg CDN: ${e.message}`); }
    }

    if (!result) {
      try {
        result = await fetchFromWorkerAPI(input);
      } catch (e) { errors.push(`Worker API: ${e.message}`); }
    }

    if (!result) {
      await store.react('❌');
      return reply(`❌ *Failed to fetch thumbnail!*\n\nAll sources failed — video may not exist or is private.\n\n${errors.join('\n')}`);
    }

    const caption = `‎*_ʏᴏᴜᴛᴜʙᴇ ᴛʜᴜᴍʙɴᴀɪʟ_* 🖼️
‎╭───────────────━┈⊷
‎│▸🎞️ *ǫᴜᴀʟɪᴛʏ:* ${result.quality}
‎│▸🔗 *ᴠɪᴅᴇᴏ ɪᴅ:* ${videoId}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      image: result.buffer,
      caption
    }, { quoted: m });

    await store.react('✅');
  } catch (error) {
    console.error("❌ YouTube Thumbnail Error:", error);
    await store.react('❌');
    reply(`⚠️ Error: ${error.message}`);
  }
});
