const { cmd } = require('../command');
const fetch = require('node-fetch');

function extractYtId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

cmd({
    pattern: "ytmp32",
    alias: ["yt32", "ytaudio2"],
    desc: "YouTube MP3 download (v2)",
    category: "download",
    filename: __filename,
    react: "🎵"
}, async (conn, mek, m, { from, args, reply }) => {
    const input = args[0];
    if (!input) return reply(`╭─❏ 「 YTMP32」\n│ Usage: .ytmp32 <youtube link>\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    const id = extractYtId(input);
    if (!id) return reply('❌ Invalid YouTube link!');
    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });
        const r = await fetch(`https://api.nexray.web.id/downloader/ytmp3?url=${encodeURIComponent('https://youtube.com/watch?v='+id)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 });
        const d = await r.json();
        if (!d.status || !d.result?.url) throw new Error('API failed');
        const dlRes = await fetch(d.result.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 40000 });
        const buf = Buffer.from(await dlRes.arrayBuffer());
        await conn.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: false, fileName: `${d.result.title || 'audio'}.mp3` }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        reply(`╭─❏ 「 YTMP32」\n│ 🎵 ${d.result.title || 'Unknown'}\n│ 🔊 ${d.result.quality || '320'}kbps\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
