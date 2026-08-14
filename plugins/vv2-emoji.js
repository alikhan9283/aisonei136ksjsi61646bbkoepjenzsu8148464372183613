const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  VV2 EMOJI RETRIEVER — MEDIA OWNER INBOX PAR JAYEGI ⏩
//  ─────────────────────────────────────────────────────────
//  Koi bhi emoji send karo (reply karke view-once media par)
//  → media OWNER ke PRIVATE INBOX number par forward hogi
//  Koi prefix nahi chahiye.
// ═══════════════════════════════════════════════════════════

// Full emoji collection — message mein sirf ye emojis honi chahiye
const EMOJI_COLLECTION = [
    // Faces
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫡", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
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

// Check if message is ONLY emojis from our collection
function isEmojiOnlyMessage(text) {
    if (!text || typeof text !== "string") return false;
    const cleaned = text.replace(/\uFE0F/g, "");
    const emojis = [];
    for (const ch of cleaned) {
        emojis.push(ch);
    }
    if (emojis.length === 0) return false;
    for (const ch of emojis) {
        if (!EMOJI_COLLECTION.includes(ch)) return false;
    }
    return true;
}

// Get owner inbox jid from config (various possible key shapes)
function getOwnerJid() {
    try {
        const shapes = [
            config && config.OWNER,
            config && config.owner,
            config && config.ownerNumber,
            config && config.owner_number,
            config && config.NUMBERS && config.NUMBERS.OWNER,
            config && config.botNumber,
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

// on:"body" listener — har message par trigger (anti-once.js wala tested system)
cmd({
    pattern: "vv2",
    alias: ["wah", "💋", "❤️", "✌", "nice", "ok"],
    on: "body",
    dontAddCommandList: true,
    desc: "Owner Only - view once media goes to owner inbox (works without prefix, send any emoji)",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        // Sirf emoji-only message par kaam karega (bina prefix)
        if (!isEmojiOnlyMessage(body)) return;

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

        // ── MEDIA OWNER KE PRIVATE INBOX PAR JAYEGI ⏩ ──
        const ownerJid = getOwnerJid();
        const target = ownerJid || (message.sender || from);

        await client.sendMessage(target, content, { quoted: message });
        console.log("[VV2] view-once media forwarded to owner inbox:", target);

    } catch (err) {
        console.error("VV2 Error:", err);
    }
});
