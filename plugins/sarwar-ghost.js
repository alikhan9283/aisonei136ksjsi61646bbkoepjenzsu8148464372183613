const { cmd } = require('../command');
const config = require('../config');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Ghost Mode State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let ghostMode = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .sarwar on
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    pattern: 'sarwar',
    alias: ['ghostmode', 'invisible'],
    desc: 'ɢʜᴏsᴛ ᴍᴏᴅᴇ — ᴏɴʟɪɴᴇ ʀʜᴏ ᴍɢʀ ᴏꜰꜰʟɪɴᴇ ɴᴢʀ ᴀᴀᴏ',
    category: 'owner',
    react: '👻',
    filename: __filename
},
async (conn, mek, m, { from, sender, args, isOwner, reply }) => {
    try {
        if (!isOwner) return reply(`╔══════════════════╗\n║  ❌ *ᴇʀʀᴏʀ*\n╚══════════════════╝\n\n🚫 *Sirf Owner use kar sakta hai!*`);

        const action = args[0]?.toLowerCase();

        if (!action || !['on', 'off', 'status'].includes(action)) {
            return reply(
`╔══════════════════════╗
║  👻 *sᴀʀᴡᴀʀ ɢʜᴏsᴛ*
╚══════════════════════╝

📌 *Commands:*

🟢 *.sarwar on*  — Ghost mode ON
🔴 *.sarwar off* — Ghost mode OFF
📊 *.sarwar status* — Status dekho

> 🤖 *SARWAR MD*`
            );
        }

        // ── STATUS ──
        if (action === 'status') {
            return reply(
`╔══════════════════════╗
║  📊 *ɢʜᴏsᴛ sᴛᴀᴛᴜs*
╚══════════════════════╝

👻 *Ghost Mode :* ${ghostMode ? '🟢 ON' : '🔴 OFF'}
🔇 *Read Receipt:* ${ghostMode ? 'OFF (Single Tick)' : 'ON (Double Tick)'}
🕐 *Last Seen  :* ${ghostMode ? 'Hidden' : 'Visible'}
👁️ *Online     :* ${ghostMode ? 'Hidden' : 'Visible'}
📸 *Profile Pic:* ${ghostMode ? 'Hidden' : 'Visible'}

> 🤖 *SARWAR MD*`
            );
        }

        // ── ON ──
        if (action === 'on') {
            ghostMode = true;

            // 1. Last seen → nobody
            await conn.updateLastSeenPrivacy('none').catch(() => {});

            // 2. Online → hidden
            await conn.updateOnlinePrivacy('match_last_seen').catch(() => {});

            // 3. Read receipts → off
            await conn.updateReadReceiptsPrivacy('none').catch(() => {});

            // 4. Profile pic → nobody
            await conn.updateProfilePicturePrivacy('none').catch(() => {});

            // 5. Presence unavailable (offline dikhao)
            await conn.sendPresenceUpdate('unavailable').catch(() => {});

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMG || 'https://files.catbox.moe/zc57w6.jpg' },
                caption:
`╔══════════════════════╗
║  👻 *ɢʜᴏsᴛ ᴍᴏᴅᴇ ᴏɴ!*
╚══════════════════════╝

✅ *Sab kuch active ho gaya!*

👻 *Ghost Mode   :* 🟢 ON
🔇 *Read Receipt :* OFF *(Single Tick)*
🕐 *Last Seen    :* Hidden
👁️ *Online Status:* Hidden
📸 *Profile Pic  :* Hidden
📵 *Presence     :* Offline

💡 *Ab aap online rahenge magar kisi ko pata nahi chalega!*

> 🤖 *SARWAR MD*`,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363407310860031@newsletter',
                        newsletterName: 'SARWAR MD',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        }

        // ── OFF ──
        if (action === 'off') {
            ghostMode = false;

            // 1. Last seen → contacts
            await conn.updateLastSeenPrivacy('contacts').catch(() => {});

            // 2. Online → all
            await conn.updateOnlinePrivacy('all').catch(() => {});

            // 3. Read receipts → on
            await conn.updateReadReceiptsPrivacy('all').catch(() => {});

            // 4. Profile pic → all
            await conn.updateProfilePicturePrivacy('all').catch(() => {});

            // 5. Presence available (online dikhao)
            await conn.sendPresenceUpdate('available').catch(() => {});

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMG || 'https://files.catbox.moe/zc57w6.jpg' },
                caption:
`╔══════════════════════╗
║  👁️ *ɢʜᴏsᴛ ᴍᴏᴅᴇ ᴏꜰꜰ!*
╚══════════════════════╝

✅ *Sab normal ho gaya!*

👁️ *Ghost Mode   :* 🔴 OFF
✅ *Read Receipt :* ON *(Double Tick)*
🕐 *Last Seen    :* Contacts
👁️ *Online Status:* Visible
📸 *Profile Pic  :* All
📶 *Presence     :* Online

> 🤖 *SARWAR MD*`,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363407310860031@newsletter',
                        newsletterName: 'SARWAR MD',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply(`❌ *Error:* ${e.message}`);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Auto Presence Handler
//  Ghost mode ON hone par
//  har message pe unavailable bhejo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    on: 'body',
    filename: __filename
},
async (conn, mek, m, { from, sender }) => {
    try {
        if (!ghostMode) return;
        // Har message ke baad unavailable presence bhejo
        await conn.sendPresenceUpdate('unavailable', from).catch(() => {});
    } catch (e) {}
});
