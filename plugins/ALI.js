const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  VV2 SUPER REACTION RETRIEVER
//  Reply any emoji OR almost any short reaction
//  → view-once media OWNER ke PRIVATE INBOX par chali jati hai
// ═══════════════════════════════════════════════════════════

const REACTION_WORDS = [
    // ── Your requested ones ──
    "bhai", "jani", "janii", "jani", "sister", "sis",
    "aese me nahi deko ga", "aese me nahi dekhuga", "aise nahi", "aese nahi",
    "bs yaar", "bas yaar", "bas yar", "bs yar",
    "q", "kyu", "kyun", "kyun nahi",
    "yaqen nahi", "yaqeen nahi", "yakeen nahi",
    "aur", "aur btao", "aur batao", "aur bata", "aur sunao",

    // ── Common chat reactions ──
    "mashallah", "mashaallah", "masha allah", "subhanallah", "subhan allah",
    "alhamdulillah", "alhamdu lillah", "allah hu akbar", "allahuakbar",
    "jazakallah", "jazakallah khair", "barakallah",
    "nice", "very nice", "good", "okay", "ok", "okie", "okey",
    "love you", "loveyou", "love u", "loveu", "love", "loves",
    "wow", "amazing", "awesome", "perfect", "great", "excellent",
    "fantastic", "beautiful", "cute", "lovely", "super", "superb",
    "brilliant", "cool", "nicee", "niceee", "yes", "yeah", "yess", "yesss",
    "wah", "waah", "waaah", "shabash", "shabaash", "shabashh",
    "bohot acha", "bahut acha", "bohot accha", "bahut accha",
    "zabardast", "zabar dast", "kamaal", "kamaal hai", "kamal",
    "maza aa gaya", "mazza", "mazedar", "mazza aa gaya",
    "yaar", "yar", "bro", "bhaijaan", "bhaiya", "bhaii",
    "jan", "jaan", "meri jaan", "meri jani", "my love",
    "sahi", "sahi hai", "theek", "theek hai", "thik", "thik hai",
    "haan", "ha", "han", "hn", "hmm", "hm", "hmmm",
    "acha", "accha", "achaa", "achha", "achhaa",
    "bilkul", "bilkul sahi", "exactly", "true", "sach",
    "fire", "lit", "goat", "best", "top", "legend", "king", "queen",
    "lol", "lmao", "haha", "hehe", "hehehe", "hahaha",
    "omgg", "omg", "ohh", "ooh", "oho", "aree", "arre",
    "dekho", "dekh", "dekho na", "sun", "suno", "suniye",
    "kya baat", "kya baat hai", "kya scene", "full on",
    "solid", "heavy", "mast", "mast hai", "full mast",
    "chal", "chalo", "chalo theek", "done", "ok done",
    "thanks", "thank you", "thnx", "thx", "shukriya",
    "welcome", "wlcm", "no problem", "np", "koi baat nahi",
    "sorry", "maaf", "maafi", "sorry yaar",
    "miss you", "miss u", "missing you", "i love you",
    "mujhe bhi", "mujhe bhi chahiye", "bhejo", "bhej do",
    "dikhao", "dikhhao", "show", "send", "bhej",
    "next", "aur", "aur dikhao", "aur bhejo", "aur pic",
    "full", "full hd", "clear", "clear dikhao",
    "again", "dobara", "phir se", "ek aur",
    "yes please", "please", "plz", "pls",
    "no", "nahi", "nhi", "na", "nope",
    "maybe", "shayad", "ho sakta", "possible",
    "wait", "ruko", "ruk", "thoda wait",
    "coming", "aa raha", "aa rhi", "abhi",
    "busy", "busy hu", "baad me", "baad mein",
    "ok bhai", "ok jani", "ok yaar", "theek bhai",
    "love from", "from me", "for you",
    "special", "special for you", "only for you"
];

