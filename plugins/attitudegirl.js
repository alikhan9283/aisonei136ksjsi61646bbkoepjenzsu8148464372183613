const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Same approach as attitude.js (boy) — Pinterest keyword search is the
// source that actually returns good-quality matching results, with
// waifu.pics smug-style categories as a lighter fallback.
async function fetchAttitudeGirl() {
    const queries = [
        'anime attitude girl aesthetic',
        'anime girl attitude cool',
        'badass anime girl aesthetic'
    ];
    const q = queries[Math.floor(Math.random() * queries.length)];

    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(q)}`, AXIOS_DEFAULTS);
        const container = res.data?.data || res.data?.result || [];
        const arr = Array.isArray(container) ? container : [];
        if (arr.length) {
            const item = arr[Math.floor(Math.random() * arr.length)];
            const img = item?.image || item?.url || item?.image_url;
            if (img) return img;
        }
    } catch (e) { console.log('[ATTITUDEGIRL pinterest] failed:', e.message); }

    try {
        const res = await axios.get('https://api.waifu.pics/sfw/smug', AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { console.log('[ATTITUDEGIRL waifu.pics] failed:', e.message); }

    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/smug/img', AXIOS_DEFAULTS);
        if (res.data?.link) return res.data.link;
    } catch (e) { console.log('[ATTITUDEGIRL purrbot] failed:', e.message); }

    throw new Error('All attitude girl image sources failed');
}

cmd({
  pattern: "attitudegirl",
  alias: ["girlattitude", "attigirl"],
  desc: "Random anime girl attitude/aesthetic image",
  react: '😎',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  await store.react('⌛');
  try {
    const imgUrl = await fetchAttitudeGirl();
    const caption = `‎*_ᴀᴛᴛɪᴛᴜᴅᴇ ɢɪʀʟ_* 😎
‎╭───────────────━┈⊷
‎│▸🎴 Random Attitude Anime Girl Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ AttitudeGirl Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching attitude girl image: ${error.message}`);
  }
});
