const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE MEDIA FORWARDER (FULLY AUTOMATIC) 🚀
//  ─────────────────────────────────────────────────────────
//  Kaam: Jab bhi koi View-Once (Pic/Video/Voice) bhejega, 
//        Bot usay auto-download karke Owner ke inbox mein bhej dega.
//  Trigger: Koi command nahi, yeh background mein khud chalta hai.
// ═══════════════════════════════════════════════════════════

// Owner JID nikalne ka robust function
function getOwnerJid() {
    try {
        const shapes = [
            config?.OWNER,
            config?.owner,
            config?.ownerNumber,
            config?.owner_number,
            config?.NUMBERS?.OWNER,
            config?.botNumber,
        ];
        for (const v of shapes) {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                const num = String(v).replace(/[^0-9]/g, "");
                if (num.length >= 10) return num + "@s.whatsapp.net";
            }
        }
    } catch (e) {}
    return "";
}

cmd({
    pattern: "autoviewonce_system", // Internal name, command list mein nahi dikhega
    on: "message", // Har incoming message ko scan karega (text, media, sab)
    dontAddCommandList: true,
    desc: "Auto forwards any view-once media to owner inbox automatically",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, sender, isGroup }) => {
    try {
        // 1. Check karein ke message View-Once hai ya nahi
        // (Yeh check multiple Baileys frameworks ke liye compatible hai)
        const mtype = message.mtype || message.type || (message.message ? Object.keys(message.message)[0] : "");
        const isViewOnce = message.viewOnce || 
                           message.msg?.viewOnce || 
                           mtype.includes('viewOnce') || 
                           mtype.includes('ViewOnce');

        // Agar view-once nahi hai, toh kuch mat karo (exit)
        if (!isViewOnce) return;

        // 2. Asli media type nikalna (image, video, ya audio)
        let actualMessage = message.message ? message.message : message;
        if (actualMessage.viewOnceMessage || actualMessage.viewOnceMessageV2) {
            actualMessage = actualMessage.viewOnceMessage?.message || actualMessage.viewOnceMessageV2?.message;
        }
        
        const mediaType = Object.keys(actualMessage)[0]; // 'imageMessage', 'videoMessage', 'audioMessage'
        
        // Sirf Pic, Video, Voice ko handle karein
        if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType)) return;

        // 3. Media ko download karein
        const buffer = await message.download();
        if (!buffer) return;

        // 4. Owner ka number set karein
        const ownerJid = getOwnerJid();
        if (!ownerJid) {
            console.log("[AUTO VIEW] ❌ Owner JID config mein nahi mila!");
            return;
        }

        // 5. Caption taiyar karein (taake owner ko pata chale ke yeh kahan se aaya)
        const senderName = message.pushName || "Unknown User";
        const locationInfo = isGroup ? `👥 Group: ${from}` : `👤 Private Chat: ${from}`;
        const time = new Date().toLocaleString();
        
        let caption = `⚠️ *AUTO VIEW-ONCE DETECTED* ⚠️\n\n`;
        caption += `👤 *Sender:* ${senderName}\n`;
        caption += `🔢 *Number:* ${sender ? '@' + sender.split('@')[0] : 'Unknown'}\n`;
        caption += `📍 *Location:* ${locationInfo}\n`;
        caption += `🕒 *Time:* ${time}\n\n`;
        caption += `_Yeh media original sender ke paas view-once thi, bot ne isay auto-save kiya hai._`;

        // 6. Owner ke inbox mein forward karein
        let content = {};
        if (mediaType === "imageMessage") {
            content = { image: buffer, caption: caption };
        } else if (mediaType === "videoMessage") {
            content = { video: buffer, caption: caption };
        } else if (mediaType === "audioMessage") {
            content = { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: actualMessage[mediaType].ptt || false // Voice note style
            };
        }

        // Message send karein
        await client.sendMessage(ownerJid, content);
        console.log(`[AUTO VIEW] ✅ View-once media successfully forwarded to Owner: ${ownerJid}`);

    } catch (err) {
        // Errors ko console mein dikhayein taake debugging asaan ho, lekin bot crash na ho
        console.error("[AUTO VIEW] ❌ Error processing view-once media:", err.message);
    }
});