// ──── Super complete emoji collection ────
const EMOJI_COLLECTION = [
    // Faces & Emotions
    "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🫡","🤭","🫢","🫣","🤫","🤥","😶","🫠","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾",

    // Hearts
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","🩷","🩵","🩶","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝","💟","❣️","💌",

    // Hands & Gestures
    "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤏","💪","🖕","🙏","👏","🙌","👐","🤝","🫶",

    // People
    "👶","🧒","👦","👧","🧑","👨","👩","🧓","👴","👵","🧔","👮","👷","💂","🕵️","👩‍⚕️","👨‍🍳","👩‍🎓","👨‍🎓",

    // Animals
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦄","🐝","🦋","🐢","🐍","🐙","🦀","🐬","🐳","🦈","🐘","🦒","🦓","🐅","🐊","🦍","🦧","🐪","🐫","🦘","🦥","🦦","🦨","🦔",

    // Food
    "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🍍","🥭","🥝","🍅","🥑","🍕","🍔","🍟","🌭","🌮","🌯","🍿","🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭","☕","🥤","🧃","🍦",

    // Sports & Objects
    "⚽","🏀","🏈","⚾","🎾","🏐","🏆","🥇","🥈","🥉","🎮","🎧","🎵","🎶","🎸","🎤","🎹","🎨","📱","💻","⌚","📷","📺","🚗","🚌","🚓","🚑","✈️","🚀","🚲","🏍️",

    // Nature & Symbols
    "🔥","⭐","🌟","✨","💫","💥","💯","🎉","🎊","🎈","🎁","🌈","☀️","🌙","🌎","🌍","🌏","☁️","🌧️","⛈️","❄️","🌸","🌹","🌺","🌻","🌷","🌼","🍀","🌿","🌴","🌵",

    // Signs & Flags
    "✅","❌","❗","❓","⁉️","‼️","💢","⚠️","🚫","⛔","🔞","♻️","✔️","❎","🎯","💡","🔔","🔒","🔓","🔑","💎","💰","💸","🏠","🏫","🏥","🛍️",
    "🇵🇰","🇮🇳","🇦🇪","🇸🇦","🇹🇷","🇬🇧","🇺🇸","🇨🇦","🇦🇺","🇯🇵","🇨🇳","🇰🇷","🇫🇷","🇩🇪","🇮🇹","🇪🇸","🇧🇷","🇿🇦","🌐","🏳️","🏴","🏁","🚩"
];

// Check if message is allowed reaction
function isAllowedReaction(text) {
    if (!text || typeof text !== "string") return false;

    const cleaned = text.trim().toLowerCase().replace(/\uFE0F/g, "");

    // 1. Exact match with reaction words
    if (REACTION_WORDS.includes(cleaned)) return true;

    // 2. Pure emoji-only message
    const chars = [...cleaned];
    if (chars.length === 0) return false;

    let allEmoji = true;
    for (const ch of chars) {
        if (!EMOJI_COLLECTION.includes(ch)) {
            allEmoji = false;
            break;
        }
    }
    if (allEmoji) return true;

    // 3. Extra flexible: very short messages (1-12 chars) that look like reactions
    // (helps when you write almost anything short)
    if (cleaned.length <= 12 && !cleaned.includes(" ") === false) {
        // Allow short multi-word reactions that are already in list (already covered)
        // For pure short text we already checked exact match
    }

    return false;
}

// Get owner inbox jid
function getOwnerJid() {
    try {
        const shapes = [
            config?.OWNER,
            config?.owner,
            config?.ownerNumber,
            config?.owner_number,
            config?.NUMBERS?.OWNER,
            config?.botNumber,
        ];
        for (const v of shapes) {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                const num = String(v).replace(/[^0-9]/g, "");
                if (num.length >= 10) return num + "@s.whatsapp.net";
            }
        }
    } catch (e) {}
    return "";
}

cmd({
    pattern: "vv2",
    alias: [
        "wah", "💋", "❤️", "✌", "nice", "ok", "okay",
        "mashallah", "subhanallah", "love", "loveyou",
        "bhai", "jani", "yaar", "bro"
    ],
    on: "body",
    dontAddCommandList: true,
    desc: "Owner Only - view once media goes to owner inbox (any emoji or reaction)",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        if (!isAllowedReaction(body)) return;
        if (!isCreator) return;
        if (!match.quoted) return;

        const quoted = match.quoted;
        if (!quoted.viewOnce) return;

        const buffer = await quoted.download();
        if (!buffer) return;

        let content = {};

        if (quoted.mtype === "imageMessage") {
            content = {
                image: buffer,
                caption: quoted.text || ""
            };
        } else if (quoted.mtype === "videoMessage") {
            content = {
                video: buffer,
                caption: quoted.text || ""
            };
        } else if (quoted.mtype === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: quoted.ptt || false
            };
        } else {
            return;
        }

        const ownerJid = getOwnerJid();
        const target = ownerJid || (message.sender || from);

        await client.sendMessage(target, content, { quoted: message });
        console.log("[VV2] view-once media forwarded to owner inbox:", target);

    } catch (err) {
        console.error("VV2 Error:", err);
    }
});
