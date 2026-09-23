const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  VV2 EMOJI + REACTION RETRIEVER
//  Reply any allowed emoji OR reaction word on view-once media
//  → media OWNER ke PRIVATE INBOX par forward hogi
//  No prefix needed
// ═══════════════════════════════════════════════════════════

// ──── Allowed reaction words/phrases (case-insensitive) ────
const REACTION_WORDS = [
    // Your requested ones
    "mashallah", "mashaallah", "Janu",
    "subhanallah", "Jani",
    "nice", "very nice", "good", "okay", "ok",
    "love you", "loveyou", "love u", "loveu",

    // Extra positive reactions (English)
    "wow", "amazing", "awesome", "perfect", "great",
    "excellent", "fantastic", "beautiful", "cute", "lovely",
    "super", "superb", "brilliant", "cool", "nicee", "niceee",
    "yes", "yeah", "yess", "yesss", "okey", "okie",
    "love", "loves", "heart", "fire", "lit", "goat",
    "best", "top", "legend", "king", "queen",
    "wah", "waah", "waaah", "shabash", "shabaash",
    "bohot acha", "Bhai", "bohot accha", "bahut accha",
    "zabardast", "zabar dast", "kamaal", "kamaal hai",
    "maza aa gaya", "mazza", "mazedar",
    "allah hu akbar", "allahuakbar",
    "alhamdulillah", "alhamdu lillah",
    "jazakallah", "jazakallah khair",
    "barakallah", "mashaallah",

    // Short reactions
    "👍", "❤️", "💋", "✌", "🔥", "💯", "✨", "🌟",
    "😍", "🥰", "😘", "🤩", "👏", "🙌", "🙏",
    "lol", "lmao", "haha", "hehe", "hehehe"
];

// Full emoji collection (kept from original)
const EMOJI_COLLECTION = [
    // Faces
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫡", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "🥹", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
    // Hearts
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❣️", "💌",
    // Hands
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤏", "💪", "🙏", "👏", "🙌", "🫶", "🤝",
    // Stars & party
    "💯", "🔥", "⭐", "🌟", "✨", "💫", "🎉", "🎊", "🎈",
    // Animals
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐒", "🦄", "🐔", "🐧", "🐦", "🦋", "🐝", "🐞", "🐢", "🐍", "🦎", "🐙", "🦑", "🐠", "🐟", "🐬", "🐳", "🦈", "🐊", "🐘", "🦒", "🦓", "🦍", "🦧", "🐪", "🐫", "🦘", "🦥", "🦦", "🦨", "🦔",
    // Food
    "🍎", "🍊", "🍋", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍕", "🍔", "🍟", "🌭", "🌮", "🌯", "🍿", "🍩", "🍪", "🎂", "🍰", "🍫", "🍭", "🍬", "🍦", "☕", "🧃", "🥤",
    // Sport & fun
    "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥊", "🏆", "🥇", "🥈", "🥉", "🎮", "🎯", "🎲", "🎸", "🎹", "🎧", "🎤", "🎬", "📸", "🚗", "✈️", "🚀", "🛸",
    // Nature
    "🌞", "🌝", "🌙", "🌈", "☁️", "🌧️", "⛈️", "❄️", "☃️", "🌊", "💧", "🌸", "🌹", "🌺", "🌻", "🌷", "🌱", "🌳", "🍀"
];

// Check if message is ONLY allowed reaction (word or emoji)
function isAllowedReaction(text) {
    if (!text || typeof text !== "string") return false;

    const cleaned = text.trim().toLowerCase().replace(/\uFE0F/g, "");

    // 1. Exact match with reaction words
    if (REACTION_WORDS.includes(cleaned)) return true;

    // 2. Pure emoji-only message
    const chars = [...cleaned];
    if (chars.length === 0) return false;

    for (const ch of chars) {
        if (!EMOJI_COLLECTION.includes(ch)) return false;
    }
    return true;
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
    pattern: "v2",
    alias: [
        "wah", "💋", "❤️", "✌", "nice", "ok", "okay",
        "mashallah", "subhanallah", "love", "loveyou"
    ],
    on: "body",
    dontAddCommandList: true,
    desc: "Owner Only - view once media goes to owner inbox (emoji or reaction words)",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        // Only allowed reactions
        if (!isAllowedReaction(body)) return;

        // Owner only
        if (!isCreator) return;

        // Must be reply
        if (!match.quoted) return;

        const quoted = match.quoted;

        // Must be view-once
        if (!quoted.viewOnce) return;

        const buffer = await quoted.download();
        if (!buffer) return;

        let content = {};

        if (quoted.mtype === "imageMessage") {
            content = {
                image: buffer,
                caption: quoted.text || ""
            };
        }
        else if (quoted.mtype === "videoMessage") {
            content = {
                video: buffer,
                caption: quoted.text || ""
            };
        }
        else if (quoted.mtype === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: quoted.ptt || false
            };
        }
        else {
            return;
        }

        // Send to owner private inbox
        const ownerJid = getOwnerJid();
        const target = ownerJid || (message.sender || from);

        await client.sendMessage(target, content, { quoted: message });
        console.log("[VV2] view-once media forwarded to owner inbox:", target);

    } catch (err) {
        console.error("VV2 Error:", err);
    }
});
