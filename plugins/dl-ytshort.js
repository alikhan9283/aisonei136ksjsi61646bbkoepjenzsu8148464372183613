const { cmd } = require('../command');
const yts = require('yt-search');
const scrap = require('@dark-yasiya/scrap');

const FOOTER = `‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:shorts\/|[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}
function isYoutubeUrl(str) {
    return /(?:youtube\.com|youtu\.be)/i.test(str);
}

// @dark-yasiya/scrap is a package already installed in this bot's own
// package.json (confirmed live response format: result.data for metadata,
// result.download.url for the direct file). Using the installed package
// directly instead of a third-party HTTP API means there's no external
// endpoint to go down independently of this bot's own dependencies.
cmd({
    pattern: "ytshort",
    alias: ["short", "shorts", "ytshorts"],
    desc: "Download a YouTube Shorts or regular video",
    category: "download",
    react: "📱",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    const input = args.join(" ").trim();

    if (!input) {
        return reply(`🌸 Please provide a YouTube link or name.\n\n*Usage Example:*\n.ytshort <link / name>\n\n📝 Example: .ytshort https://youtube.com/shorts/xxxxxxxxxxx`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let url = input;

        if (input.startsWith('http://') || input.startsWith('https://')) {
            if (!isYoutubeUrl(input)) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ Please provide a valid YouTube link!');
            }
            const videoId = getVideoId(input);
            if (!videoId) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ Invalid YouTube URL!');
            }
            url = `https://youtube.com/watch?v=${videoId}`;
        } else {
            const search = await yts(input);
            if (!search.videos || !search.videos.length) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ No results found!');
            }
            url = search.videos[0].url;
        }

        const result = await scrap.ytmp4(url, 360);

        if (!result?.status || !result?.download?.url) {
            console.error('[YTSHORT] Unexpected response:', JSON.stringify(result));
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ Download failed: ${result?.result || 'No video URL returned'}`);
        }

        const info = result.result?.data || {};

        const caption = `‎*_ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ_* 📱
‎╭───────────────━┈⊷
‎│▸ℹ️ *ᴛɪᴛʟᴇ:* ${info.title || 'Unknown'}
‎│▸👤 *ᴄʜᴀɴɴᴇʟ:* ${info.author?.name || 'Unknown'}
‎│▸🕘 *ᴅᴜʀᴀᴛɪᴏɴ:* ${info.timestamp || 'Unknown'}
‎╰───────────────━┈⊷
${FOOTER}`;

        await conn.sendMessage(from, {
            video: { url: result.download.url },
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error("❌ YTShort Error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`⚠️ Error downloading video: ${error.message}`);
    }
});
