const { cmd } = require('../command');
const axios = require('axios');

async function igDownload(url) {
    const apis = [
        // API 1: nexray
        async () => {
            const r = await axios.get(`https://api.nexray.web.id/downloader/v2/instagram?url=${encodeURIComponent(url)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
            if (r.data?.status && r.data?.result?.media?.length) {
                return r.data.result.media.map(m => ({ url: m.url, type: m.type }));
            }
            throw new Error('nexray failed');
        },
        // API 2: saveig
        async () => {
            const r = await axios.get(`https://api.saveig.app/api?url=${encodeURIComponent(url)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
            if (r.data?.data?.length) {
                return r.data.data.map(m => ({ url: m.url, type: m.type }));
            }
            throw new Error('saveig failed');
        },
        // API 3: DownloadGram
        async () => {
            const r = await axios.post('https://v3.downloadgram.org/wp-json/aio-dl/video-data', 
                { url },
                { headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' }, timeout: 15000 }
            );
            if (r.data?.medias?.length) {
                return r.data.medias.map(m => ({ url: m.url, type: m.extension === 'mp4' ? 'video' : 'image' }));
            }
            throw new Error('downloadgram failed');
        }
    ];

    for (const api of apis) {
        try {
            const result = await api();
            if (result?.length) return result;
        } catch {}
    }
    throw new Error('All APIs failed — link check karo ya baad mein try karo');
}

cmd({
    pattern: "instagram3",
    alias: ["ig3", "igdown3"],
    desc: "Instagram video/image download (v3 - Multi API)",
    category: "download",
    filename: __filename,
    react: "📸"
}, async (conn, mek, m, { from, args, reply }) => {
    const url = args[0];
    if (!url) return reply(`╭─❏ 「 INSTAGRAM3」\n│ Usage: .instagram3 <instagram link>\n│\n│ Works with:\n│ • Posts\n│ • Reels\n│ • Stories\n│ • Carousels\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    if (!url.includes('instagram.com')) return reply('❌ Instagram link nahi hai!');
    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });
        const media = await igDownload(url);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        for (let i = 0; i < media.slice(0, 10).length; i++) {
            try {
                const item = media[i];
                const isVid = item.type === 'video' || /\.(mp4|mov)$/i.test(item.url) || url.includes('/reel/');
                const cap = `╭─❏ 「 INSTAGRAM3」\n│ 📸 ${i+1}/${media.length}\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;
                if (isVid) {
                    await conn.sendMessage(from, { video: { url: item.url }, mimetype: 'video/mp4', caption: cap }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, { image: { url: item.url }, caption: cap }, { quoted: mek });
                }
                await new Promise(r => setTimeout(r, 1000));
            } catch {}
        }
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
