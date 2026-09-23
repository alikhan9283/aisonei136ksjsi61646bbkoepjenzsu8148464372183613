const { cmd } = require("../command");
const config = require("../config");
const fs = require("fs");
const path = require("path");

const STATUS_FILE = path.join(__dirname, "../database/vvauto.json");

function isAutoEnabled() {
    try {
        if (!fs.existsSync(STATUS_FILE)) return false;
        const data = JSON.parse(fs.readFileSync(STATUS_FILE));
        return data.enabled === true;
    } catch {
        return false;
    }
}

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
    pattern: "vvauto-handler",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, message, match, { from, isGroup }) => {
    try {
        // Auto system off hai to kuch mat karo
        if (!isAutoEnabled()) return;

        // Quoted message nahi hai to skip
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage 
                    || message.message?.imageMessage 
                    || message.message?.videoMessage 
                    || message.message?.audioMessage;

        // Better way for viewOnce detection
        const msg = message.message;
        if (!msg) return;

        // Check if this message itself is viewOnce
        const isViewOnce = 
            msg.viewOnceMessage || 
            msg.viewOnceMessageV2 || 
            msg.viewOnceMessageV2Extension ||
            (msg.imageMessage?.viewOnce) ||
            (msg.videoMessage?.viewOnce) ||
            (msg.audioMessage?.viewOnce);

        if (!isViewOnce) return;

        // Download media
        let buffer;
        let mtype = "";
        let caption = "";

        if (msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension) {
            const inner = msg.viewOnceMessage?.message || 
                          msg.viewOnceMessageV2?.message || 
                          msg.viewOnceMessageV2Extension?.message;

            if (inner?.imageMessage) {
                mtype = "image";
                caption = inner.imageMessage.caption || "";
                buffer = await client.downloadMediaMessage({ message: inner });
            } else if (inner?.videoMessage) {
                mtype = "video";
                caption = inner.videoMessage.caption || "";
                buffer = await client.downloadMediaMessage({ message: inner });
            } else if (inner?.audioMessage) {
                mtype = "audio";
                buffer = await client.downloadMediaMessage({ message: inner });
            }
        } 
        else if (msg.imageMessage?.viewOnce) {
            mtype = "image";
            caption = msg.imageMessage.caption || "";
            buffer = await client.downloadMediaMessage(message);
        }
        else if (msg.videoMessage?.viewOnce) {
            mtype = "video";
            caption = msg.videoMessage.caption || "";
            buffer = await client.downloadMediaMessage(message);
        }
        else if (msg.audioMessage?.viewOnce) {
            mtype = "audio";
            buffer = await client.downloadMediaMessage(message);
        }

        if (!buffer) return;

        // Prepare content
        let content = {};
        if (mtype === "image") {
            content = { image: buffer, caption: caption || "🔓 Auto View-Once" };
        } else if (mtype === "video") {
            content = { video: buffer, caption: caption || "🔓 Auto View-Once" };
        } else if (mtype === "audio") {
            content = { audio: buffer, mimetype: "audio/mp4", ptt: true };
        } else {
            return;
        }

        // Send to owner
        const ownerJid = getOwnerJid();
        if (!ownerJid) return;

        const fromInfo = isGroup ? `Group: ${from}` : `Private: ${from}`;
        
        await client.sendMessage(ownerJid, content);
        
        // Optional: notify with source
        await client.sendMessage(ownerJid, {
            text: `📥 *Auto View-Once Received*\n\nFrom: ${fromInfo}\nType: ${mtype}`
        });

        console.log("[VV-AUTO] View-once forwarded to owner from:", from);

    } catch (err) {
        console.error("VV-AUTO Error:", err);
    }
});
