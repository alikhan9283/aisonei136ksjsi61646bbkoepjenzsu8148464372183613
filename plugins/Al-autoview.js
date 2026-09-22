const { cmd } = require("../command");
const config = require("../config");

cmd({
    pattern: "autoview",
    on: "message",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, m, { from, isCreator, sender }) => {
    try {
        // Debug logging
        console.log("[AUTOVIEW] Message received:", {
            type: message.type || message.mtype,
            viewOnce: message.viewOnce,
            hasMessage: !!message.message
        });

        // Sirf creator ke liye
        if (!isCreator) {
            console.log("[AUTOVIEW] Not creator, ignoring");
            return;
        }

        // View once check karna - multiple methods
        let isViewOnce = false;
        let mediaType = '';
        let buffer = null;
        let actualMessage = message;

        // Method 1: Direct viewOnce property
        if (message.viewOnce === true) {
            isViewOnce = true;
            mediaType = message.type || message.mtype || 'unknown';
        }

        // Method 2: viewOnceMessage object se (Baileys standard)
        if (message.message?.viewOnceMessage || message.message?.viewOnceMessageV2 || message.message?.viewOnceMessageV2Extension) {
            isViewOnce = true;
            const viewOnceMsg = message.message.viewOnceMessage || 
                               message.message.viewOnceMessageV2 || 
                               message.message.viewOnceMessageV2Extension;
            
            const innerMsg = viewOnceMsg.message || {};
            mediaType = Object.keys(innerMsg)[0];
            actualMessage = innerMsg[mediaType];
            
            console.log("[AUTOVIEW] Detected viewOnceMessage, type:", mediaType);
        }

        // Method 3: Message type se
        const msgType = message.type || message.mtype;
        if (msgType && (msgType.toLowerCase().includes('viewonce'))) {
            isViewOnce = true;
            if (!mediaType) mediaType = msgType;
        }

        // Agar view-once nahi hai to exit
        if (!isViewOnce) {
            return;
        }

        console.log("[AUTOVIEW] ✓ View-once detected, downloading...");

        // Media download karna
        try {
            buffer = await message.download();
        } catch (e) {
            console.error("[AUTOVIEW] Download error:", e.message);
            return;
        }

        if (!buffer || buffer.length === 0) {
            console.error("[AUTOVIEW] No buffer received or empty buffer");
            return;
        }

        console.log("[AUTOVIEW] ✓ Downloaded successfully, size:", buffer.length);

        // Owner number lena - multiple fallback options
        let ownerNumber = '';
        const ownerConfigs = [
            config.OWNER,
            config.ownerNumber,
            config.owner,
            config.NUMBERS?.OWNER,
            config.botNumber
        ];

        for (const owner of ownerConfigs) {
            if (owner) {
                const cleaned = String(owner).replace(/[^0-9]/g, '');
                if (cleaned.length >= 10) {
                    ownerNumber = cleaned + '@s.whatsapp.net';
                    break;
                }
            }
        }

        if (!ownerNumber) {
            console.error("[AUTOVIEW] Owner number not found in config!");
            console.log("[AUTOVIEW] Available config keys:", Object.keys(config));
            return;
        }

        console.log("[AUTOVIEW] Forwarding to owner:", ownerNumber);

        // Caption taiyar karna
        const senderName = message.pushName || sender?.pushName || 'Unknown';
        const chatInfo = from.includes('@g.us') ? `Group: ${from}` : `Private: ${from}`;
        const time = new Date().toLocaleString();
        
        const caption = `🔥 *VIEW ONCE MEDIA SAVED*\n\n📍 From: ${chatInfo}\n👤 Sender: ${senderName}\n🔢 Number: ${sender ? '@' + sender.split('@')[0] : 'Unknown'}\n⏰ Time: ${time}\n\n_Auto-forwarded by SARWAR-MD Bot_`;

        // Media type ke according bhejna
        let sent = false;
        
        if (mediaType === 'imageMessage' || msgType === 'imageMessage') {
            await client.sendMessage(ownerNumber, {
                image: buffer,
                caption: caption
            });
            sent = true;
            console.log("[AUTOVIEW] ✓ Image sent to owner");
        } 
        else if (mediaType === 'videoMessage' || msgType === 'videoMessage') {
            await client.sendMessage(ownerNumber, {
                video: buffer,
                caption: caption
            });
            sent = true;
            console.log("[AUTOVIEW] ✓ Video sent to owner");
        } 
        else if (mediaType === 'audioMessage' || msgType === 'audioMessage') {
            await client.sendMessage(ownerNumber, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: actualMessage?.ptt || true
            });
            sent = true;
            console.log("[AUTOVIEW] ✓ Audio sent to owner");
        }

        if (!sent) {
            console.log("[AUTOVIEW] Unsupported media type:", mediaType || msgType);
        }

    } catch (error) {
        console.error("❌ [AUTOVIEW] Error:", error);
        console.error("[AUTOVIEW] Stack:", error.stack);
    }
});
