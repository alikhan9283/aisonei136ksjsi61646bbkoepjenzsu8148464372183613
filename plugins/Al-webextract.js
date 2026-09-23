const { cmd } = require("../command");
const config = require("../config");

cmd({
    pattern: "autoview",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, sender, isCreator, isGroup }) => {
    try {
        // Owner check
        const myNumber = config.OWNER || config.ownerNumber || config.owner;
        const ownerJid = myNumber ? myNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;
        
        if (!ownerJid) return;

        // View-Once Detection (SARWAR-MD Compatible)
        const quoted = message.quoted || message.msg?.contextInfo?.quotedMessage;
        const isViewOnce = quoted?.viewOnce || 
                          quoted?.viewOnceMessage || 
                          quoted?.viewOnceMessageV2 ||
                          message.message?.viewOnceMessage ||
                          message.message?.viewOnceMessageV2;

        if (!isViewOnce && !quoted) return;

        // Media Download
        let buffer;
        try {
            buffer = await quoted.download();
        } catch (e) {
            return;
        }
        
        if (!buffer || buffer.length === 0) return;

        // Media Type
        const mtype = quoted.mtype || 
                     Object.keys(quoted.message || {})[0]?.replace('Message', '') || 
                     'unknown';

        // Caption
        const senderName = message.pushName || quoted.pushName || "Unknown";
        const caption = `⚠️ *AUTO VIEW-ONCE SAVED*\n\n👤 *Sender:* ${senderName}\n *From:* ${isGroup ? 'Group' : 'Private'}\n *Time:* ${new Date().toLocaleString()}`;

        // Forward to Owner
        if (mtype === 'image' || mtype === 'imageMessage') {
            await client.sendMessage(ownerJid, { image: buffer, caption: caption });
            console.log("[AutoView] Image forwarded");
        } 
        else if (mtype === 'video' || mtype === 'videoMessage') {
            await client.sendMessage(ownerJid, { video: buffer, caption: caption });
            console.log("[AutoView] Video forwarded");
        } 
        else if (mtype === 'audio' || mtype === 'audioMessage') {
            await client.sendMessage(ownerJid, { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: quoted.ptt || true 
            });
            console.log("[AutoView] Audio forwarded");
        }

    } catch (error) {
        console.error("[AutoView] Error:", error.message);
    }
});
