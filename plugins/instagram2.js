const { cmd } = require('../command');
const { igdl } = require('ruhend-scraper');

cmd({
    pattern: "instagram2",
    alias: ["ig2", "igdown2"],
    desc: "Instagram video/image download (v2)",
    category: "download",
    filename: __filename,
    react: "📸"
}, async (conn, mek, m, { from, args, reply }) => {
    const url = args[0];
    if (!url) return reply(`╭─❏ 「 INSTAGRAM2」\n│ Usage: .instagram2 <instagram link>\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    if (!url.includes('instagram.com')) return reply('❌ Instagram link nahi hai!');
    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });
        const data = await igdl(url);
        if (!data?.data?.length) throw new Error('No media found');
        const media = [...new Map(data.data.filter(x => x.url).map(x => [x.url, x])).values()].slice(0, 10);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        for (let i = 0; i < media.length; i++) {
            try {
                const item = media[i];
                const isVid = item.type === 'video' || /\.(mp4|mov)$/i.test(item.url) || url.includes('/reel/');
                if (isVid) {
                    await conn.sendMessage(from, { video: { url: item.url }, mimetype: 'video/mp4', caption: `╭─❏ 「 INSTAGRAM2」\n│ 📸 ${i+1}/${media.length}\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗` }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, { image: { url: item.url }, caption: `╭─❏ 「 INSTAGRAM2」\n│ 📸 ${i+1}/${media.length}\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗` }, { quoted: mek });
                }
                await new Promise(r => setTimeout(r, 1000));
            } catch {}
        }
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
