const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { cmd } = require("../command");
const { sendButtons } = require('gifted-btns');

cmd({
  'pattern': "tourl",
  'alias': ["imgtourl", "imgurl", "url", "geturl", "upload"],
  'react': '🖇',
  'desc': "Convert media to Catbox URL via Adeel-Xtech API",
  'category': "utility",
  'use': ".tourl [reply to media]",
  'filename': __filename
}, async (client, message, match, { reply }) => {
  let tempFilePath = null;
  try {
    const quotedMsg = message.quoted ? message.quoted : message;
    const msgObj = quotedMsg.msg || quotedMsg;
    const mimeType = msgObj.mimetype || quotedMsg.mimetype || '';

    if (!mimeType) {
      return reply("🍁 Please reply to an image, video, audio, or document message.");
    }

    const mediaBuffer = await quotedMsg.download();
    if (!mediaBuffer || mediaBuffer.length === 0) {
      throw new Error("Failed to download media buffer");
    }

    // Original file name & extension check
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
      else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) extension = '.docx';
      else if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) extension = '.xlsx';
      else if (mimeType.includes('presentationml') || mimeType.includes('powerpoint')) extension = '.pptx';
      else if (mimeType.includes('zip')) extension = '.zip';
      else if (mimeType.includes('rar')) extension = '.rar';
      else extension = '.bin';
    }

    const fileName = rawFileName || `upload_${Date.now()}${extension}`;
    tempFilePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Form submission to Adeel-Xtech Endpoint
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFilePath), fileName);

    const apiResponse = await axios.post('https://adeel-xtech-apis.vercel.app/api/imgtourl', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 90000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // Cleanup local temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;
    }

    if (!apiResponse.data || apiResponse.data.status !== true || !apiResponse.data.result || !apiResponse.data.result.url) {
      throw new Error("Adeel-Xtech API failed to return a valid URL");
    }

    const mediaUrl = apiResponse.data.result.url.trim();

    // Determine Media Type
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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    console.error("Upload Command Error:", error);
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
