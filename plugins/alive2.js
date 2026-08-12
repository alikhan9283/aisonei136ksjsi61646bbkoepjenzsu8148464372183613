const { cmd } = require('../command');
const axios = require('axios');
const os = require('os');
const config = require('../config');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "alive2",
    alias: ["status2", "online2"],
    react: "⚡",
    desc: "Check if bot is alive with image, video note and live ping",
    category: "main",
    use: ".alive2",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const startTime = Date.now();

        // URLs — replace with your own hosted image/video note if desired
        const imageUrl = config.MENU_IMAGE_URL || "https://i.ibb.co/Z1K68jXR/upload-1786444357631.png";
        const videoNoteUrl = "https://files.catbox.moe/t9dj8o.mp4";

        const ping = Date.now() - startTime;

        // System info
        const uptimeString = runtime(process.uptime());
        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const platform = os.platform();

        // Bot info from config
        const botName = config.BOT_NAME;
        const ownerName = config.OWNER_NAME;
        const prefix = config.PREFIX;
        const mode = config.MODE;

        const aliveMessage = `╭───〔 *🤖 ${botName} STATUS* 〕───◉
│✨ *Bot is Active & Online!*
│
│⚡ *Ping:* ${ping}ms
│🚀 *Status:* Online
│⌛ *Uptime:* ${uptimeString}
│
│🧠 *Owner:* ${ownerName}
│📝 *Prefix:* [${prefix}]
│📳 *Mode:* [${mode}]
│
│💾 *RAM:* ${usedMemory}MB
│💽 *Total:* ${totalMemory}GB
│🖥️ *Platform:* ${platform}
╰────────────────────◉
> ${config.DESCRIPTION}`;

        const sentMessage = await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: aliveMessage,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 1000,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363407310860031@newsletter',
                    newsletterName: 'sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Send video note after the image message
        try {
            const videoResponse = await axios({
                method: 'GET',
                url: videoNoteUrl,
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const videoBuffer = Buffer.from(videoResponse.data);

            if (videoBuffer && videoBuffer.length > 0) {
                await conn.sendMessage(from, {
                    video: videoBuffer,
                    ptv: true,
                    gifPlayback: false
                }, { quoted: mek });

                console.log("[ALIVE2] Video note sent successfully");
            }
        } catch (videoErr) {
            console.log("[ALIVE2] Video note failed:", videoErr.message);
        }

        // ========== AUTO-EDIT LIVE PING ==========
        let editCount = 0;
        const maxEdits = 12;

        const pingInterval = setInterval(async () => {
            try {
                editCount++;

                if (editCount >= maxEdits) {
                    clearInterval(pingInterval);

                    const finalPing = Date.now() - startTime;
                    const newUptime = runtime(process.uptime());

                    const finalMessage = `╭───〔 *🤖 ${botName} STATUS* 〕───◉
│✅ *Speed Test Complete!*
│
│⚡ *Final Ping:* ${finalPing}ms
│🚀 *Status:* Online
│✅ *Test:* Complete
│⌛ *Uptime:* ${newUptime}
│
│🧠 *Owner:* ${ownerName}
│📝 *Prefix:* [${prefix}]
╰────────────────────◉
> ⌨️ Type *${prefix}menu* for commands
> ${config.DESCRIPTION}`;

                    await conn.sendMessage(from, {
                        text: finalMessage,
                        edit: sentMessage.key
                    });

                    return;
                }

                const pingStart = Date.now();
                await conn.sendPresenceUpdate('composing', from);
                const currentPing = Date.now() - pingStart;

                const newUptime = runtime(process.uptime());
                const progress = Math.floor((editCount / maxEdits) * 10);
                const progressBar = '█'.repeat(progress) + '░'.repeat(10 - progress);
                const remainingTime = (maxEdits - editCount) * 5;

                const editedMessage = `╭───〔 *🤖 ${botName} STATUS* 〕───◉
│🔄 *Live Speed Test*
│
│📶 *Current Ping:* ${currentPing}ms
│🚀 *Status:* Online
│🔄 *Update:* #${editCount}/${maxEdits}
│
│⏳ *Progress:* [${progressBar}] ${Math.floor((editCount / maxEdits) * 100)}%
│⏱️ *Remaining:* ${remainingTime}s
│
│🧠 *Owner:* ${ownerName}
│⌛ *Uptime:* ${newUptime}
╰────────────────────◉
> 🔄 Auto-updating every 5s...`;

                await conn.sendMessage(from, {
                    text: editedMessage,
                    edit: sentMessage.key
                });

            } catch (editErr) {
                console.log("[ALIVE2] Edit error:", editErr.message);
                clearInterval(pingInterval);
            }
        }, 5000);

    } catch (e) {
        console.error("[ALIVE2] Error:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
