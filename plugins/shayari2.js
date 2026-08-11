const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
    pattern: "shayari2",
    alias: ["shr2", "poetry2"],
    desc: "Random Shayari (v2)",
    category: "fun",
    filename: __filename,
    react: "💝"
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: '⌛', key: mek.key } });
        const res = await fetch('https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo');
        const data = await res.json();
        if (!data?.result) throw new Error('No shayari found');
        await conn.sendMessage(from, {
            text: `╭─❏ 「 SHAYARI2」\n│\n│ 💝 ${data.result}\n│\n╰───────────────\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝗦𝗔𝗥𝗪𝗔𝗥-𝗠𝗗`
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Failed: ${e.message}`);
    }
});
