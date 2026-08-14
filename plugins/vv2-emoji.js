const { cmd } = require("../command");

// ═══════════════════════════════════════════════════════════
//  VV2 EMOJI RETRIEVER — WITHOUT PREFIX (NO COMMAND NEEDED)
//  ─────────────────────────────────────────────────────────
//  Koi bhi emoji send karo (reply karke view-once media par)
//  to media auto retrieve ho jayegi. Koi prefix nahi chahiye.
//  System: anti-once.js jaisa hi on:"body" listener — tested & working
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
    // Remove variation selectors (U+FE0F) then split into grapheme clusters
    const cleaned = text.replace(/\uFE0F/g, "");
    // Split surrogate pairs properly
    const emojis = [];
    for (const ch of cleaned) {
        emojis.push(ch);
    }
    if (emojis.length === 0) return false;
    // Every emoji must be in our collection
    for (const ch of emojis) {
        if (!EMOJI_COLLECTION.includes(ch)) return false;
    }
    return true;
}

// on:"body" listener — har message par trigger (anti-once.js wala tested system)
cmd({
    pattern: "vv2",
    alias: ["wah", "💋", "❤️", "✌", "nice", "ok"],
    on: "body",
    dontAddCommandList: true,
    desc: "Owner Only - retrieve view once message (works without prefix, send any emoji)",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        // Sirf emoji-only message par kaam karega (bina prefix)
        if (!isEmojiOnlyMessage(body)) return;

        if (!isCreator) return;

        if (!match.quoted) {
            return await client.sendMessage(from, {
                text: "🍁 Please reply to a view-once image / video / audio"
            }, { quoted: message });
        }

        const quoted = match.quoted;

        if (!quoted.viewOnce) {
            return await client.sendMessage(from, {
                text: "❌ This message is not a view-once message"
            }, { quoted: message });
        }

        const buffer = await quoted.download();
        if (!buffer) return await client.sendMessage(from, {
            text: "❌ Failed to download message"
        }, { quoted: message });

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
            return await client.sendMessage(from, {
                text: "❌ Only image, video, and audio are supported"
            }, { quoted: message });
        }

        await client.sendMessage(from, content, { quoted: message });

    } catch (err) {
        console.error("VV2 Error:", err);
    }
});
