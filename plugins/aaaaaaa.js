// plugins/vv2.js
// SARWAR MD — View Once Retriever (Without Prefix + All Emojis)

const { cmd } = require("../command");

// ─────────────────────────────────────────────────────────────
//  ALL EMOJIS (Full Collection)
// ─────────────────────────────────────────────────────────────
const EMOJIS = [
    // Smileys
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
    "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
    "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
    "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫡", "🤭", "🤫",
    "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵",
    "🤐", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃",
    "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
    
    // Hearts
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗",
    "💖", "💘", "💝", "💟", "❣️", "💌",
    
    // Hands
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️",
    "🖖", "👋", "🤏", "💪", "🙏", "👏", "🙌", "🫶", "🤝", "💯", "🔥", "⭐", "🌟", "✨", "💫", "🎉",
    "🎊", "🎈",
    
    // Animals
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐒",
    "🦄", "🐔", "🐧", "🐦", "🦋", "🐝", "🐞", "🐢", "🐍", "🦎", "🐙", "🦑", "🐠", "🐟", "🐬", "🐳",
    "🦈", "🐊", "🐘", "🦒", "🦓", "🦍", "🦧", "🐪", "🐫", "🦘", "🦥", "🦦", "🦨", "🦔",
    
    // Food
    "🍎", "🍊", "🍋", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍕",
    "🍔", "🍟", "🌭", "🌮", "🌯", "🍿", "🍩", "🍪", "🎂", "🍰", "🍫", "🍭", "🍬", "🍦", "☕", "🧃",
    "🥤",
    
    // Sports/Games
    "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥊", "🏆", "🥇", "🥈", "🥉", "🎮", "🎯", "🎲", "🎸",
    "🎹", "🎧", "🎤", "🎬", "📸", "🚗", "✈️", "🚀", "🛸",
    
    // Nature
    "🌞", "🌝", "🌙", "⭐", "🌈", "☁️", "🌧️", "⛈️", "❄️", "☃️", "🌊", "🔥", "💧", "🌸", "🌹", "🌺",
    "🌻", "🌷", "🌱", "🌳", "🍀",
    
    // Repeated Popular
    "😂😂😂", "🔥🔥🔥", "❤️❤️❤️", "😭😭😭", "😎😎😎", "🗿🗿🗿", "💀💀💀", "✨✨✨", "🫶🫶🫶"
];

// ─────────────────────────────────────────────────────────────
//  MAIN COMMAND - WITHOUT PREFIX
// ─────────────────────────────────────────────────────────────
cmd({
    on: "body",
    react: "🔓",
    filename: __filename
}, async (client, message, match, { isOwner, from, reply }) => {

    try {
        const text = message.body.trim();

        // Check if message is an emoji
        const isEmoji = EMOJIS.includes(text);
        const isCommand = ["vv2", "wah", "nice", "ok", "viewonce", "retrieve"].includes(text.toLowerCase());
        
        if (!isEmoji && !isCommand) return;

        // Owner only
        if (!isOwner) {
            return await client.sendMessage(from, {
                text: `❌ *Owner Only!*`
            }, { quoted: message });
        }

        // Check if quoted message exists
        if (!message.quoted) {
            return await client.sendMessage(from, {
                text: `🔓 *VIEW ONCE RETRIEVER*

📌 *Reply to a view-once message and type any emoji:*

😀 😃 😄 😁 😆 😅 😂 🤣
❤️ 🧡 💛 💚 💙 💜 🖤
👍 👎 👌 ✌️ 🤞 🤟 🤘

📝 *Or type:* vv2, wah, nice, ok

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡*`
            }, { quoted: message });
        }

        const quoted = message.quoted;

        // Check if view-once
        if (!quoted.viewOnce) {
            return await client.sendMessage(from, {
                text: `❌ This is not a view-once message.`
            }, { quoted: message });
        }

        // Download
        const buffer = await quoted.download();
        if (!buffer) {
            return await client.sendMessage(from, {
                text: `❌ Failed to download.`
            }, { quoted: message });
        }

        let content = {};

        if (quoted.mtype === "imageMessage") {
            content = {
                image: buffer,
                caption: quoted.text || "📸 View Once Image",
                mimetype: "image/jpeg"
            };
        } else if (quoted.mtype === "videoMessage") {
            content = {
                video: buffer,
                caption: quoted.text || "🎬 View Once Video",
                mimetype: "video/mp4"
            };
        } else if (quoted.mtype === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: quoted.ptt || false
            };
        } else {
            return await client.sendMessage(from, {
                text: `❌ Only image, video, and audio are supported.`
            }, { quoted: message });
        }

        // Send to the chat
        await client.sendMessage(from, content, { quoted: message });
        await client.sendMessage(from, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('❌ VV2 Error:', error.message);
        await client.sendMessage(from, {
            text: `❌ Error: ${error.message}`
        }, { quoted: message });
    }
});

console.log('✅ VV2 Plugin Loaded! Reply to view-once with any emoji.');
