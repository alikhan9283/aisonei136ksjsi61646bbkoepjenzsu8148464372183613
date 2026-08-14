const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "txt2img",
    alias: ["aiimg", "imagine", "text2img"],
    react: "🎨",
    desc: "Generate an AI image from a text prompt",
    category: "ai",
    use: ".txt2img <prompt>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q, sender }) => {
    try {
        if (!q) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`🎨 *AI IMAGE GENERATOR*\n\n⚠️ No prompt provided\n💡 Use: .txt2img <prompt>\n📝 Example: .txt2img a cyberpunk street with neon lights\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡`);
        }

        await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });

        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/txt2img?prompt=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl, { timeout: 60000 });

        if (!data || !data.status || !data.result) {
            throw new Error('Failed to generate image from the API');
        }

        const imageUrl = data.result;

        const caption =
            `🎨 *AI IMAGE GENERATED*\n\n` +
            `📝 *Prompt:* ${q}\n\n` +
            `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡`;

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: caption,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363407310860031@newsletter",
                    newsletterName: "𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("❌ TXT2IMG Error:", error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ *Image generation failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ sᴀʀᴡᴀʀ-ᴍᴅ ⚡`);
    }
});
