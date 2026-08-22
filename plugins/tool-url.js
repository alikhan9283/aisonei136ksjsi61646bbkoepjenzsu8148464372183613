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
  'desc': "Convert media to Catbox URL",
  'category': "utility",
  'use': ".tourl [reply to media]",
  'filename': __filename
}, async (client, message, match, { reply }) => {
  let tempFilePath;
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

    // Get filename from quoted message if it's a document
    const rawFileName = (quotedMsg.msg || quotedMsg).fileName ||
                         (quotedMsg.msg || quotedMsg).filename || '';

    let extension = path.extname(rawFileName) || '';

    // fallback extension detection by mimetype if none found
    if (!extension) {
      if (mimeType.includes('image/jpeg')) extension = '.jpg';
      else if (mimeType.includes('image/png')) extension = '.png';
      else if (mimeType.includes('image/webp')) extension = '.webp';
      else if (mimeType.includes('image/gif')) extension = '.gif';
      else if (mimeType.includes('video/mp4')) extension = '.mp4';
      else if (mimeType.includes('video/3gpp')) extension = '.3gp';
      else if (mimeType.includes('audio/mpeg')) extension = '.mp3';
      else if (mimeType.includes('audio/ogg')) extension = '.ogg';
      else if (mimeType.includes('audio/mp4')) extension = '.m4a';
      else if (mimeType.includes('audio/x-m4a')) extension = '.m4a';
      else if (mimeType.includes('audio/wav')) extension = '.wav';
      else if (mimeType.includes('application/pdf')) extension = '.pdf';
      else if (mimeType.includes('application/msword')) extension = '.doc';
      else if (mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) extension = '.docx';
      else if (mimeType.includes('application/vnd.ms-excel')) extension = '.xls';
      else if (mimeType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) extension = '.xlsx';
      else if (mimeType.includes('application/vnd.ms-powerpoint')) extension = '.ppt';
      else if (mimeType.includes('application/zip')) extension = '.zip';
      else if (mimeType.includes('application/x-rar-compressed')) extension = '.rar';
      else extension = '.bin';
    }

    const fileName = rawFileName || `upload_${Date.now()}${extension}`;
    tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}${extension}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Direct upload to Catbox (no need for uguu middle step)
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', fs.createReadStream(tempFilePath), fileName);

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: {
        ...catboxForm.getHeaders(),
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    let mediaUrl = (catboxResponse.data || '').toString().trim();

    if (!mediaUrl || !mediaUrl.startsWith('http')) {
      throw new Error("Catbox upload failed: " + mediaUrl);
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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
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
