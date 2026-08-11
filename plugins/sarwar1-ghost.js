const { cmd } = require('../command');
const config = require('../config');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let ghostMode = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .sarwar1 on / off / status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    pattern: 'sarwar1',
    alias: ['ghost1', 'invisible1'],
    desc: 'ꜰᴜʟʟ ɪɴᴠɪꜱɪʙʟᴇ ᴍᴏᴅᴇ — ꜱɪɴɢʟᴇ ᴛɪᴄᴋ + ᴏꜰꜰʟɪɴᴇ',
    category: 'owner',
    react: '👻',
    filename: __filename
},
async (conn, mek, m, { from, sender, args, isOwner, reply }) => {
    try {
        if (!isOwner) return reply(
`╔══════════════════╗
║  ❌ *ᴇʀʀᴏʀ*
╚══════════════════╝

🚫 *Sirf Owner use kar sakta hai!*`
        );

        const action = args[0]?.toLowerCase();

        // ── HELP ──
        if (!action || !['on', 'off', 'status'].includes(action)) {
            return reply(
`╔══════════════════════╗
║  👻 *sᴀʀᴡᴀʀ1 ɢʜᴏsᴛ*
╚══════════════════════╝

📌 *Commands:*

🟢 *.sarwar1 on*     — Full Ghost ON
🔴 *.sarwar1 off*    — Ghost OFF
📊 *.sarwar1 status* — Status dekho

> 🤖 *SARWAR MD*`
            );
        }

        // ── STATUS ──
        if (action === 'status') {
            return reply(
`╔══════════════════════╗
║  📊 *ɢʜᴏsᴛ sᴛᴀᴛᴜs*
╚══════════════════════╝

👻 *Ghost Mode  :* ${ghostMode ? '🟢 *ON*' : '🔴 *OFF*'}
🔇 *Read Receipt:* ${ghostMode ? '*OFF* (Single Tick)' : '*ON* (Double Tick)'}
🕐 *Last Seen   :* ${ghostMode ? '*Hidden*' : '*Visible*'}
👁️ *Online      :* ${ghostMode ? '*Hidden*' : '*Visible*'}
📸 *Profile Pic :* ${ghostMode ? '*Hidden*' : '*Visible*'}
📵 *Presence    :* ${ghostMode ? '*Offline*' : '*Online*'}

> 🤖 *SARWAR MD*`
            );
        }

        // ━━━━━━━━━━━━━━━━━━━
        //  ON
        // ━━━━━━━━━━━━━━━━━━━
        if (action === 'on') {
            ghostMode = true;

            // 1. Last seen → nobody
            await conn.updateLastSeenPrivacy('none').catch(() => {});

            // 2. Online → match last seen (hidden)
            await conn.updateOnlinePrivacy('match_last_seen').catch(() => {});

            // 3. Read receipts → OFF (single tick)
            await conn.updateReadReceiptsPrivacy('none').catch(() => {});

            // 4. Profile pic → nobody
            await conn.updateProfilePicturePrivacy('none').catch(() => {});

            // 5. Status privacy → nobody
            await conn.updateStatusPrivacy('none').catch(() => {});

            // 6. Presence → unavailable (offline)
            await conn.sendPresenceUpdate('unavailable').catch(() => {});

            // 7. Groups add privacy → contacts
            await conn.updateGroupsAddPrivacy('contacts').catch(() => {});

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMG || 'https://files.catbox.moe/zc57w6.jpg' },
                caption:
`╔══════════════════════╗
║  👻 *ɢʜᴏsᴛ ᴍᴏᴅᴇ ᴏɴ!*
╚══════════════════════╝

✅ *Full Invisible Mode Active!*

👻 *Ghost Mode   :* 🟢 *ON*
🔇 *Read Receipt :* *OFF* _(Single Tick Only)_
🕐 *Last Seen    :* *Hidden* _(Nobody)_
👁️ *Online Status:* *Hidden*
📸 *Profile Pic  :* *Hidden* _(Nobody)_
📵 *Presence     :* *Offline*
👥 *Group Add    :* *Contacts Only*

💡 *Ab aap messages padh sakte ho — sender ko sirf ek tick dikhega, kuch bhi pata nahi chalega!*

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

        // ━━━━━━━━━━━━━━━━━━━
        //  OFF
        // ━━━━━━━━━━━━━━━━━━━
        if (action === 'off') {
            ghostMode = false;

            // 1. Last seen → contacts
            await conn.updateLastSeenPrivacy('contacts').catch(() => {});

            // 2. Online → all
            await conn.updateOnlinePrivacy('all').catch(() => {});

            // 3. Read receipts → ON
            await conn.updateReadReceiptsPrivacy('all').catch(() => {});

            // 4. Profile pic → all
            await conn.updateProfilePicturePrivacy('all').catch(() => {});

            // 5. Status → contacts
            await conn.updateStatusPrivacy('contacts').catch(() => {});

            // 6. Presence → available
            await conn.sendPresenceUpdate('available').catch(() => {});

            // 7. Groups add → all
            await conn.updateGroupsAddPrivacy('all').catch(() => {});

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMG || 'https://files.catbox.moe/zc57w6.jpg' },
                caption:
`╔══════════════════════╗
║  👁️ *ɢʜᴏsᴛ ᴍᴏᴅᴇ ᴏꜰꜰ!*
╚══════════════════════╝

✅ *Normal Mode Active!*

👁️ *Ghost Mode   :* 🔴 *OFF*
✅ *Read Receipt :* *ON* _(Double Tick)_
🕐 *Last Seen    :* *Contacts*
👁️ *Online Status:* *Visible*
📸 *Profile Pic  :* *All*
📶 *Presence     :* *Online*
👥 *Group Add    :* *All*

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
//  Auto Handler — Ghost ON hone par
//  Har message pe:
//  1. Unavailable presence bhejo
//  2. Message read mat karo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
    on: 'body',
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        if (!ghostMode) return;

        // Presence unavailable bhejo — online nahi dikhega
        await conn.sendPresenceUpdate('unavailable', from).catch(() => {});

        // Read receipts send mat karo — single tick rahegi
        // (updateReadReceiptsPrivacy none se already handle ho raha hai)

    } catch (e) {}
});
