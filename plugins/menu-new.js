const fs = require('fs');
const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');
const path = require('path');
const converter = require('../data/converter');

cmd({
pattern: "menu",
desc: "Show interactive menu system",
category: "menu",
react: "🧾",
filename: __filename
}, async (conn, mek, m, { from, reply, isOwner }) => {
try {

const totalCommands = Object.keys(commands).length;

    const botName = config.BOT_NAME || "SARWAR-MD";
    const mode = config.MODE || "public";
    const prefix = config.PREFIX || ".";
    const creatorName = "SARWAR-MD";
    const uptime = runtime(process.uptime());

    // ── Bold + Gold box-drawing style ──────────────────────────
    const menuCaption = `┏━❮ 🥇 *${botName}* ❯━┓
┃
┃ 𝗠𝗢𝗗𝗘 ➤ *${mode}*
┃ 𝗣𝗥𝗘𝗙𝗜𝗫 ➤ *[${prefix}]*
┃ 𝗥𝗨𝗡𝗧𝗜𝗠𝗘 ➤ *${uptime}*
┃ 𝗖𝗥𝗘𝗔𝗧𝗢𝗥 ➤ *${creatorName}*
┃ 𝗧𝗢𝗧𝗔𝗟 𝗖𝗠𝗗𝗦 ➤ *${totalCommands}*
┃
┗━━━━━━━━━━━━━━┛

┏━❮ 📜 *𝗠𝗘𝗡𝗨 𝗦𝗘𝗖𝗧𝗜𝗢𝗡𝗦* ❯━┓
┃ ➊  📥 Download Menu
┃ ➋  👥 Group Menu
┃ ➌  😄 Fun Menu
┃ ➍  👑 Owner Menu
┃ ➎  🤖 AI Menu
┃ ➏  🎎 Anime Menu
┃ ➐  🔄 Convert Menu
┃ ➑  📌 Other Menu
┃ ➒  💞 Reactions Menu
┃ ➓  🏠 Main Menu
┗━━━━━━━━━━━━━━┛

> *Reply with a number (1-10) to open a section*

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`;

    const contextInfo = {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363407310860031@newsletter',
            newsletterName: creatorName,
            serverMessageId: 143
        }
    };

    const sendMenuImage = async () => {
        try {
            return await conn.sendMessage(
                from,
                {
                    image: { url: config.MENU_IMAGE_URL || 'https://i.ibb.co/cKZNpnR9/MOON-MD.jpg' },
                    caption: menuCaption,
                    contextInfo: contextInfo
                },
                { quoted: mek }
            );
        } catch (e) {
            console.log('Image send failed, falling back to text');
            return await conn.sendMessage(
                from,
                { text: menuCaption, contextInfo: contextInfo },
                { quoted: mek }
            );
        }
    };

    let sentMsg;
    try {
        sentMsg = await Promise.race([
            sendMenuImage(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Image send timeout')), 10000))
        ]);
    } catch (e) {
        console.log('Menu send error:', e);
        sentMsg = await conn.sendMessage(
            from,
            { text: menuCaption, contextInfo: contextInfo },
            { quoted: mek }
        );
    }

    try {
        const audioPath = path.join(__dirname, '../assets/menu-new.m4a');
        if (fs.existsSync(audioPath)) {
            const buffer = fs.readFileSync(audioPath);
            const ptt = await converter.toPTT(buffer, 'm4a');

            await conn.sendMessage(from, {
                audio: ptt,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
            }, { quoted: mek });
        } else {
            console.error('menu-new.m4a not found in assets folder');
        }
    } catch (audioError) {
        console.log('Audio send error:', audioError);
    }

    const messageID = sentMsg.key.id;

    // ── Each section, bold gold style, ALL commands included ────
    const menuData = {
        '1': {
            title: `┏━❮ 📥 *𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *facebook* [url]
┃ ➤ *facebook2 / fb2* [url]
┃ ➤ *download* [url]
┃ ➤ *mediafire* [url]
┃ ➤ *tiktok* [url]
┃ ➤ *tiktoksearch* [query]
┃ ➤ *tt2* [url]
┃ ➤ *capcut* [url]
┃ ➤ *twitter* [url]
┃ ➤ *insta* [url]
┃ ➤ *instagram2* [url]
┃ ➤ *pinsearch / pins* [query]
┃ ➤ *pinterest* [url]
┃ ➤ *apk* [app]
┃ ➤ *apk2* [app]
┃ ➤ *img* [query]
┃ ➤ *spotify* [query]
┃ ➤ *play / song* [song]
┃ ➤ *play2* [song]
┃ ➤ *play2-10* [song]
┃ ➤ *audio* [url]
┃ ➤ *video* [url]
┃ ➤ *video2-10* [url]
┃ ➤ *ytmp3* [url]
┃ ➤ *ytmp4* [url]
┃ ➤ *ytthumb* [url/id]
┃ ➤ *pair* [number]
┃ ➤ *darama* [name]
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '2': {
            title: `┏━❮ 👥 *𝗚𝗥𝗢𝗨𝗣 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *grouplink*
┃ ➤ *kickall / kickall2 / kickall3*
┃ ➤ *add* @user
┃ ➤ *remove* @user
┃ ➤ *kick* @user
┃
┃ ⚡ *𝗔𝗗𝗠𝗜𝗡 𝗧𝗢𝗢𝗟𝗦*
┃ ➤ *promote* @user
┃ ➤ *demote* @user
┃ ➤ *dismiss*
┃ ➤ *revoke*
┃ ➤ *mute* [time] 20s/2m/1h
┃ ➤ *unmute*
┃ ➤ *copyg* [link]
┃ ➤ *lockgc*
┃ ➤ *unlockgc*
┃
┃ 🏷️ *𝗧𝗔𝗚𝗚𝗜𝗡𝗚*
┃ ➤ *tag* @user
┃ ➤ *hidetag* [msg]
┃ ➤ *tagall*
┃ ➤ *tagadmins*
┃ ➤ *invite*
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '3': {
            title: `┏━❮ 😄 *𝗙𝗨𝗡 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *shapar*
┃ ➤ *rate* @user
┃ ➤ *insult* @user
┃ ➤ *hack* @user
┃ ➤ *ship* @user1 @user2
┃ ➤ *character*
┃ ➤ *pickup*
┃ ➤ *joke*
┃ ➤ *love*
┃ ➤ *happy*
┃ ➤ *sad*
┃ ➤ *hot*
┃ ➤ *heart*
┃ ➤ *shy*
┃ ➤ *beautiful*
┃ ➤ *cunfuzed*
┃ ➤ *mon*
┃ ➤ *kiss*
┃ ➤ *broke*
┃ ➤ *hurt*
┃ ➤ *fuck / fu*
┃ ➤ *sassy / savage*
┃ ➤ *goodmorning / gm*
┃ ➤ *goodnight / gn*
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '4': {
            title: `┏━❮ 👑 *𝗢𝗪𝗡𝗘𝗥 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *block*
┃ ➤ *unblock*
┃ ➤ *fullpp*
┃ ➤ *setpp*
┃ ➤ *restart*
┃ ➤ *shutdown*
┃ ➤ *updatecmd*
┃ ➤ *av2* [on/off/list]
┃
┃ ℹ️ *𝗜𝗡𝗙𝗢 𝗧𝗢𝗢𝗟𝗦*
┃ ➤ *gjid*
┃ ➤ *jid*
┃ ➤ *listcmd*
┃ ➤ *allmenu*
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '5': {
            title: `┏━❮ 🤖 *𝗔𝗜 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *ai* [query]
┃ ➤ *gpt3* [query]
┃ ➤ *gpt2* [query]
┃ ➤ *gpt* [query]
┃ ➤ *gptmini* [query]
┃ ➤ *meta* [query]
┃
┃ 🎨 *𝗜𝗠𝗔𝗚𝗘 𝗔𝗜*
┃ ➤ *imagine* [text]
┃ ➤ *imagine2* [text]
┃
┃ 🔍 *𝗦𝗣𝗘𝗖𝗜𝗔𝗟𝗜𝗭𝗘𝗗*
┃ ➤ *blackbox* [query]
┃ ➤ *luma* [query]
┃ ➤ *dj* [query]
┃ ➤ *irfan* [query]
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '6': {
            title: `┏━❮ 🎎 *𝗔𝗡𝗜𝗠𝗘 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ 🖼️ *𝗜𝗠𝗔𝗚𝗘𝗦*
┃ ➤ *fack*
┃ ➤ *dog*
┃ ➤ *awoo*
┃ ➤ *garl*
┃ ➤ *waifu*
┃ ➤ *neko*
┃ ➤ *megnumin*
┃ ➤ *maid*
┃ ➤ *loli*
┃ ➤ *anime* [keyword]
┃ ➤ *animeboy*
┃ ➤ *animegirl*
┃ ➤ *animehd / anime4k*
┃ ➤ *attitude*
┃ ➤ *attitudegirl*
┃ ➤ *attitudeboyreal*
┃ ➤ *attitudegirlreal*
┃
┃ 🎬 *𝗩𝗜𝗗𝗘𝗢𝗦*
┃ ➤ *animeboyvideo*
┃ ➤ *animegirlvideo*
┃
┃ 🎭 *𝗖𝗛𝗔𝗥𝗔𝗖𝗧𝗘𝗥𝗦*
┃ ➤ *animegirl1-5*
┃ ➤ *anime1-5*
┃ ➤ *foxgirl*
┃ ➤ *naruto*
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '7': {
            title: `┏━❮ 🔄 *𝗖𝗢𝗡𝗩𝗘𝗥𝗧 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *sticker* [img]
┃ ➤ *sticker2* [img]
┃ ➤ *emojimix* 😎+😂
┃ ➤ *take* [name,text]
┃ ➤ *tomp3* [video]
┃
┃ 📝 *𝗧𝗘𝗫𝗧 𝗧𝗢𝗢𝗟𝗦*
┃ ➤ *fancy* [text]
┃ ➤ *tts* [text]
┃ ➤ *trt* [text]
┃ ➤ *base64* [text]
┃ ➤ *unbase64* [text]
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '8': {
            title: `┏━❮ 📌 *𝗢𝗧𝗛𝗘𝗥 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ➤ *timenow*
┃ ➤ *date*
┃ ➤ *count* [num]
┃ ➤ *calculate* [expr]
┃ ➤ *countx*
┃
┃ 🎲 *𝗥𝗔𝗡𝗗𝗢𝗠*
┃ ➤ *flip*
┃ ➤ *coinflip*
┃ ➤ *rcolor*
┃ ➤ *roll*
┃ ➤ *fact*
┃
┃ 🔎 *𝗦𝗘𝗔𝗥𝗖𝗛*
┃ ➤ *define* [word]
┃ ➤ *news* [query]
┃ ➤ *movie* [name]
┃ ➤ *weather* [loc]
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '9': {
            title: `┏━❮ 💞 *𝗥𝗘𝗔𝗖𝗧𝗜𝗢𝗡𝗦 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ ❤️ *𝗔𝗙𝗙𝗘𝗖𝗧𝗜𝗢𝗡*
┃ ➤ *cuddle* @user
┃ ➤ *hug* @user
┃ ➤ *kiss* @user
┃ ➤ *lick* @user
┃ ➤ *pat* @user
┃
┃ 😂 *𝗙𝗨𝗡𝗡𝗬*
┃ ➤ *bully* @user
┃ ➤ *bonk* @user
┃ ➤ *yeet* @user
┃ ➤ *slap* @user
┃ ➤ *kill* @user
┃
┃ 😊 *𝗘𝗫𝗣𝗥𝗘𝗦𝗦𝗜𝗢𝗡𝗦*
┃ ➤ *blush* @user
┃ ➤ *smile* @user
┃ ➤ *happy* @user
┃ ➤ *wink* @user
┃ ➤ *poke* @user
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        },
        '10': {
            title: `┏━❮ 🏠 *𝗠𝗔𝗜𝗡 𝗠𝗘𝗡𝗨* ❯━┓
┃
┃ 🤖 *𝗕𝗢𝗧 𝗜𝗡𝗙𝗢*
┃ ➤ *ping*
┃ ➤ *live*
┃ ➤ *alive*
┃ ➤ *alive2*
┃ ➤ *runtime*
┃ ➤ *uptime*
┃ ➤ *repo*
┃ ➤ *owner*
┃
┃ 🛠️ *𝗕𝗢𝗧 𝗖𝗢𝗡𝗧𝗥𝗢𝗟𝗦*
┃ ➤ *menu*
┃ ➤ *menu2*
┃ ➤ *restart*
┃
┗━━━━━━━━━━━━━━┛

★ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 *${creatorName}* ★`,
            image: true
        }
    };

    const handler = async (msgData) => {
        try {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

            const isReplyToMenu = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToMenu) {
                const receivedText = receivedMsg.message.conversation ||
                                  receivedMsg.message.extendedTextMessage?.text;
                const senderID = receivedMsg.key.remoteJid;

                if (menuData[receivedText]) {
                    const selectedMenu = menuData[receivedText];

                    try {
                        if (selectedMenu.image) {
                            await conn.sendMessage(
                                senderID,
                                {
                                    image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/zc57w6.jpg' },
                                    caption: selectedMenu.title,
                                    contextInfo: contextInfo
                                },
                                { quoted: receivedMsg }
                            );
                        } else {
                            await conn.sendMessage(
                                senderID,
                                { text: selectedMenu.title, contextInfo: contextInfo },
                                { quoted: receivedMsg }
                            );
                        }

                        await conn.sendMessage(senderID, {
                            react: { text: '✅', key: receivedMsg.key }
                        });

                    } catch (e) {
                        console.log('Menu reply error:', e);
                        await conn.sendMessage(
                            senderID,
                            { text: selectedMenu.title, contextInfo: contextInfo },
                            { quoted: receivedMsg }
                        );
                    }

                } else {
                    await conn.sendMessage(
                        senderID,
                        {
                            text: `❌ Invalid option! Please reply with a number between 1-10. Example: 1`
                        },
                        { quoted: receivedMsg }
                    );
                }
            }
        } catch (e) {
            console.log('Handler error:', e);
        }
    };

    conn.ev.on("messages.upsert", handler);

    setTimeout(() => {
        conn.ev.off("messages.upsert", handler);
    }, 300000);

} catch (e) {
    console.error('Menu Error:', e);
    try {
        await conn.sendMessage(
            from,
            {
                text: `❌ Menu system is busy. Please try again later.`
            },
            { quoted: mek }
        );
    } catch (finalError) {
        console.log('Final error handling failed:', finalError);
    }
}

});
