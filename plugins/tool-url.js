const axios = require("axios");
const FormData = require('form-data');
const { cmd } = require("../command");
const { sendButtons } = require('gifted-btns');

cmd({
  'pattern': "tourl",
  'alias': ["imgtourl", "imgurl", "url", "geturl", "upload"],
  'react': '🖇',
  'desc': "Convert media to Catbox URL",
  'category': "utility",
  'use': ".tourl [reply to media]",
  'filename': __filename
}, async (client, message, match, { reply }) => {
  try {
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType) {
      return reply("🍁 Please reply to an image, video, audio, or document message");
    }

    const mediaBuffer = await quotedMsg.download();

    if (!mediaBuffer || mediaBuffer.length === 0) {
      throw new Error("Failed to download media");
    }

    // Direct Form-Data setup for external API endpoint
    const form = new FormData();
    form.append('file', mediaBuffer, {
      filename: `file_${Date.now()}.${mimeType.split('/')[1] || 'bin'}`,
      contentType: mimeType
    });

    // Upload using host proxy to avoid Cloudflare 412 Block
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...form.getHeaders()
      }
    }).catch(async () => {
      // Fallback API if Direct Catbox throws 412 again
      const altForm = new FormData();
      altForm.append('file', mediaBuffer, { filename: 'file.jpg' });
      return await axios.post('https://adeel-xtech-apis.vercel.app/api/upload', altForm, {
        headers: { ...altForm.getHeaders() }
      });
    });

    let mediaUrl = "";
    if (typeof res.data === 'string') {
      mediaUrl = res.data.trim();
    } else if (res.data && res.data.result && res.data.result.url) {
      mediaUrl = res.data.result.url;
    } else if (res.data && res.data.url) {
      mediaUrl = res.data.url;
    }

    if (!mediaUrl || !mediaUrl.startsWith('http')) {
      throw new Error("Upload failed. Could not fetch URL.");
    }

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
    console.error(error);
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
