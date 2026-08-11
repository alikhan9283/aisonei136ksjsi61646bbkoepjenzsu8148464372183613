const config = require('../config');
const { cmd } = require('../command');

cmd({
  pattern: "sarwar2",
  alias: ["s2"],
  desc: "Bot online/offline karo",
  category: "owner",
  filename: __filename,
  react: "⚡"
}, async (conn, mek, m, { from, isOwner, args, reply }) => {
  if (!isOwner) return reply("❌ *Sirf Owner use kar sakta hai!*");
  
  const option = args[0]?.toLowerCase();
  
  if (option === "on") {
    await conn.sendPresenceUpdate("available", from);
    reply(`*🟢 Bot ONLINE ho gaya!*\n\n> SARWAR-MD`);
    
  } else if (option === "off") {
    await conn.sendPresenceUpdate("unavailable", from);
    reply(`*⚫ Bot OFFLINE ho gaya!*\n\n> SARWAR-MD`);
    
  } else {
    reply(`*⚡ SARWAR-MD Presence Control*\n\n*.sarwar2 on* — Bot online\n*.sarwar2 off* — Bot offline\n\n> SARWAR-MD`);
  }
});
