const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const path = require('path');
const os = require('os');
const fs = require('fs');
const converter = require('../data/converter');

cmd({
    pattern: "menu4",
    alias: ["smenu", "sarwarmenu"],
    use: '.menu4',
    desc: "ꜱʜᴏᴡ ꜰᴜʟʟ ʙᴏᴛ ᴍᴇɴᴜ",
    category: "menu",
    react: "📜",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {

        const totalCommands = Object.keys(commands).length;
        const uptime = runtime(process.uptime());
        const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const currentTime = new Date().toLocaleTimeString();
        const currentDate = new Date().toLocaleDateString();

        const dec = `
╔══════════════════════╗
║  🌟 𝑺𝑨𝑹𝑾𝑨𝑹 𝑴𝑫 🌟
║  ᴜʟᴛɪᴍᴀᴛᴇ ᴡʜᴀᴛsᴀᴘᴘ ʙᴏᴛ
╚══════════════════════╝

╔══════❰ 🤖 ʙᴏᴛ ɪɴғᴏ ❱══════╗
║ 👑 ᴏᴡɴᴇʀ  : *${config.OWNER_NAME}*
║ 📛 ʙᴏᴛ    : *${config.BOT_NAME}*
║ 🔣 ᴘʀᴇғɪx : *[ ${config.PREFIX} ]*
║ ⏱️ ᴜᴘᴛɪᴍᴇ : *${uptime}*
║ 📚 ᴄᴍᴅs   : *${totalCommands}*
╚══════════════════════╝

╔══════❰ 💻 sʏsᴛᴇᴍ ɪɴғᴏ ❱══════╗
║ 🧠 ʀᴀᴍ      : *${ramUsed}ᴍʙ / ${totalRam}ɢʙ*
║ 🖥️ ᴘʟᴀᴛғᴏʀᴍ : *${platform}*
║ 📅 ᴅᴀᴛᴇ     : *${currentDate}*
║ 🕐 ᴛɪᴍᴇ     : *${currentTime}*
╚══════════════════════╝

╔══════❰ 📥 ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ ❱══════╗
║
║  🌐 *sᴏᴄɪᴀʟ ᴍᴇᴅɪᴀ*
║  ╠▸ 🟦 facebook
║  ╠▸ 📁 mediafire
║  ╠▸ 🎵 tiktok
║  ╠▸ 🐦 twitter
║  ╠▸ 📷 insta
║  ╠▸ 🎬 capcut
║  ╠▸ 📦 apk
║  ╠▸ 🖼️ img
║  ╠▸ 📍 pinterest
║
║  🎵 *ᴍᴜsɪᴄ / ᴠɪᴅᴇᴏ*
║  ╠▸ 🎶 spotify
║  ╠▸ 🎧 play
║  ╠▸ 🎧 play2
║  ╠▸ 🔉 audio
║  ╠▸ 🎬 video
║  ╠▸ 🎵 ytmp3
║  ╠▸ 📹 ytmp4
║  ╠▸ 🎶 song
║  ╠▸ ▶️ tt2
║  ╠▸ 📌 pins
║  ╠▸ 🔵 fb2
║  ╠▸ 🎵 tiks
║  ╠▸ 🎬 sora
║  ╠▸ 🎬 darama
║  ╠▸ ☁️ gdrive
║  ╠▸ 🌐 ssweb
║  ╠▸ 📹 video2
║  ╚▸ 🔄 apk2
║
╚══════════════════════╝

╔══════❰ 👥 ɢʀᴏᴜᴘ ᴍᴇɴᴜ ❱══════╗
║
║  🔧 *ᴍᴀɴᴀɢᴇᴍᴇɴᴛ*
║  ╠▸ 🔗 grouplink
║  ╠▸ 🚪 kickall
║  ╠▸ 🚷 kickall2
║  ╠▸ 🚫 kickall3
║  ╠▸ ➕ add
║  ╠▸ ➖ remove
║  ╚▸ 👢 kick
║
║  ⚡ *ᴀᴅᴍɪɴ ᴛᴏᴏʟs*
║  ╠▸ ⬆️ promote
║  ╠▸ ⬇️ demote
║  ╠▸ 🚮 dismiss
║  ╠▸ 🔄 revoke
║  ╠▸ 🔇 mute [20s / 2m / 1h]
║  ╠▸ 🔊 unmute
║  ╠▸ 🔒 lockgc
║  ╠▸ 🔓 unlockgc
║  ╠▸ 👋 setgoodbye
║  ╠▸ 🎉 setwelcome
║  ╠▸ 🗑️ delete
║  ╠▸ 🖼️ getpic
║  ╠▸ ℹ️ ginfo
║  ╠▸ ✏️ updategname
║  ╠▸ 📝 updategdesc
║  ╠▸ 📩 joinrequests
║  ╠▸ 📋 allreq
║  ╠▸ 📨 senddm
║  ╠▸ 📩 invite
║  ╠▸ 📝 copyg [link]
║  ╠▸ ⏳ disappear on/off/7D/24H
║  ╚▸ 🏃 nikal
║
║  🏷️ *ᴛᴀɢɢɪɴɢ*
║  ╠▸ #️⃣ tag
║  ╠▸ 🏷️ hidetag
║  ╠▸ @️⃣ tagall
║  ╚▸ 👔 tagadmins
║
╚══════════════════════╝

╔══════❰ 🎭 ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 👊 bully @tag
║  ╠▸ 🤗 cuddle @tag
║  ╠▸ 😢 cry @tag
║  ╠▸ 🤗 hug @tag
║  ╠▸ 💋 kiss @tag
║  ╠▸ 👅 lick @tag
║  ╠▸ 🖐️ pat @tag
║  ╠▸ 😏 smug @tag
║  ╠▸ 🔨 bonk @tag
║  ╠▸ 🚀 yeet @tag
║  ╠▸ 😊 blush @tag
║  ╠▸ 😄 smile @tag
║  ╠▸ 👋 wave @tag
║  ╠▸ ✋ highfive @tag
║  ╠▸ 🤝 handhold @tag
║  ╠▸ 🍜 nom @tag
║  ╠▸ 🦷 bite @tag
║  ╠▸ 🤗 glomp @tag
║  ╠▸ 👋 slap @tag
║  ╠▸ 💀 kill @tag
║  ╠▸ 😊 happy @tag
║  ╠▸ 😉 wink @tag
║  ╠▸ 👉 poke @tag
║  ╠▸ 💃 dance @tag
║  ╚▸ 😬 cringe @tag
║
╚══════════════════════╝

╔══════❰ 🎨 ʟᴏɢᴏ ᴍᴀᴋᴇʀ ❱══════╗
║
║  ╠▸ 💡 neonlight    ╠▸ 🎀 blackpink
║  ╠▸ 🐉 dragonball   ╠▸ 🎭 3dcomic
║  ╠▸ 🇺🇸 america    ╠▸ 🍥 naruto
║  ╠▸ 😢 sadgirl      ╠▸ ☁️ clouds
║  ╠▸ 🚀 futuristic   ╠▸ 📜 3dpaper
║  ╠▸ ✏️ eraser       ╠▸ 🌇 sunset
║  ╠▸ 🍃 leaf         ╠▸ 🌌 galaxy
║  ╠▸ 💀 sans         ╠▸ 💥 boom
║  ╠▸ 💻 hacker       ╠▸ 😈 devilwings
║  ╠▸ 💡 bulb         ╠▸ 👼 angelwings
║  ╠▸ ♈ zodiac        ╠▸ 💎 luxury
║  ╠▸ 🎨 paint        ╠▸ ❄️ frozen
║  ╠▸ 🏰 castle       ╠▸ 🖋️ tatoo
║  ╠▸ 🔫 valorant     ╠▸ 🐻 bear
║  ╠▸ 🔠 typography   ╚▸ 🎂 birthday
║
╚══════════════════════╝

╔══════❰ 🤖 ᴀɪ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 🧠 ai
║  ╠▸ 🤖 gpt
║  ╠▸ 🤖 gpt2
║  ╠▸ 🤖 gpt3
║  ╠▸ 🤖 gptmini
║  ╠▸ 🤖 gpt4
║  ╠▸ 🔵 meta
║  ╠▸ 📦 blackbox
║  ╠▸ 🌈 luma
║  ╠▸ 🎧 dj
║  ╠▸ 🤵 ADEEL
║  ╠▸ 🔍 bing
║  ╠▸ 🎨 imagine
║  ╠▸ 🖼️ imagine2
║  ╚▸ 🤖 copilot
║
╚══════════════════════╝

╔══════❰ 🎎 ᴀɴɪᴍᴇ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 🤬 fack       ╠▸ ✅ truth
║  ╠▸ 😨 dare       ╠▸ 🐶 dog
║  ╠▸ 🐺 awoo       ╠▸ 👧 garl
║  ╠▸ 👰 waifu      ╠▸ 🐱 neko
║  ╠▸ 🧙 megnumin   ╠▸ 👗 maid
║  ╠▸ 👧 loli       ╠▸ 🦊 foxesgirl
║  ╠▸ 🎎 animegirl  ╠▸ 🎎 animegirl1
║  ╠▸ 🎎 animegirl2 ╠▸ 🎎 animegirl3
║  ╠▸ 🎎 animegirl4 ╠▸ 🎎 animegirl5
║  ╠▸ 🎬 anime1     ╠▸ 🎬 anime2
║  ╠▸ 🎬 anime3     ╠▸ 🎬 anime4
║  ╠▸ 🎬 anime5     ╠▸ 📰 animenews
║  ╚▸ 🍥 naruto
║
╚══════════════════════╝

╔══════❰ 😄 ғᴜɴ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 🤪 shapar     ╠▸ ⭐ rate
║  ╠▸ 🤬 insult     ╠▸ 💻 hack
║  ╠▸ 💘 ship       ╠▸ 🎭 character
║  ╠▸ 💌 pickup     ╠▸ 😆 joke
║  ╠▸ ❤️ hrt        ╠▸ 😊 hpy
║  ╠▸ 😔 syd        ╠▸ 😠 anger
║  ╠▸ 😳 shy        ╠▸ 💋 kiss
║  ╠▸ 🧐 mon        ╠▸ 😕 cunfuzed
║  ╠▸ ✋ hand       ╠▸ 🤲 hold
║  ╠▸ 🤗 hug        ╠▸ 🎵 hifi
║  ╚▸ 👉 poke
║
╚══════════════════════╝

╔══════❰ 🔄 ᴄᴏɴᴠᴇʀᴛ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 🏷️ sticker    ╠▸ 🏷️ sticker2
║  ╠▸ 😀 emojimix   ╠▸ ✨ fancy
║  ╠▸ 🖼️ take       ╠▸ 🎵 tomp3
║  ╠▸ 🗣️ tts        ╠▸ 🌐 tr
║  ╠▸ 🌐 utr        ╠▸ 🔢 base64
║  ╠▸ 🔠 unbase64   ╠▸ 010 binary
║  ╠▸ 🔤 dbinary    ╠▸ 🔗 tinyurl
║  ╠▸ 🌐 urldecode  ╠▸ 🌐 urlencode
║  ╠▸ 🌐 url        ╠▸ 🔁 repeat
║  ╠▸ ❓ ask        ╚▸ 📖 readmore
║
╚══════════════════════╝

╔══════❰ ℹ️ ᴏᴛʜᴇʀ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 🕒 timenow    ╠▸ 📅 date
║  ╠▸ 🔢 count      ╠▸ 🧮 calculate
║  ╠▸ 🔢 countx     ╠▸ 🎲 flip
║  ╠▸ 🪙 coinflip   ╠▸ 🎨 rcolor
║  ╠▸ 🎲 roll       ╠▸ ℹ️ fact
║  ╠▸ 💻 cpp        ╠▸ 🎲 rw
║  ╠▸ 💑 pair       ╠▸ 💑 pair2
║  ╠▸ 💑 pair3      ╠▸ 🎨 logo
║  ╠▸ 📖 define     ╠▸ 📰 news
║  ╠▸ 🎬 movie      ╠▸ ☀️ weather
║  ╠▸ 📦 srepo      ╠▸ 💾 save
║  ╠▸ 🌐 wikipedia  ╠▸ 🔑 gpass
║  ╠▸ 👤 githubstalk ╠▸ 🔍 yts
║  ╚▸ 📹 ytv
║
╚══════════════════════╝

╔══════❰ 👑 ᴏᴡɴᴇʀ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 👑 owner      ╠▸ 📜 menu
║  ╠▸ 📊 vv         ╠▸ 📋 listcmd
║  ╠▸ 📚 allmenu    ╠▸ 📦 repo
║  ╠▸ 🚫 block      ╠▸ ✅ unblock
║  ╠▸ 🖼️ fullpp     ╠▸ 🖼️ setpp
║  ╠▸ 🔄 restart    ╠▸ ⏹️ shutdown
║  ╠▸ 🔄 updatecmd  ╠▸ 🆔 gjid
║  ╚▸ 🆔 jid
║
╚══════════════════════╝

╔══════❰ ⚡ ᴍᴀɪɴ ᴍᴇɴᴜ ❱══════╗
║
║  ╠▸ 🏓 ping       ╠▸ 🏓 ping2
║  ╠▸ 🚀 speed      ╠▸ 📡 live
║  ╠▸ 💚 alive      ╠▸ ⏱️ runtime
║  ╠▸ ⏳ uptime     ╠▸ 📦 repo
║  ╠▸ 👑 owner      ╠▸ 📜 menu
║  ╚▸ 🔄 restart
║
╚══════════════════════╝

> ${config.DESCRIPTION}`;

        // ── Send Menu Image ──
        await conn.sendMessage(
            from,
            {
                image: { url: 'https://files.catbox.moe/m9tg7h.png' },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363407310860031@newsletter',
                        newsletterName: config.BOT_NAME,
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

        // ── Send Audio (menu.m4a) ──
        const audioPath = path.join(__dirname, '../assets/menu.m4a');
        if (fs.existsSync(audioPath)) {
            const buffer = fs.readFileSync(audioPath);
            const ptt = await converter.toPTT(buffer, 'm4a');
            await conn.sendMessage(from, {
                audio: ptt,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
            }, { quoted: mek });
        } else {
            console.log('menu.m4a not found, skipping audio');
        }

    } catch (e) {
        console.log(e);
        reply(`❌ *Error:* ${e}`);
    }
});
