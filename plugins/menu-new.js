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
      
    const menuCaption = `╭━━━〔 👤 *${botName}* 〕━━━┈⊷

┃ ❍ Mode » [${mode}]
┃ ❍ Prefix » [${prefix}]
┃ ❍ Runtime » ${uptime}
┃ ❍ Creater » ${creatorName}
┃ ❍ Commands » ${totalCommands}
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 📜 MENU SECTIONS 〕
┃ ❍ 1️⃣  📥 Download Menu
┃ ❍ 2️⃣  👥 Group Menu
┃ ❍ 3️⃣  😄 Fun Menu
┃ ❍ 4️⃣  👑 Owner Menu
┃ ❍ 5️⃣  🤖 AI Menu
┃ ❍ 6️⃣  🎎 Anime Menu
┃ ❍ 7️⃣  🔄 Convert Menu
┃ ❍ 8️⃣  📌 Other Menu
┃ ❍ 9️⃣  💞 Reactions Menu
┃ ❍ 🔟  🏠 Main Menu
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 📥 DOWNLOAD MENU 〕
┃ ❍ facebook [url]
┃ ❍ download [url]
┃ ❍ mediafire [url]
┃ ❍ tiktok [url]
┃ ❍ capcut [url]
┃ ❍ twitter [url]
┃ ❍ insta [url]
┃ ❍ apk [app]
┃ ❍ img [query]
┃ ❍ tt2 [url]
┃ ❍ pins [url]
┃ ❍ apk2 [app]
┃ ❍ fb2 [url]
┃ ❍ pinterest [url]
┃ ❍ spotify [query]
┃ ❍ play [song]
┃ ❍ play2-10 [song]
┃ ❍ audio [url]
┃ ❍ video [url]
┃ ❍ video2-10 [url]
┃ ❍ ytmp3 [url]
┃ ❍ ytmp4 [url]
┃ ❍ song [name]
┃ ❍ darama [name]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 👥 GROUP MENU 〕
┃ ❍ 🛠️ MANAGEMENT
┃ ❍ grouplink
┃ ❍ kickall
┃ ❍ kickall2
┃ ❍ kickall3
┃ ❍ add @user
┃ ❍ remove @user
┃ ❍ kick @user
┃ 〔⚡ ADMIN TOOLS〕
┃ ❍ promote @user
┃ ❍ demote @user
┃ ❍ dismiss
┃ ❍ revoke
┃ ❍ mute [time] 20s 2m 1h
┃ ❍ unmute
┃ ❍ copyg [link]
┃ ❍ lockgc
┃ ❍ unlockgc
┃ 〔🏷️ TAGGING〕
┃ ❍ tag @user
┃ ❍ hidetag [msg]
┃ ❍ tagall
┃ ❍ tagadmins
┃ ❍ invite
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 😄 FUN MENU 〕
┃ ❍ shapar
┃ ❍ rate @user
┃ ❍ insult @user
┃ ❍ hack @user
┃ ❍ ship @user1 @user2
┃ ❍ character
┃ ❍ pickup
┃ ❍ joke
┃ ❍ love
┃ ❍ happy
┃ ❍ sad
┃ ❍ hot
┃ ❍ heart
┃ ❍ shy
┃ ❍ beautiful
┃ ❍ cunfuzed
┃ ❍ mon
┃ ❍ kiss
┃ ❍ broke
┃ ❍ hurt
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 👑 OWNER MENU 〕
┃ ❍ block
┃ ❍ unblock
┃ ❍ fullpp
┃ ❍ setpp
┃ ❍ restart
┃ ❍ shutdown
┃ ❍ updatecmd
┃ 〔 ℹ️ INFO TOOLS 〕
┃ ❍ gjid
┃ ❍ jid
┃ ❍ listcmd
┃ ❍ allmenu
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🤖 AI MENU 〕
┃ ❍ ai [query]
┃ ❍ gpt3 [query]
┃ ❍ gpt2 [query]
┃ ❍ gpt [query]
┃ ❍ gptmini [query]
┃ ❍ meta [query]
┃ 〔 🎨 IMAGE AI 〕
┃ ❍ imagine [text]
┃ ❍ imagine2 [text]
┃ 〔 🔍 SPECIALIZED 〕
┃ ❍ blackbox [query]
┃ ❍ luma [query]
┃ ❍ dj [query]
┃ ❍ irfan [query]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎎 ANIME MENU 〕
┃ ❍ 🖼️ IMAGES
┃ ❍ fack
┃ ❍ dog
┃ ❍ awoo
┃ ❍ garl
┃ ❍ waifu
┃ ❍ neko
┃ ❍ megnumin
┃ ❍ maid
┃ ❍ loli
┃ 〔 🎭 CHARACTERS 〕
┃ ❍ animegirl
┃ ❍ animegirl1-5
┃ ❍ anime1-5
┃ ❍ foxgirl
┃ ❍ naruto
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🔄 CONVERT MENU 〕
┃ ❍ sticker [img]
┃ ❍ sticker2 [img]
┃ ❍ emojimix 😎+😂
┃ ❍ take [name,text]
┃ ❍ tomp3 [video]
┃ 〔📝 TEXT TOOLS 〕
┃ ❍ fancy [text]
┃ ❍ tts [text]
┃ ❍ trt [text]
┃ ❍ base64 [text]
┃ ❍ unbase64 [text]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 📌 OTHER MENU 〕
┃ ❍ timenow
┃ ❍ date
┃ ❍ count [num]
┃ ❍ calculate [expr]
┃ ❍ countx
┃ 〔 🎲 RANDOM 〕
┃ ❍ flip
┃ ❍ coinflip
┃ ❍ rcolor
┃ ❍ roll
┃ ❍ fact
┃ 〔 🔎 SEARCH 〕
┃ ❍ define [word]
┃ ❍ news [query]
┃ ❍ movie [name]
┃ ❍ weather [loc]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 💞 REACTIONS MENU 〕
┃ ❍ ❤️ AFFECTION
┃ ❍ cuddle @user
┃ ❍ hug @user
┃ ❍ kiss @user
┃ ❍ lick @user
┃ ❍ pat @user
┃ 〔 😂 FUNNY 〕
┃ ❍ bully @user
┃ ❍ bonk @user
┃ ❍ yeet @user
┃ ❍ slap @user
┃ ❍ kill @user
┃ 〔 😊 EXPRESSIONS 〕
┃ ❍ blush @user
┃ ❍ smile @user
┃ ❍ happy @user
┃ ❍ wink @user
┃ ❍ poke @user
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🏠 MAIN MENU 〕
┃
┃ ❍ 🤖 BOT INFO
┃ ❍ ping
┃ ❍ live
┃ ❍ alive
┃ ❍ runtime
┃ ❍ uptime
┃ ❍ repo
┃ ❍ owner
┃ 〔 🛠️ BOT CONTROLS 〕
┃ ❍ menu
┃ ❍ menu2
┃ ❍ restart
┃
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`;



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

    const menuData = {  
        '1': {  
            title: `╭━━━〔 📥 *DOWNLOAD MENU* 〕━━━┈⊷

┃ ❍ facebook [url]
┃ ❍ download [url]
┃ ❍ mediafire [url]
┃ ❍ tiktok [url]
┃ ❍ capcut [url]
┃ ❍ twitter [url]
┃ ❍ insta [url]
┃ ❍ apk [app]
┃ ❍ img [query]
┃ ❍ tt2 [url]
┃ ❍ pins [url]
┃ ❍ apk2 [app]
┃ ❍ fb2 [url]
┃ ❍ pinterest [url]
┃ ❍ spotify [query]
┃ ❍ play [song]
┃ ❍ play2-10 [song]
┃ ❍ audio [url]
┃ ❍ video [url]
┃ ❍ video2-10 [url]
┃ ❍ ytmp3 [url]
┃ ❍ ytmp4 [url]
┃ ❍ song [name]
┃ ❍ darama [name]
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '2': {   
            title: `╭━━━〔 👥 *GROUP MENU* 〕━━━┈⊷

┃ ❍ grouplink
┃ ❍ kickall
┃ ❍ kickall2
┃ ❍ kickall3
┃ ❍ add @user
┃ ❍ remove @user
┃ ❍ kick @user
┃ ─〔⚡ ADMIN TOOLS〕
┃ ❍ promote @user
┃ ❍ demote @user
┃ ❍ dismiss
┃ ❍ revoke
┃ ❍ mute [time] 20s 2m 1h
┃ ❍ unmute
┃ ❍ copyg [link]
┃ ❍ lockgc
┃ ❍ unlockgc
┃ ─〔🏷️ TAGGING〕
┃ ❍ tag @user
┃ ❍ hidetag [msg]
┃ ❍ tagall
┃ ❍ tagadmins
┃ ❍ invite
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '3': {   
            title: `╭━━━〔 😄 *FUN MENU* 〕━━━┈⊷

┃ ❍ shapar
┃ ❍ rate @user
┃ ❍ insult @user
┃ ❍ hack @user
┃ ❍ ship @user1 @user2
┃ ❍ character
┃ ❍ pickup
┃ ❍ joke
┃ ❍ love
┃ ❍ happy
┃ ❍ sad
┃ ❍ hot
┃ ❍ heart
┃ ❍ shy
┃ ❍ beautiful
┃ ❍ cunfuzed
┃ ❍ mon
┃ ❍ kiss
┃ ❍ broke
┃ ❍ hurt
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '4': {   
            title: `╭━━━〔 👑 *OWNER MENU* 〕━━━┈⊷

┃ ❍ block
┃ ❍ unblock
┃ ❍ fullpp
┃ ❍ setpp
┃ ❍ restart
┃ ❍ shutdown
┃ ❍ updatecmd
┃ ─〔ℹ️ INFO TOOLS〕
┃ ❍ gjid
┃ ❍ jid
┃ ❍ listcmd
┃ ❍ allmenu
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '5': {   
            title: `╭━━━〔 🤖 *AI MENU* 〕━━━┈⊷

┃ ❍ ai [query]
┃ ❍ gpt3 [query]
┃ ❍ gpt2 [query]
┃ ❍ gpt [query]
┃ ❍ gptmini [query]
┃ ❍ meta [query]
┃ ─〔🎨 IMAGE AI〕
┃ ❍ imagine [text]
┃ ❍ imagine2 [text]
┃ ─〔🔍 SPECIALIZED〕
┃ ❍ blackbox [query]
┃ ❍ luma [query]
┃ ❍ dj [query]
┃ ❍ irfan [query]
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '6': {   
            title: `╭━━━〔 🎎 *ANIME MENU* 〕━━━┈⊷

┃ ❍ fack
┃ ❍ dog
┃ ❍ awoo
┃ ❍ garl
┃ ❍ waifu
┃ ❍ neko
┃ ❍ megnumin
┃ ❍ maid
┃ ❍ loli
┃ ─〔🎭 CHARACTERS〕
┃ ❍ animegirl
┃ ❍ animegirl1-5
┃ ❍ anime1-5
┃ ❍ foxgirl
┃ ❍ naruto
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '7': {   
            title: `╭━━━〔 🔄 *CONVERT MENU* 〕━━━┈⊷

┃ ❍ sticker [img]
┃ ❍ sticker2 [img]
┃ ❍ emojimix 😎+😂
┃ ❍ take [name,text]
┃ ❍ tomp3 [video]
┃ ─〔📝 TEXT TOOLS〕
┃ ❍ fancy [text]
┃ ❍ tts [text]
┃ ❍ trt [text]
┃ ❍ base64 [text]
┃ ❍ unbase64 [text]
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '8': {   
            title: `╭━━━〔 📌 *OTHER MENU* 〕━━━┈⊷

┃ ❍ timenow
┃ ❍ date
┃ ❍ count [num]
┃ ❍ calculate [expr]
┃ ❍ countx
┃ ─〔🎲 RANDOM〕
┃ ❍ flip
┃ ❍ coinflip
┃ ❍ rcolor
┃ ❍ roll
┃ ❍ fact
┃ ─〔🔎 SEARCH〕
┃ ❍ define [word]
┃ ❍ news [query]
┃ ❍ movie [name]
┃ ❍ weather [loc]
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '9': {   
            title: `╭━━━〔 💞 *REACTIONS MENU* 〕━━━┈⊷

┃ ❍ ❤️ AFFECTION
┃ ❍ cuddle @user
┃ ❍ hug @user
┃ ❍ kiss @user
┃ ❍ lick @user
┃ ❍ pat @user
┃ ─〔😂 FUNNY〕
┃ ❍ bully @user
┃ ❍ bonk @user
┃ ❍ yeet @user
┃ ❍ slap @user
┃ ❍ kill @user
┃ ─〔😊 EXPRESSIONS〕
┃ ❍ blush @user
┃ ❍ smile @user
┃ ❍ happy @user
┃ ❍ wink @user
┃ ❍ poke @user
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
            image: true   
        },  
        '10': {   
            title: `╭━━━〔 🏠 *MAIN MENU* 〕━━━┈⊷

┃ ❍ 🤖 BOT INFO
┃ ❍ ping
┃ ❍ live
┃ ❍ alive
┃ ❍ runtime
┃ ❍ uptime
┃ ❍ repo
┃ ❍ owner
┃ ─〔🛠️ BOT CONTROLS〕
┃ ❍ menu
┃ ❍ menu2
┃ ❍ restart
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${creatorName}`,
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