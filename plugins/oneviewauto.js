const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE SYSTEM (SILENT FORWARD TO OWNER)
//  Jab bhi koi view-once photo/video/voice aaye (group ya private)
//  → Automatic download + Owner inbox mein forward
//  Koi prefix, reply, ya trigger word ki zaroorat nahi!
// ═══════════════════════════════════════════════════════════

// Owner number config se lo
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
    } catch (e) {
        console.error("[AUTO-VV] Error getting owner JID:", e);
    }
    return "";
}

// Auto-forward logic
async function autoForwardViewOnce(client, m, reply) {
    try {
        // Bot ke khud ke messages ignore karo
        if (m.fromMe) return;
        
        // Check karo view-once hai ya nahi
        if (!m.viewOnce && !m.message?.viewOnceMessage) return;
        
        const ownerJid = getOwnerJid();
        if (!ownerJid) {
            console.error("[AUTO-VV] Owner number not configured!");
            return;
        }
        
        // View-once message extract karo
        const viewOnceMsg = m.message?.viewOnceMessage?.message || m.message;
        if (!viewOnceMsg) return;
        
        let buffer = null;
        let mediaType = m.mtype || "";
        let caption = m.text || "";
        
        // Download karo
        if (typeof m.download === "function") {
            buffer = await m.download();
        } else if (m.quoted?.download) {
            buffer = await m.quoted.download();
        }
        
        if (!buffer || buffer.length === 0) {
            console.error("[AUTO-VV] Download failed");
            return;
        }
        
        // Media type identify karo
        if (!mediaType || mediaType === "viewOnceMessage") {
            if (viewOnceMsg.imageMessage) mediaType = "imageMessage";
            else if (viewOnceMsg.videoMessage) mediaType = "videoMessage";
            else if (viewOnceMsg.audioMessage) mediaType = "audioMessage";
        }
        
        // Caption extract karo
        if (viewOnceMsg.imageMessage?.caption) caption = viewOnceMsg.imageMessage.caption;
        else if (viewOnceMsg.videoMessage?.caption) caption = viewOnceMsg.videoMessage.caption;
        
        // Sender aur chat info
        const senderName = m.pushName || m.sender.split("@")[0];
        let chatName = "Private Chat";
        const isGroup = m.chat?.endsWith("@g.us") || false;
        if (isGroup) {
            try {
                const groupMeta = await client.groupMetadata(m.chat);
                chatName = groupMeta.subject;
            } catch (e) {
                chatName = "Group";
            }
        }
        
        const alertText = `🚨 *AUTO VIEW-ONCE CAPTURE* 🚨\n\n👤 *Sender:* ${senderName}\n💬 *Chat:* ${chatName}\n📝 *Caption:* ${caption || "No caption"}`;
        
        // Content prepare karo
        let content = {};
        
        if (mediaType === "imageMessage") {
            content = {
                image: buffer,
                caption: alertText,
                mimetype: viewOnceMsg.imageMessage?.mimetype || "image/jpeg"
            };
        } 
        else if (mediaType === "videoMessage") {
            content = {
                video: buffer,
                caption: alertText,
                mimetype: viewOnceMsg.videoMessage?.mimetype || "video/mp4"
            };
        } 
        else if (mediaType === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: viewOnceMsg.audioMessage?.mimetype || "audio/mp4",
                ptt: viewOnceMsg.audioMessage?.ptt || false
            };
        } 
        else {
            console.error("[AUTO-VV] Unsupported media type");
            return;
        }
        
        // Owner inbox mein forward karo (silent - sender ko pata nahi chalega)
        await client.sendMessage(ownerJid, content);
        
        console.log(`[AUTO-VV] ✅ View-once ${mediaType} from ${senderName} forwarded to owner`);
        
    } catch (err) {
        console.error("[AUTO-VV] Error:", err.message);
    }
}

// Main auto command - har message ko check karega
cmd({
    on: "message",
    dontAddCommandList: true,
    desc: "Auto view-once forwarder (silent)",
    category: "owner",
    filename: __filename
}, async (client, m, store, extra) => {
    try {
        await autoForwardViewOnce(client, m, extra.reply);
    } catch (e) {
        console.error("[AUTO-VV] Fatal error:", e);
    }
});

// Fallback command - agar on: "message" kaam na kare
cmd({
    pattern: "autovv",
    alias: ["autoview", "avv"],
    desc: "Auto view-once system status & control",
    category: "owner",
    filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return;
        
        const ownerJid = getOwnerJid();
        
        reply(`🤖 *AUTO VIEW-ONCE SYSTEM*\n\n✅ System Active\n📍 Owner Inbox: ${ownerJid || "❌ Not Set"}\n\nAb koi bhi view-once photo/video/voice automatic owner inbox mein forward hogi!\n\nNote: Agar auto forward na ho raha ho to bot restart karein.`);
        
    } catch (err) {
        console.error("[AUTO-VV] Status command error:", err);
        reply("❌ Error checking status");
    }
});
