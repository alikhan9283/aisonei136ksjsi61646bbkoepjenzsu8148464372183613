const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// "Attitude" isn't a standard tag on these APIs, so we pull from
// categories that visually match — smug, cool/badass poses (megumin,
// shinobu), and Pinterest as a keyword-based fallback.
async function fetchAttitude() {
    const smugSources = [
        'https://api.waifu.pics/sfw/smug',
        'https://api.waifu.pics/sfw/megumin',
        'https://api.waifu.pics/sfw/shinobu'
    ];
    const pick = smugSources[Math.floor(Math.random() * smugSources.length)];

    try {
        const res = await axios.get(pick, AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { console.log('[ATTITUDE waifu.pics] failed:', e.message); }

    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/smug/img', AXIOS_DEFAULTS);
        if (res.data?.link) return res.data.link;
    } catch (e) { console.log('[ATTITUDE purrbot] failed:', e.message); }

    // Fallback: Pinterest keyword search scrape via siputzx
    try {
        const res = await axios.get('https://api.siputzx.my.id/api/s/pinterest?query=anime%20attitude%20boy%20aesthetic', AXIOS_DEFAULTS);
        const container = res.data?.data || res.data?.result || [];
        const item = Array.isArray(container) ? container[Math.floor(Math.random() * container.length)] : null;
        const img = item?.image || item?.url || item?.image_url;
        if (img) return img;
    } catch (e) { console.log('[ATTITUDE pinterest fallback] failed:', e.message); }

    throw new Error('All attitude image sources failed');
}

cmd({
  pattern: "attitude",
  alias: ["attitudeanime", "attipic"],
  desc: "Random anime attitude/aesthetic image",
  react: '😎',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  await store.react('⌛');
  try {
    const imgUrl = await fetchAttitude();
    const caption = `‎*_ᴀᴛᴛɪᴛᴜᴅᴇ_* 😎
‎╭───────────────━┈⊷
‎│▸🎴 Random Attitude Anime Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ Attitude Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching attitude image: ${error.message}`);
  }
});
