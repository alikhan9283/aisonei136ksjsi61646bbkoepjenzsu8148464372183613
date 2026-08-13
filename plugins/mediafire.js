const axios = require('axios');
const cheerio = require('cheerio');
const { cmd } = require("../command");

cmd({
  pattern: "mediafire",
  alias: ["mf", "mfire"],
  desc: "Download MediaFire file",
  react: '📦',
  category: 'downloader',
  filename: __filename
}, async (conn, m, store, {
  from,
  args,
  reply
}) => {
  const query = args.join(" ").trim();

  if (!query) {
    return reply(`📦 *MEDIAFIRE DOWNLOADER*

⚠️ No URL Provided
💡 Use: .mediafire <url>
📝 Example: .mediafire https://www.mediafire.com/file/xxx

‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`);
  }

  if (!query.includes('mediafire.com')) {
    await store.react('❌');
    return reply(`❌ Invalid MediaFire URL!

‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`);
  }

  await store.react('⌛');

  try {
    let downloadUrl = null;
    let fileName = null;

    // API 1: deline.web.id
    try {
      const { data } = await axios.get(`https://api.deline.web.id/downloader/mediafire?url=${encodeURIComponent(query)}`, { timeout: 20000 });
      if (data?.status && data?.result?.downloadUrl) {
        downloadUrl = data.result.downloadUrl;
        fileName = data.result.fileName;
      }
    } catch (e) {
      console.log("MediaFire API 1 failed:", e.message);
    }

    // API 2: itzpire
    if (!downloadUrl) {
      try {
        const { data } = await axios.get(`https://itzpire.com/download/mediafire?url=${encodeURIComponent(query)}`, { timeout: 20000 });
        if (data?.result?.downloadLink || data?.result?.url) {
          downloadUrl = data.result.downloadLink || data.result.url;
          fileName = data.result.fileName || data.result.title;
        }
      } catch (e) {
        console.log("MediaFire API 2 failed:", e.message);
      }
    }

    // API 3: Vreden
    if (!downloadUrl) {
      try {
        const { data } = await axios.get(`https://api.vreden.my.id/api/mediafire?url=${encodeURIComponent(query)}`, { timeout: 20000 });
        if (data?.result?.link || data?.result?.download_url) {
          downloadUrl = data.result.link || data.result.download_url;
          fileName = data.result.filename || data.result.fileName;
        }
      } catch (e) {
        console.log("MediaFire API 3 failed:", e.message);
      }
    }

    // Fallback: Direct Scraper
    if (!downloadUrl) {
      try {
        const res2 = await axios.get(query, { timeout: 20000 });
        const $ = cheerio.load(res2.data);
        const scrapedLink = $('a#downloadButton').attr('href');
        if (scrapedLink) {
          downloadUrl = scrapedLink;
          fileName = scrapedLink.split('/').pop();
        }
      } catch (e) {
        console.log("MediaFire Scraper failed:", e.message);
      }
    }

    if (!downloadUrl) {
      await store.react('❌');
      return reply("❌ *MediaFire Download Failed!*\n\nAll sources are down or the link is invalid/expired.");
    }

    if (!fileName) fileName = downloadUrl.split('/').pop().split('?')[0] || 'file';

    const caption = `‎*_ᴍᴇᴅɪᴀғɪʀᴇ ᴅᴏᴡɴʟᴏᴀᴅ_* 📦
‎╭───────────────━┈⊷
‎│▸📄 *ғɪʟᴇ:* ${fileName}
‎╰───────────────━┈⊷
‎*╭───────◉◉◉────━┈៚*
‎┋      *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ_* 
‎*╰───────◉◉◉────━┈៚*`;

    await conn.sendMessage(from, {
      document: { url: downloadUrl },
      fileName: fileName,
      mimetype: "application/octet-stream",
      caption: caption
    }, { quoted: m });

    await store.react('✅');
  } catch (error) {
    console.error("❌ MediaFire Downloader Error:", error);
    await store.react('❌');
    reply(`⚠️ Error downloading MediaFire file: ${error.message}`);
  }
});
