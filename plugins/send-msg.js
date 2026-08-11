const { cmd } = require('../command');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Active sends store (cancel ke liye)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const activeSends = new Map();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .send1 [message] [times]
//  Normal speed — ek ek karke
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    pattern: 'send1',
    alias: ['msend', 'spamone'],
    use: '.send1 [message] [times]',
    desc: 'ᴇᴋ ᴍᴇꜱꜱᴀɢᴇ ʙᴀᴀʀ ʙᴀᴀʀ ʙʜᴇᴊᴏ',
    category: 'owner',
    react: '📨',
    filename: __filename
},
async (conn, mek, m, { from, args, isOwner, reply }) => {
    try {
        if (!isOwner) return reply(`❌ *Sirf Owner use kar sakta hai!*`);

        if (!args.length) return reply(
`╔══════════════════════╗
║  📨 *ꜱᴇɴᴅ1*
╚══════════════════════╝

📌 *Tarika:*
*.send1 [message] [times]*

*Misal:*
*.send1 hello 10*
*.send1 hi sarwar 50*

⚠️ *Max: 100 messages*
🛑 *Band karo:* *.stopm*`
        );

        // Last arg number hai?
        let times = 10;
        let msgParts = [...args];
        const lastArg = args[args.length - 1];

        if (!isNaN(lastArg) && parseInt(lastArg) > 0) {
            times = Math.min(parseInt(lastArg), 100);
            msgParts = args.slice(0, -1);
        }

        const message = msgParts.join(' ');
        if (!message) return reply(`❌ *Message daalo!*\n📌 *.send1 hello 10*`);

        const key = from + '_send1';
        activeSends.set(key, true);

        await reply(
`╔══════════════════════╗
║  📨 *ꜱᴇɴᴅɪɴɢ...*
╚══════════════════════╝

💬 *Message :* ${message}
🔢 *Times   :* ${times}x
⏱️ *Speed   :* Normal

🛑 *Band karo:* *.stopm*`
        );

        let sent = 0;
        for (let i = 0; i < times; i++) {
            if (!activeSends.get(key)) {
                await conn.sendMessage(from, { text: `🛑 *Send band ho gaya!* (${sent}/${times})` });
                break;
            }
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            sent++;
            await new Promise(r => setTimeout(r, 1000)); // 1 second delay
        }

        if (activeSends.get(key)) {
            activeSends.delete(key);
            await conn.sendMessage(from, {
                text:
`╔══════════════════════╗
║  ✅ *ᴅᴏɴᴇ!*
╚══════════════════════╝

✅ *${sent} messages bhej diye!*
💬 *Message:* ${message}

> 🤖 *SARWAR MD*`
            });
        }

    } catch (e) {
        console.log(e);
        reply(`❌ *Error:* ${e.message}`);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .send2 [message] [times]
//  Fast speed — jaldi jaldi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    pattern: 'send2',
    alias: ['fsend', 'spamtwo'],
    use: '.send2 [message] [times]',
    desc: 'ꜰᴀꜱᴛ ꜱᴘᴇᴇᴅ ᴍᴇꜱꜱᴀɢᴇ ʙʜᴇᴊᴏ',
    category: 'owner',
    react: '⚡',
    filename: __filename
},
async (conn, mek, m, { from, args, isOwner, reply }) => {
    try {
        if (!isOwner) return reply(`❌ *Sirf Owner use kar sakta hai!*`);

        if (!args.length) return reply(
`╔══════════════════════╗
║  ⚡ *ꜱᴇɴᴅ2*
╚══════════════════════╝

📌 *Tarika:*
*.send2 [message] [times]*

*Misal:*
*.send2 hello 10*
*.send2 hi sarwar 50*

⚠️ *Max: 100 messages*
🛑 *Band karo:* *.stopm*`
        );

        // Last arg number hai?
        let times = 10;
        let msgParts = [...args];
        const lastArg = args[args.length - 1];

        if (!isNaN(lastArg) && parseInt(lastArg) > 0) {
            times = Math.min(parseInt(lastArg), 100);
            msgParts = args.slice(0, -1);
        }

        const message = msgParts.join(' ');
        if (!message) return reply(`❌ *Message daalo!*\n📌 *.send2 hello 10*`);

        const key = from + '_send2';
        activeSends.set(key, true);

        await reply(
`╔══════════════════════╗
║  ⚡ *ꜰᴀꜱᴛ ꜱᴇɴᴅɪɴɢ...*
╚══════════════════════╝

💬 *Message :* ${message}
🔢 *Times   :* ${times}x
⚡ *Speed   :* Fast

🛑 *Band karo:* *.stopm*`
        );

        let sent = 0;
        for (let i = 0; i < times; i++) {
            if (!activeSends.get(key)) {
                await conn.sendMessage(from, { text: `🛑 *Send band ho gaya!* (${sent}/${times})` });
                break;
            }
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            sent++;
            await new Promise(r => setTimeout(r, 300)); // 0.3 second delay (fast)
        }

        if (activeSends.get(key)) {
            activeSends.delete(key);
            await conn.sendMessage(from, {
                text:
`╔══════════════════════╗
║  ✅ *ᴅᴏɴᴇ!*
╚══════════════════════╝

✅ *${sent} messages bhej diye!*
💬 *Message:* ${message}
⚡ *Speed  :* Fast

> 🤖 *SARWAR MD*`
            });
        }

    } catch (e) {
        console.log(e);
        reply(`❌ *Error:* ${e.message}`);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .stopm — Send band karo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    pattern: 'stopm',
    alias: ['stopsend', 'cancelsend'],
    use: '.stopm',
    desc: 'ꜱᴇɴᴅ ʙᴀɴᴅ ᴋᴀʀᴏ',
    category: 'owner',
    react: '🛑',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    try {
        if (!isOwner) return reply(`❌ *Sirf Owner use kar sakta hai!*`);

        const key1 = from + '_send1';
        const key2 = from + '_send2';

        if (activeSends.has(key1) || activeSends.has(key2)) {
            activeSends.set(key1, false);
            activeSends.set(key2, false);
            reply(
`╔══════════════════════╗
║  🛑 *ꜱᴛᴏᴘᴘᴇᴅ!*
╚══════════════════════╝

✅ *Send band ho gaya!*

> 🤖 *SARWAR MD*`
            );
        } else {
            reply(`⚠️ *Abhi koi send chal nahi raha!*`);
        }
    } catch (e) {
        reply(`❌ *Error:* ${e.message}`);
    }
});
