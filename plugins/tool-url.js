const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { cmd } = require("../command");

cmd({
  'pattern': "tourl",
  'alias': ["imgtourl", "imgurl", "url", "geturl", "upload"],
  'react': '🖇',
  'desc': "Convert media (image/video/audio/document) to a direct URL",
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

    const rawFileName = (quotedMsg.msg || quotedMsg).fileName ||
                         (quotedMsg.msg || quotedMsg).filename || '';
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
      else if (mimeType.includes('audio/mp4')) extension = '.m4a';
      else if (mimeType.includes('audio/x-m4a')) extension = '.m4a';
      else if (mimeType.includes('audio/wav')) extension = '.wav';
      else if (mimeType.includes('application/pdf')) extension = '.pdf';
      else if (mimeType.includes('wordprocessingml')) extension = '.docx';
      else if (mimeType.includes('application/msword')) extension = '.doc';
      else if (mimeType.includes('spreadsheetml')) extension = '.xlsx';
      else if (mimeType.includes('application/vnd.ms-excel')) extension = '.xls';
      else if (mimeType.includes('presentationml')) extension = '.pptx';
      else if (mimeType.includes('application/vnd.ms-powerpoint')) extension = '.ppt';
      else if (mimeType.includes('application/zip')) extension = '.zip';
      else if (mimeType.includes('rar')) extension = '.rar';
      else extension = '.bin';
    }

    const fileName = rawFileName || `upload_${Date.now()}${extension}`;
    tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}${extension}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    const mediaUrl = await uploadWithFallback(tempFilePath, fileName);

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    if (!mediaUrl) {
      throw new Error("All upload hosts failed. Please try again later.");
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

    // Buttons: only cta_url is used here because cta_copy (copy-to-clipboard)
    // is an unofficial WhatsApp feature that Meta never released publicly.
    // It silently fails on most devices/app versions with no error thrown,
    // so it cannot be relied on. cta_url works consistently everywhere.
    try {
      await client.sendMessage(message.chat, {
        text: caption,
        footer: 'Sarwar-MD',
        buttons: [
          {
            buttonId: 'open_link',
            buttonText: { displayText: '🌐 Open Link' },
            type: 4,
            nativeFlowInfo: {
              name: 'cta_url',
              paramsJson: JSON.stringify({
                display_text: '🌐 Open Link',
                url: mediaUrl,
                merchant_url: mediaUrl
              })
            }
          }
        ],
        viewOnce: true
      }, { quoted: message.data });
    } catch (btnErr) {
      // If interactive buttons aren't supported on this session/device,
      // fall back to a plain text reply so the user still gets the link.
      console.error("Button send failed:", btnErr);
      await reply(caption);
    }

  } catch (error) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});

// Tries Catbox first, falls back to Uguu, then tmpfiles.org.
// This protects against Catbox returning 412 (host-level blocks/rate limits).
async function uploadWithFallback(filePath, fileName) {
  const browserUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 1. Catbox (primary)
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath), fileName);

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: { ...form.getHeaders(), 'User-Agent': browserUA },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const url = (res.data || '').toString().trim();
    if (url.startsWith('http')) return url;
  } catch (e) {
    console.error("Catbox failed:", e.response?.status || e.message);
  }

  // 2. Uguu (fallback)
  try {
    const form = new FormData();
    form.append('files[]', fs.createReadStream(filePath), fileName);

    const res = await axios.post('https://uguu.se/upload.php', form, {
      headers: { ...form.getHeaders(), 'User-Agent': browserUA },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (res.data?.files?.[0]?.url) return res.data.files[0].url;
  } catch (e) {
    console.error("Uguu failed:", e.response?.status || e.message);
  }

  // 3. tmpfiles.org (last resort)
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), fileName);

    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
      headers: { ...form.getHeaders(), 'User-Agent': browserUA },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const url = res.data?.data?.url;
    if (url) return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  } catch (e) {
    console.error("tmpfiles failed:", e.response?.status || e.message);
  }

  return null;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
