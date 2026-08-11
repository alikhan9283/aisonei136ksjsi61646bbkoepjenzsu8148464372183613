const fetch = require('node-fetch');
const { cmd } = require('../command');

// ── TIKTOKSEARCH1 — tikwm API ─────────────────────────────
cmd({
    pattern: "tiktoksearch1",
    alias: ["tts1", "tiks1"],
    desc: "TikTok search (API 1 - tikwm)",
    category: "search",
    filename: __filename,
    react: "🔍"
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`╭─❏ 「 TIKTOK SEARCH 1」\n│ Usage: .tiktoksearch1 <query>\n│ Example: .tiktoksearch1 sarwaraliabro15\n│ Example: .tiktoksearch1 sad songs urdu\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);

    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });
        reply(`🔎 Searching TikTok for: *${q}*`);

        const res = await fetch(
            `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=5&cursor=0&web=1&hd=1`,
            { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 15000 }
        );
        const data = await res.json();

        if (!data?.data?.videos?.length) throw new Error(`"${q}" ke liye koi results nahi mile`);

        const videos = data.data.videos.slice(0, 5);
        let txt = `🎵 *TikTok Results: ${q}*\n\n`;
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            txt += `*${i + 1}.* ${v.title || 'No title'}\n`;
            txt += `👤 @${v.author?.unique_id || 'unknown'}\n`;
            txt += `❤️ ${Number(v.digg_count || 0).toLocaleString()} | 👁 ${Number(v.play_count || 0).toLocaleString()}\n`;
            txt += `🔗 https://www.tiktok.com/@${v.author?.unique_id}/video/${v.video_id}\n\n`;
        }
        txt += `╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;

        if (videos[0]?.cover) {
            await conn.sendMessage(from, { image: { url: videos[0].cover }, caption: txt }, { quoted: mek });
        } else {
            await conn.sendMessage(from, { text: txt }, { quoted: mek });
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message}`);
    }
});

// ── TIKTOKSEARCH2 — starlights API ───────────────────────
cmd({
    pattern: "tiktoksearch2",
    alias: ["tts2", "tiks2"],
    desc: "TikTok search (API 2 - starlights)",
    category: "search",
    filename: __filename,
    react: "🔍"
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(`╭─❏ 「 TIKTOK SEARCH 2」\n│ Usage: .tiktoksearch2 <query>\n│ Example: .tiktoksearch2 funny videos\n│ Example: .tiktoksearch2 cricket highlights\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);

    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });
        reply(`🔎 Searching TikTok for: *${q}*`);

        const res = await fetch(
            `https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(q)}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }
        );
        const data = await res.json();

        if (!data?.data?.length) throw new Error(`"${q}" ke liye results nahi mile`);

        const videos = data.data.slice(0, 5);
        let txt = `🎵 *TikTok Results: ${q}*\n\n`;
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            txt += `*${i + 1}.* ${v.title || v.desc || 'No title'}\n`;
            txt += `👤 @${v.author?.uniqueId || v.author || 'unknown'}\n`;
            txt += `❤️ ${Number(v.stats?.diggCount || v.diggCount || 0).toLocaleString()}\n`;
            txt += `🔗 ${v.url || v.share_url || 'N/A'}\n\n`;
        }
        txt += `╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;

        const thumb = videos[0]?.cover || videos[0]?.thumbnail || videos[0]?.video?.cover;
        if (thumb) {
            await conn.sendMessage(from, { image: { url: thumb }, caption: txt }, { quoted: mek });
        } else {
            await conn.sendMessage(from, { text: txt }, { quoted: mek });
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message}`);
    }
});

// ── TIKTOK4 — drkamran API (proven working) ──────────────
cmd({
    pattern: "tiktok4",
    alias: ["tt4", "tikdl4"],
    desc: "TikTok video download (API 4 - drkamran)",
    category: "download",
    filename: __filename,
    react: "🎬"
}, async (conn, mek, m, { from, args, reply }) => {
    const url = args[0];
    if (!url) return reply(`╭─❏ 「 TIKTOK4」\n│ Usage: .tiktok4 <tiktok link>\n│ Example: .tiktok4 https://vt.tiktok.com/xxx\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`);
    if (!url.includes('tiktok.com')) return reply('❌ TikTok link nahi hai!');

    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });

        const res = await fetch(
            `https://drkamran.vercel.app/api/download/tiktok?url=${encodeURIComponent(url)}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 }
        );

        if (!res.ok) throw new Error('API Connection Failed');

        const json = await res.json();
        if (!json.status || !json.data) throw new Error('No video data found');

        const data = json.data;
        const videoUrl = data.links?.[0] || data.play || data.video_url;
        if (!videoUrl) throw new Error('No video URL found');

        const caption = `╭─❏ 「 TIKTOK4」\n│ 🎬 ${data.title || 'TikTok Video'}\n│ 👤 ${data.author || 'Unknown'}\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`;

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption,
            mimetype: 'video/mp4',
            fileName: 'tiktok.mp4'
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
