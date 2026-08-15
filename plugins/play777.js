const { cmd } = require('../command');
const { ytmp3, search } = require('@vreden/youtube_scraper');

// Same pattern as instagram2.js's ruhend-scraper igdl() — a maintained npm
// package does the scraping internally instead of this file calling a
// third-party HTTP API directly. If ytmp3()/search() ever break, only this
// package needs updating (`npm update @vreden/youtube_scraper`), not this
// file's logic.

cmd({
    pattern: "play7",
    alias: ["song7", "ytmp3"],
    desc: "Download YouTube audio by name or link",
    category: "download",
    filename: __filename,
    react: "🎵"
}, async (conn, mek, m, { from, args, reply }) => {
    const query = args.join(" ").trim();

    if (!query) {
        return reply(`╭─❏ 「 PLAY」\n│ Usage: .play <song name / YouTube link>\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    }

    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });

        // If a URL was given, use it directly; otherwise search first.
        let videoUrl = query;
        let meta = null;

        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const found = await search(query);
            if (!found?.status || !found.results?.length) throw new Error('No results found for that search');
            videoUrl = found.results[0].url;
            meta = found.results[0];
        }

        const result = await ytmp3(videoUrl);
        if (!result?.status || !result.download) throw new Error(result?.result || 'Download failed');

        const info = meta || result.metadata || {};
        const caption = `╭─❏ 「 YOUTUBE AUDIO」\n│ ℹ️ Title: ${info.title || 'Unknown'}\n│ 👤 Channel: ${info.author?.name || info.channel || 'Unknown'}\n│ 🕘 Duration: ${info.duration?.timestamp || info.duration || 'Unknown'}\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;

        await conn.sendMessage(from, {
            audio: { url: result.download },
            mimetype: 'audio/mpeg',
            fileName: `${(info.title || 'audio').slice(0, 40)}.mp3`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { text: caption }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
