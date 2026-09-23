const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE FORWARDER (SARWAR-MD Compatible)
//  Kaam: Koi bhi view-once media bheje, seedha Owner ke inbox mein jayegi.
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "autoview_system",
    on: "message", // Har message ko background mein scan karega
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, sender, isGroup }) => {
    try {
        // 1. View-Once Detection (Multiple Baileys formats support)
        const isViewOnce = message.viewOnce || 
                           message.message?.viewOnceMessage || 
                           message.message?.viewOnceMessageV2 ||
                           message.message?.viewOnceMessageV2Extension;

        if (!isViewOnce) return; // Agar view-once nahi hai, toh kuch mat karo

        // 2. Media Download
        let buffer;
        try {
            buffer = await message.download();
        } catch (e) {
            console.log("[AutoView] Download failed:", e.message);
            return;
        }
        if (!buffer) return;

        // 3. Owner JID Nikalna (Config se)
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

        // Agar owner number config mein nahi mila, toh current chat mein hi bhej do (fallback)
        const targetJid = ownerJid || from;

        // 4. Media Type Check aur Forwarding
        const mtype = message.mtype || Object.keys(message.message || {})[0].replace('Message', '').toLowerCase();
        const senderName = message.pushName || "Unknown";
        const chatInfo = isGroup ? `Group: ${from}` : `Private: ${from}`;
        
        const caption = `⚠️ *AUTO VIEW-ONCE SAVED* ⚠️\n\n👤 *Sender:* ${senderName}\n🔢 *Number:* ${sender ? '@' + sender.split('@')[0] : 'Unknown'}\n📍 *Location:* ${chatInfo}\n⏰ *Time:* ${new Date().toLocaleString()}\n\n_Auto-forwarded by SARWAR-MD_`;

        if (mtype === "image" || mtype === "imageMessage") {
            await client.sendMessage(targetJid, { image: buffer, caption: caption });
        } 
        else if (mtype === "video" || mtype === "videoMessage") {
            await client.sendMessage(targetJid, { video: buffer, caption: caption });
        } 
        else if (mtype === "audio" || mtype === "audioMessage") {
            await client.sendMessage(targetJid, { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: true // Voice note ki tarah play hoga
            });
        }

        console.log(`[AutoView] ✅ Media forwarded to: ${targetJid}`);

    } catch (error) {
        console.error("[AutoView] ❌ Error:", error.message);
    }
});
