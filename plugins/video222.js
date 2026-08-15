const { cmd } = require('../command');
const { ytmp4, search } = require('@vreden/youtube_scraper');

// Same npm-scraper pattern as play.js / instagram2.js — ytmp4() from the
// same maintained package handles video downloads.

cmd({
    pattern: "video7",
    alias: ["ytmp7", "ytvideo"],
    desc: "Download YouTube video by name or link",
    category: "download",
    filename: __filename,
    react: "🎬"
}, async (conn, mek, m, { from, args, reply }) => {
    const query = args.join(" ").trim();

    if (!query) {
        return reply(`╭─❏ 「 VIDEO」\n│ Usage: .video <name / YouTube link>\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });

        let videoUrl = query;
        let meta = null;

        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const found = await search(query);
            if (!found?.status || !found.results?.length) throw new Error('No results found for that search');
            videoUrl = found.results[0].url;
            meta = found.results[0];
        }

        const result = await ytmp4(videoUrl);
        if (!result?.status || !result.download) throw new Error(result?.result || 'Download failed');

        const info = meta || result.metadata || {};
        const caption = `╭─❏ 「 YOUTUBE VIDEO」\n│ ℹ️ Title: ${info.title || 'Unknown'}\n│ 👤 Channel: ${info.author?.name || info.channel || 'Unknown'}\n│ 🕘 Duration: ${info.duration?.timestamp || info.duration || 'Unknown'}\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;

        await conn.sendMessage(from, {
            video: { url: result.download },
            mimetype: 'video/mp4',
            caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
