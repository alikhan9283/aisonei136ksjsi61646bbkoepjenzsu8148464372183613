const { cmd } = require("../command");

cmd({
    pattern: "getppall",
    alias: ["allpp", "grouppp"],
    react: "🖼️",
    desc: "Get profile pictures of all group members",
    category: "group",
    use: ".getppall",
    filename: __filename
}, async (client, message, match, { from, reply, isGroup }) => {
    try {
        if (!isGroup) {
            return reply(`⚠️ Ye command sirf group me kaam karti hai.\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await client.sendMessage(message.chat, { react: { text: "🖼️", key: message.key } }).catch(() => {});

        const groupMetadata = await client.groupMetadata(message.chat);
        const participants = groupMetadata.participants || [];

        if (!participants.length) {
            return reply(`⚠️ Group members nahi mil sake.\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
        }

        await reply(`🖼️ *${participants.length} members ki profile pictures fetch ho rahi hain...*`);

        let sent = 0;
        let skipped = 0;

        for (const participant of participants) {
            const jid = participant.id;
            const number = jid.split("@")[0];

            try {
                const ppUrl = await client.profilePictureUrl(jid, "image");
                await client.sendMessage(message.chat, {
                    image: { url: ppUrl },
                    caption: `👤 @${number}`,
                    mentions: [jid]
                });
                sent++;
            } catch (e) {
                // No profile picture set, or privacy settings block it —
                // skip silently rather than spamming an error per member.
                skipped++;
            }

            // Small delay between sends to avoid hitting rate limits
            await new Promise((r) => setTimeout(r, 800));
        }

        await client.sendMessage(message.chat, {
            text: `✅ *Done!*\n📸 Sent: ${sent}\n⏭️ Skipped (no pp/private): ${skipped}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`
        }, { quoted: message });

        await client.sendMessage(message.chat, { react: { text: "✅", key: message.key } }).catch(() => {});
    } catch (error) {
        console.error("❌ GetPPAll Error:", error.message);
        await client.sendMessage(message.chat, { react: { text: "❌", key: message.key } }).catch(() => {});
        reply(`❌ *Failed!*\nReason: ${error.message}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐒𝐀𝐑𝐖𝐀𝐑-𝐌𝐃 ⚡`);
    }
});
