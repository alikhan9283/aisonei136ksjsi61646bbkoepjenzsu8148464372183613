const { cmd } = require("../command");
const config = require("../config");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW ONCE SYSTEM ⏩ (SILENT & AUTOMATIC)
//  ─────────────────────────────────────────────────────────
//  Yeh system fully automatic hai! 
//  Jab bhi koi Group ya Private chat mein View-Once media aayegi,
//  Bot khud ba khud usay download karke OWNER ke inbox par forward kar dega.
//  Kisi reply, emoji ya keyword ki zaroorat nahi!
// ═══════════════════════════════════════════════════════════

// Get owner inbox jid from config
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

// Main Auto Command
cmd({
    on: "message", // Har incoming message ko automatically check karega
    dontAddCommandList: true,
    desc: "Auto View-Once Media Forwarder (Silent)",
    category: "owner",
    filename: __filename
}, async (client, message, match, { from, isGroup, sender, pushname }) => {
    try {
        // Bot ke khud ke messages ko ignore karein
        if (message.fromMe) return;

        // Check if the message is a view-once message
        // Different frameworks handle this differently, so we check all common properties
        const isViewOnce = message.viewOnce || message.isViewOnce || 
                           (message.message && message.message.viewOnceMessage);
        
        if (!isViewOnce) return; // Agar view-once nahi hai toh yahi stop kar dein

        const ownerJid = getOwnerJid();
        if (!ownerJid) {
            console.error("[AUTO-VV] Owner JID not configured in config.js!");
            return;
        }

        // Extract the actual media message (Baileys structure)
        const innerMsg = message.message?.viewOnceMessage?.message || message.message || message;
        
        let buffer = null;
        let mediaType = message.mtype || ""; 
        let caption = message.text || message.body || "";
        let mimetype = "";
        let ptt = false;

        // 1. Try framework's built-in download method (like QueenAmdi/X-Asena/Vicious)
        if (typeof message.download === "function") {
            try {
                buffer = await message.download();
            } catch (e) {
                console.log("[AUTO-VV] Framework download failed, trying native...");
            }
        }
        
        // 2. Try Baileys native downloadMediaMessage
        if (!buffer && client.downloadMediaMessage) {
            try {
                buffer = await client.downloadMediaMessage(message.message?.viewOnceMessage || message);
            } catch (e) {}
        }

        // If still no buffer, we can't proceed
        if (!buffer || buffer.length === 0) {
            console.error("[AUTO-VV] Failed to download view-once media.");
            return;
        }

        // Identify media type if not already set
        if (!mediaType || mediaType === "viewOnceMessage") {
            if (innerMsg.imageMessage) mediaType = "imageMessage";
            else if (innerMsg.videoMessage) mediaType = "videoMessage";
            else if (innerMsg.audioMessage) mediaType = "audioMessage";
        }

        // Extract extra details (Caption, Mimetype)
        if (innerMsg.imageMessage) {
            caption = innerMsg.imageMessage.caption || "";
            mimetype = innerMsg.imageMessage.mimetype;
        } else if (innerMsg.videoMessage) {
            caption = innerMsg.videoMessage.caption || "";
            mimetype = innerMsg.videoMessage.mimetype;
        } else if (innerMsg.audioMessage) {
            mimetype = innerMsg.audioMessage.mimetype;
            ptt = innerMsg.audioMessage.ptt || false;
        }

        // Chat aur Sender ki details (Owner ko pata chale kisne bheji)
        const senderName = pushname || sender.split("@")[0];
        let chatName = "Private Chat";
        if (isGroup) {
            try {
                const groupMetadata = await client.groupMetadata(from);
                chatName = groupMetadata.subject;
            } catch (e) {
                chatName = "Group";
            }
        }

        const alertCaption = `🚨 *AUTO VIEW-ONCE ALERT* 🚨\n\n👤 *Sender:* ${senderName}\n💬 *Chat:* ${chatName}\n📝 *Original Caption:* ${caption || "No Caption"}`;

        // Content prepare karna
        let content = {};

        if (mediaType === "imageMessage" || mediaType.includes("image")) {
            content = { image: buffer, caption: alertCaption, mimetype: mimetype };
        } else if (mediaType === "videoMessage" || mediaType.includes("video")) {
            content = { video: buffer, caption: alertCaption, mimetype: mimetype };
        } else if (mediaType === "audioMessage" || mediaType.includes("audio")) {
            content = { audio: buffer, mimetype: mimetype || "audio/mp4", ptt: ptt };
        } else {
            // Unsupported media
            return;
        }

        // Forward to owner inbox silently (Sender ko koi notification nahi jayegi)
        await client.sendMessage(ownerJid, content);
        
        console.log(`[AUTO-VV] View-once media from ${senderName} forwarded to owner successfully.`);

    } catch (err) {
        console.error("[AUTO-VV] Error processing view-once:", err.message);
    }
});
