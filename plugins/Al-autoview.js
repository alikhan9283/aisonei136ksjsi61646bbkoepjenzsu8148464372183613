const { cmd } = require("../command");
const config = require("../config");

cmd({
    pattern: "autoview",
    on: "message",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, m, { from, isCreator }) => {
    try {
        // Sirf creator ke liye
        if (!isCreator) return;

        // View once check karna - multiple methods
        let isViewOnce = false;
        let mediaType = '';
        let buffer = null;

        // Method 1: Direct viewOnce property
        if (message.viewOnce === true) {
            isViewOnce = true;
        }

        // Method 2: Message type se
        const msgType = message.type || message.mtype;
        if (msgType && (msgType.includes('viewOnce') || msgType.includes('ViewOnce'))) {
            isViewOnce = true;
        }

        // Method 3: viewOnceMessage object se
        if (message.message?.viewOnceMessage || message.message?.viewOnceMessageV2) {
            isViewOnce = true;
            const viewOnceMsg = message.message.viewOnceMessage || message.message.viewOnceMessageV2;
            const innerMsg = viewOnceMsg.message || {};
            mediaType = Object.keys(innerMsg)[0];
        }

        if (!isViewOnce) return;

        // Media download karna
        try {
            buffer = await message.download();
        } catch (e) {
            console.log("Download error:", e);
            return;
        }

        if (!buffer) {
            console.log("No buffer received");
            return;
        }

        // Owner number lena
        let ownerNumber = '';
        if (config.OWNER) {
            ownerNumber = String(config.OWNER).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else if (config.ownerNumber) {
            ownerNumber = String(config.ownerNumber).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else if (config.owner) {
            ownerNumber = String(config.owner).replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!ownerNumber) {
            console.log("Owner number not found in config!");
            return;
        }

        // Media bhejna owner ko
        const caption = `🔥 *VIEW ONCE MEDIA SAVED*\n\n📍 From: ${from}\n👤 Sender: ${message.pushName || 'Unknown'}\n⏰ Time: ${new Date().toLocaleString()}`;

        if (mediaType === 'imageMessage' || msgType === 'imageMessage') {
            await client.sendMessage(ownerNumber, {
                image: buffer,
                caption: caption
            });
        } else if (mediaType === 'videoMessage' || msgType === 'videoMessage') {
            await client.sendMessage(ownerNumber, {
                video: buffer,
                caption: caption
            });
        } else if (mediaType === 'audioMessage' || msgType === 'audioMessage') {
            await client.sendMessage(ownerNumber, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true
            });
        }

        console.log("✅ View once media forwarded to owner:", ownerNumber);

    } catch (error) {
        console.error("❌ Auto View Error:", error);
    }
});
