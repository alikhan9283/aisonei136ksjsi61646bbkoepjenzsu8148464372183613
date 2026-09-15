const axios = require('axios');
const { cmd } = require('../command');

const AXIOS_DEFAULTS = {
    timeout: 25000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

const API_KEY = 'supun-b4qb8wgwfd8o0qmzdxfo56cb';

async function fetchHomepage() {
    const res = await axios.get(
        `https://supunofc.site/api/drama/dramawave/homepage?apikey=${API_KEY}`,
        AXIOS_DEFAULTS
    );

    if (!res.data?.success || !res.data?.result?.data?.items?.length) {
        throw new Error('No drama listings found right now');
    }

    return res.data.result.data.items;
}

function formatEntry(item, moduleName) {
    return `‎*_${item.title}_* 🎬
‎╭───────────────━┈⊷
‎│▸📺 *sᴇᴄᴛɪᴏɴ:* ${moduleName}
‎│▸🎞️ *ᴇᴘɪsᴏᴅᴇs:* ${item.episode_count || 'Unknown'}
‎│▸📝 *ᴅᴇsᴄʀɪᴘᴛɪᴏɴ:* ${item.desc ? item.desc.slice(0, 200) + (item.desc.length > 200 ? '…' : '') : 'No description available'}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;
}

cmd({
  pattern: "dramanew",
  alias: ["dramahome", "dramalist"],
  desc: "Browse trending and coming-soon dramas with first-episode video",
  react: '🎬',
  category: 'search',
  filename: __filename
}, async (conn, m, store, {
  from,
  reply
}) => {
  await store.react('⌛');

  try {
    const modules = await fetchHomepage();
    // Take the first module (e.g. "Segera Tayang / Coming Soon") and its
    // first few entries, since dumping every module/item would flood the chat.
    const firstModule = modules[0];
    const moduleName = firstModule.module_name || 'Dramas';
    const entries = (firstModule.items || []).slice(0, 5);

    if (!entries.length) {
      await store.react('❌');
      return reply('⚠️ No drama entries found in this section right now.');
    }

    for (const item of entries) {
      const caption = formatEntry(item, moduleName);
      const videoUrl = item.episode_info?.external_audio_h264_m3u8;

      try {
        if (item.cover) {
          await conn.sendMessage(from, {
            image: { url: item.cover },
            caption
          }, { quoted: m });
        } else {
          await conn.sendMessage(from, { text: caption }, { quoted: m });
        }

        if (videoUrl) {
          await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `‎*_${item.title}_* — Episode 1`
          }, { quoted: m });
        }
      } catch (sendErr) {
        console.error(`[DRAMANEW] Failed to send entry "${item.title}":`, sendErr.message);
      }
    }

    await store.react('✅');
  } catch (error) {
    console.error("❌ Dramanew Error:", error);
    await store.react('❌');
    reply(`⚠️ Error fetching drama list: ${error.message}`);
  }
});
