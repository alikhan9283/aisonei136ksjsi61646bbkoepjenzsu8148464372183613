const axios = require("axios");
const FormData = require('form-data');
const path = require("path");
const { cmd } = require("../command");
const { sendButtons } = require('gifted-btns');

cmd({
  'pattern': "tourl",
  'alias': ["imgtourl", "imgurl", "url", "geturl", "upload"],
  'react': '🖇',
  'desc': "Convert image, video, audio & docs to Catbox URL",
  'category': "utility",
  'use': ".tourl [reply to media]",
  'filename': __filename
}, async (client, message, match, { reply }) => {
  try {
    // 1. Quoted Message & Handler Check
    const quotedMsg = message.quoted ? message.quoted : message;
    if (!quotedMsg) {
      return reply("🍁 Please reply to an image, video, audio, or document message.");
    }

    // Media Object resolution
    const msgObj = quotedMsg.msg || quotedMsg;
    const mimeType = msgObj.mimetype || quotedMsg.mimetype || '';

    if (!mimeType) {
      return reply("🍁 Invalid media type. Please reply to a valid image, video, audio, or document.");
    }

    // 2. Download Buffer
    const mediaBuffer = await quotedMsg.download();
    if (!mediaBuffer || mediaBuffer.length === 0) {
      return reply("❌ Failed to download media. Please try again.");
    }

    // 3. Extension & Filename handling
    const rawFileName = msgObj.fileName || msgObj.filename || '';
    let extension = path.extname(rawFileName) || '';

    if (!extension) {
      if (mimeType.includes('image/jpeg')) extension = '.jpg';
      else if (mimeType.includes('image/png')) extension = '.png';
      else if (mimeType.includes('image/webp')) extension = '.webp';
      else if (mimeType.includes('image/gif')) extension = '.gif';
      else if (mimeType.includes('video/mp4')) extension = '.mp4';
      else if (mimeType.includes('video/3gpp')) extension = '.3gp';
      else if (mimeType.includes('audio/mpeg')) extension = '.mp3';
      else if (mimeType.includes('audio/ogg')) extension = '.ogg';
      else if (mimeType.includes('audio/mp4') || mimeType.includes('audio/x-m4a')) extension = '.m4a';
      else if (mimeType.includes('audio/wav')) extension = '.wav';
      else if (mimeType.includes('pdf')) extension = '.pdf';
      else if (mimeType.includes('wordprocessingml')) extension = '.docx';
      else if (mimeType.includes('spreadsheetml')) extension = '.xlsx';
      else if (mimeType.includes('zip')) extension = '.zip';
      else extension = '.bin';
    }

    const fileName = rawFileName || `file_${Date.now()}${extension}`;
    let mediaUrl = "";

    // LOGIC 1: Direct Catbox Upload (Cloudflare 412 Bypass Stream)
    try {
      const form1 = new FormData();
      form1.append('reqtype', 'fileupload');
      form1.append('fileToUpload', mediaBuffer, {
        filename: fileName,
        contentType: mimeType
      });

      const res1 = await axios.post('https://catbox.moe/user/api.php', form1, {
        headers: {
          ...form1.getHeaders(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Origin': 'https://catbox.moe',
          'Referer': 'https://catbox.moe/'
        },
        timeout: 60000
      });

      if (res1.data && typeof res1.data === 'string' && res1.data.startsWith('http')) {
        mediaUrl = res1.data.trim();
      }
    } catch (e1) {
      console.log("Catbox direct upload failed, switching to backup logic...");
    }

    // LOGIC 2: Alternate Catbox Host via Proxy / Adeel-Xtech Bridge
    if (!mediaUrl) {
      try {
        const form2 = new FormData();
        form2.append('file', mediaBuffer, {
          filename: fileName,
          contentType: mimeType
        });

        const res2 = await axios.post('https://catbox.moe/user/api.php', form2, {
          headers: {
            ...form2.getHeaders(),
            'User-Agent': 'PostmanRuntime/7.32.3'
          }
        });

        if (res2.data && typeof res2.data === 'string' && res2.data.startsWith('http')) {
          mediaUrl = res2.data.trim();
        }
      } catch (e2) {
        console.log("Backup Catbox upload failed.");
      }
    }

    // LOGIC 3: Direct API Bridge (Adeel-Xtech API Wrapper fallback)
    if (!mediaUrl) {
      try {
        const form3 = new FormData();
        form3.append('image', mediaBuffer, {
          filename: fileName,
          contentType: mimeType
        });

        const res3 = await axios.post('https://api.imgbb.com/1/upload?key=6d207e02198a847aa98d0a2a901485a5', form3, {
          headers: { ...form3.getHeaders() }
        });

        if (res3.data && res3.data.data && res3.data.data.url) {
          const tempUrl = res3.data.data.url;
          // Adeel-Xtech API integration
          const resAdeel = await axios.get(`https://adeel-xtech-apis.vercel.app/api/imgtourl?url=${encodeURIComponent(tempUrl)}`);
          if (resAdeel.data && resAdeel.data.result && resAdeel.data.result.url) {
            mediaUrl = resAdeel.data.result.url;
          } else {
            mediaUrl = tempUrl;
          }
        }
      } catch (e3) {
        console.log("Adeel-Xtech API bridge failed.");
      }
    }

    if (!mediaUrl) {
      throw new Error("Unable to upload media. All upload servers are currently blocking the request.");
    }

    // Determine Type Label
    let mediaType = 'File';
    if (mimeType.includes('image')) mediaType = 'Image';
    else if (mimeType.includes('video')) mediaType = 'Video';
    else if (mimeType.includes('audio')) mediaType = 'Audio';
    else if (mimeType.includes('application') || mimeType.includes('text')) mediaType = 'Document';

    const caption =
      `*${mediaType} Uploaded Successfully*\n\n` +
      `*Size:* ${formatBytes(mediaBuffer.length)}\n` +
      `*URL:* ${mediaUrl}\n\n` +
      `> *© ᴜᴘʟᴏᴀᴅᴇᴅ ʙʏ ꜱᴀʀᴡᴀʀ-ᴍᴅ 🍸*`;

    // Send Result with Gifted Buttons
    await sendButtons(client, message.chat, {
      title: '',
      text: caption,
      buttons: [
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: '📋 Copy Url',
            copy_code: mediaUrl
          })
        },
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: '🌐 Open Link',
            url: mediaUrl
          })
        }
      ]
    });

  } catch (error) {
    console.error("ToURL Command Error:", error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
