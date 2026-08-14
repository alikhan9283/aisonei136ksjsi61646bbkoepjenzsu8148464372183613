const axios = require('axios');
const { cmd } = require("../command");

const AXIOS_DEFAULTS = {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

async function fetchAttitudeRealBoy() {
    const queries = [
        'real boy attitude aesthetic',
        'stylish boy attitude photo',
        'boy attitude pose aesthetic'
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
    } catch (e) { console.log('[ATTITUDEREALBOY pinterest] failed:', e.message); }

    throw new Error('All real boy attitude image sources failed');
}

cmd({
  pattern: "attitudeboyreal",
  alias: ["realboyattitude", "attiboyreal"],
  desc: "Random real (non-anime) boy attitude/aesthetic image",
  react: '😎',
  category: 'anime',
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  await store.react('⌛');
  try {
    const imgUrl = await fetchAttitudeRealBoy();
    const caption = `‎*_ᴀᴛᴛɪᴛᴜᴅᴇ ʙᴏʏ (ʀᴇᴀʟ)_* 😎
‎╭───────────────━┈⊷
‎│▸📸 Random Real Boy Attitude Image
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: m });
    await store.react('✅');
  } catch (error) {
    console.error("❌ AttitudeRealBoy Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching real boy attitude image: ${error.message}`);
  }
});
