const { cmd } = require("../command");
const config = require("../config");
const fs = require("fs");
const path = "./autovv_status.json";

// Status load karna (Restart ke baad bhi yaad rakhega)
let autoViewStatus = false;
if (fs.existsSync(path)) {
    try {
        autoViewStatus = JSON.parse(fs.readFileSync(path)).status;
    } catch (e) {
        autoViewStatus = false;
    }
}

// ═══════════════════════════════════════════════════════════
//  COMMAND 1: .autovv on / .autovv off
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "autovv",
    alias: ["autoview", "vv"],
    desc: "Turn Auto View-Once Forwarder ON or OFF",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, isCreator, prefix }) => {
    try {
        // Sirf Owner use kar sake
        if (!isCreator) return await message.reply("❌ *Yeh command sirf Owner use kar sakta hai!*");

        const action = match ? match.trim().toLowerCase() : "";

        if (action === "on") {
            autoViewStatus = true;
            fs.writeFileSync(path, JSON.stringify({ status: true }));
            return await message.reply("✅ *Auto View-Once Forwarder is now ON!*\n\nAb koi bhi view-once media bhejega, toh wo seedha aapke inbox mein aa jayegi.");
        } 
        else if (action === "off") {
            autoViewStatus = false;
            fs.writeFileSync(path, JSON.stringify({ status: false }));
            return await message.reply("❌ *Auto View-Once Forwarder is now OFF!*");
        } 
        else {
            return await message.reply(`*Current Status:* ${autoViewStatus ? "ON ✅" : "OFF ❌"}\n\n*Usage:*\n${prefix}autovv on\n${prefix}autovv off`);
        }
    } catch (error) {
        console.error("[AutoVV Command Error]:", error);
    }
});

// ═══════════════════════════════════════════════════════════
//  COMMAND 2: Background Listener (Asli Kaam Yeh Karega)
// ═══════════════════════════════════════════════════════════
cmd({
    on: "message", // Har message ko background mein check karega
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, sender, isGroup }) => {
    try {
        // 1. Agar OFF hai, toh kuch mat karo (Fast exit)
        if (!autoViewStatus) return;

        // 2. View-Once Detection (SARWAR-MD Compatible)
        const isViewOnce = message.viewOnce || 
                           message.message?.viewOnceMessage || 
                           message.message?.viewOnceMessageV2 ||
                           message.message?.viewOnceMessageV2Extension;

        if (!isViewOnce) return; // Agar view-once nahi hai, toh exit

        // 3. Owner ka Number Config se Nikalna
        let ownerJid = "";
        const ownerConfigs = [config.OWNER, config.owner, config.ownerNumber, config.owner_number];
        for (const owner of ownerConfigs) {
            if (owner) {
                const cleaned = String(owner).replace(/[^0-9]/g, "");
                if (cleaned.length >= 10) {
                    ownerJid = cleaned + "@s.whatsapp.net";
                    break;
                }
            }
        }
        if (!ownerJid) return; // Owner number nahi mila toh exit

        // 4. Media Download Karna
        let buffer;
        try {
            buffer = await message.download();
        } catch (e) {
            console.log("[AutoVV] Download failed:", e.message);
            return;
        }
        if (!buffer || buffer.length === 0) return;

        // 5. Media Type Check Karna
        const mtype = Object.keys(message.message || {})[0]?.replace('Message', '') || 'unknown';
        const senderName = message.pushName || "Unknown";
        const chatInfo = isGroup ? "Group" : "Private Chat";
        
        const caption = `⚠️ *AUTO VIEW-ONCE SAVED* ⚠️\n\n👤 *Sender:* ${senderName}\n🔢 *Number:* ${sender ? '@' + sender.split('@')[0] : 'Unknown'}\n📍 *Location:* ${chatInfo}\n⏰ *Time:* ${new Date().toLocaleString()}\n\n_Auto-forwarded by SARWAR-MD_`;

        // 6. Owner ke Inbox mein Forward Karna
        if (mtype === "image" || mtype === "imageMessage" || mtype === "viewOnceMessage") {
            await client.sendMessage(ownerJid, { image: buffer, caption: caption });
            console.log("[AutoVV] ✅ Image forwarded to owner");
        } 
        else if (mtype === "video" || mtype === "videoMessage") {
            await client.sendMessage(ownerJid, { video: buffer, caption: caption });
            console.log("[AutoVV] ✅ Video forwarded to owner");
        } 
        else if (mtype === "audio" || mtype === "audioMessage") {
            await client.sendMessage(ownerJid, { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: true // Voice note style
            });
            console.log("[AutoVV] ✅ Audio forwarded to owner");
        }

    } catch (error) {
        console.error("[AutoVV Listener Error]:", error.message);
    }
});
