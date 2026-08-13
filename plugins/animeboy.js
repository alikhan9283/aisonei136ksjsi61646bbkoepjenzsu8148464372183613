const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Multiple free, no-key sources so if one goes down the command keeps working
async function fetchAnimeBoy() {
    // Source 1: waifu.pics
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/megumin', AXIOS_DEFAULTS);
        if (res.data?.url) return res.data.url;
    } catch (e) { console.log('[ANIMEBOY waifu.pics] failed:', e.message); }

    // Source 2: purrbot.site (has a dedicated "boy" endpoint)
    try {
        const res = await axios.get('https://purrbot.site/api/img/sfw/boy/img', AXIOS_DEFAULTS);
        if (res.data?.link) return res.data.link;
    } catch (e) { console.log('[ANIMEBOY purrbot] failed:', e.message); }

    // Source 3: waifu.im (tag-based, has "male" search via random)
    try {
        const res = await axios.get('https://api.waifu.im/search?included_tags=waifu&is_nsfw=false', AXIOS_DEFAULTS);
        const img = res.data?.images?.[0]?.url;
        if (img) return img;
    } catch (e) { console.log('[ANIMEBOY waifu.im] failed:', e.message); }

    throw new Error('All anime boy image sources failed');
}

cmd({
  pattern: "animeboy",
  alias: ["aboy", "animeb"],
  desc: "Random anime boy image",
  react: '🧑‍🎨',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  await store.react('⌛');
  try {
    const imgUrl = await fetchAnimeBoy();
    const caption = `‎*_ᴀɴɪᴍᴇ ʙᴏʏ_* 🧑‍🎨
‎╭───────────────━┈⊷
‎│▸🎴 Random Anime Boy Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ AnimeBoy Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching anime boy image: ${error.message}`);
  }
});
