const { cmd } = require("../command");

// ================= TRIGGER WORDS =================
const triggerWords = [
  // English
  "nice", "good", "ok", "okay", "wow", "wao", "waoo", "wha", "whaa", "whaaa",
  "very nice", "so nice", "so beautiful", "beautiful", "beauty", "pretty",
  "amazing", "awesome", "perfect", "lovely", "cute", "sweet", "hot", "sexy",
  "fantastic", "superb", "excellent", "great", "cool", "best", "love", "like",
  "yes", "yess", "yeah", "yup", "hmm", "hmmm", "ohh", "ohhh", "ahh", "ahhh",
  "woww", "wowww", "nicee", "niceee", "goodd", "goood",

  // Roman Urdu / Hindi
  "mashallah", "mashaallah", "ma sha allah", "masha allah", "subhanallah",
  "subhan allah", "allah hu akbar", "bohat acha", "boht acha", "bahut acha",
  "bohat khoob", "boht khoob", "khoobsurat", "khubsurat", "sundar",
  "kya baat", "kya baat hai", "waah", "wah", "waaah", "wahh", "wahhh",
  "kya scene", "zabardast", "zbrdst", "lajawab", "la jawab", "kamal",
  "kamaal", "mast", "solid", "fire", "on fire", "bohat pyara", "pyara",
  "pyari", "sahi", "bilkul sahi", "theek", "thik", "acha", "achha",
  "achaaa", "bohat badhiya", "badhiya", "badiya", "shandar", "shaandar",

  // Extra
  "top", "legend", "king", "queen", "firee", "lit", "slay", "gorgeous",
  "stunning", "attractive", "handsome", "fit", "classy", "stylish"
];

// Emoji detect (almost all common + hidden style)
function isMostlyEmoji(text) {
  if (!text || !text.trim()) return false;
  const cleaned = text.replace(/\s/g, "");
  // Remove normal letters/numbers
  const withoutText = cleaned.replace(/[a-zA-Z0-9]/g, "");
  if (!withoutText.length) return false;
  // Agar zyada tar emoji / symbol hai
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{2100}-\u{214F}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{203C}\u{2049}\u{00A9}\u{00AE}\u{2122}]/gu;
  const emojis = withoutText.match(emojiRegex);
  return emojis && emojis.join("").length >= Math.ceil(withoutText.length * 0.5);
}

function isTrigger(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();

  // Exact / includes word
  for (const w of triggerWords) {
    if (t === w || t.includes(w)) return true;
  }

  // Sirf emoji / almost emoji
  if (isMostlyEmoji(text)) return true;

  // Short reactions (1-6 chars mostly symbols)
  if (t.length <= 6 && !/[a-z0-9]{3,}/i.test(t)) return true;

  return false;
}

// ================= COMMAND (with prefix bhi chalega) =================
cmd({
  pattern: "vv2",
  alias: [
    "wah", "nice", "ok", "okay", "wow", "good", "mashallah", "mashaallah",
    "💋", "❤️", "❤", "😍", "😘", "🔥", "✨", "👍", "👏", "🙌", "💖", "💕",
    "💗", "💓", "💞", "💘", "💝", "💟", "❣️", "💌", "🌸", "🌹", "💯", "⭐",
    "🌟", "✨", "💫", "🥰", "😊", "😁", "🤗", "😎", "🤩", "😳", "🥵", "🤭"
  ],
  desc: "Owner Only - retrieve view once by reply",
  category: "owner",
  filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
  try {
    if (!isCreator) return;

    if (!m.quoted) {
      return reply("🍁 Please reply to a view-once image / video / audio");
    }

    const quoted = m.quoted;

    if (!quoted.viewOnce) {
      return reply("❌ This message is not a view-once message");
    }

    const buffer = await quoted.download();
    if (!buffer) return reply("❌ Failed to download message");

    let content = {};

    if (quoted.mtype === "imageMessage") {
      content = { image: buffer, caption: quoted.text || "" };
    } else if (quoted.mtype === "videoMessage") {
      content = { video: buffer, caption: quoted.text || "" };
    } else if (quoted.mtype === "audioMessage") {
      content = {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.ptt || false
      };
    } else {
      return reply("❌ Only image, video, and audio are supported");
    }

    // Inbox (apne number pe)
    const target = m.sender || from;
    await client.sendMessage(target, content, { quoted: m });

  } catch (err) {
    console.error("VV2 Error:", err);
    reply("❌ Failed to retrieve view-once message");
  }
});

// ================= NO PREFIX — REPLY SE TRIGGER =================
cmd({
  on: "message",
  dontAddCommandList: true,
  filename: __filename
}, async (client, m, store, { from, isCreator, body, sender }) => {
  try {
    if (!isCreator) return;
    if (!m.quoted) return;
    if (!m.quoted.viewOnce) return;

    // Message text (prefix ke bina)
    const text = (body || m.body || m.text || "").trim();
    if (!text) return;

    // Trigger check (words + emojis)
    if (!isTrigger(text)) return;

    const quoted = m.quoted;
    const buffer = await quoted.download();
    if (!buffer) return;

    let content = {};

    if (quoted.mtype === "imageMessage") {
      content = { image: buffer, caption: quoted.text || "" };
    } else if (quoted.mtype === "videoMessage") {
      content = { video: buffer, caption: quoted.text || "" };
    } else if (quoted.mtype === "audioMessage") {
      content = {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.ptt || false
      };
    } else {
      return;
    }

    // Seedha inbox mein
    const target = sender || m.sender || from;
    await client.sendMessage(target, content);

    console.log("[VV-Auto] View-once saved to inbox by reply:", text);

  } catch (err) {
    console.error("[VV-Auto Error]:", err.message);
  }
});
