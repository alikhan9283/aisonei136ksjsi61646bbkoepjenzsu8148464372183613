const { cmd } = require('../command');
const { ytmp3, search } = require('@vreden/youtube_scraper');

// Same npm-scraper pattern as play.js / instagram2.js — kept as a separate
// alias command in case you want .play and .play2 to behave differently
// later (e.g. different quality), but both currently use the same package.

cmd({
    pattern: "play2",
    alias: ["song2", "ytmp3b"],
    desc: "Download YouTube audio by name or link (alt)",
    category: "download",
    filename: __filename,
    react: "🎵"
}, async (conn, mek, m, { from, args, reply }) => {
    const query = args.join(" ").trim();

    if (!query) {
        return reply(`╭─❏ 「 PLAY2」\n│ Usage: .play2 <song name / YouTube link>\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
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
