const config = require('../config');
const { cmd } = require('../command');
const fs = require('fs');
const path = './autovv_status.json';

// ================= STATUS =================
let autoViewStatus = false;
if (fs.existsSync(path)) {
    try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        autoViewStatus = data.status === true;
    } catch (e) {
        autoViewStatus = false;
    }
}

// ================= OWNER CHECK =================
function isOwner(sender) {
    if (!sender) return false;
    const clean = sender.replace(/[^0-9]/g, '');
    const list = [];

    if (config.OWNER_NUMBER) list.push(String(config.OWNER_NUMBER).replace(/[^0-9]/g, ''));
    if (config.DEV) list.push(String(config.DEV).replace(/[^0-9]/g, ''));
    if (config.OWNER) list.push(String(config.OWNER).replace(/[^0-9]/g, ''));

    return list.some(num => num && (clean === num || clean.endsWith(num) || num.endsWith(clean)));
}

// ================= COMMAND =================
cmd({
    pattern: "autovv",
    alias: ["autoview", "vv", "viewonce"],
    react: "👁️",
    desc: "Auto forward view-once media to owner",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { from, sender, args }) => {
    try {
        if (!isOwner(sender)) {
            return await conn.sendMessage(from, {
                text: "❌ *Yeh command sirf Owner use kar sakta hai!*"
            }, { quoted: mek });
        }

        const action = (args[0] || "").toLowerCase().trim();

        if (action === "on") {
            autoViewStatus = true;
            fs.writeFileSync(path, JSON.stringify({ status: true }, null, 2));
            return await conn.sendMessage(from, {
                text: "✅ *Auto View-Once Forwarder is now ON!*\n\nAb koi bhi view-once media bhejega, wo seedha aapke inbox mein aa jayegi."
            }, { quoted: mek });
        }

        if (action === "off") {
            autoViewStatus = false;
            fs.writeFileSync(path, JSON.stringify({ status: false }, null, 2));
            return await conn.sendMessage(from, {
                text: "❌ *Auto View-Once Forwarder is now OFF!*"
            }, { quoted: mek });
        }

        return await conn.sendMessage(from, {
            text: `*Current Status:* ${autoViewStatus ? "ON ✅" : "OFF ❌"}\n\n*Usage:*\n.autovv on\n.autovv off`
        }, { quoted: mek });

    } catch (err) {
        console.error("[AutoVV Cmd Error]", err);
        await conn.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: mek });
    }
});

// ================= AUTO LISTENER =================
cmd({
    on: "message",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup }) => {
    try {
        if (!autoViewStatus) return;
        if (!sender || isOwner(sender)) return;

        // -------- View Once detect (multiple ways) --------
        const msg = mek.message || {};
        let viewOnceContent = null;
        let mediaType = null;

        // Method 1: direct viewOnceMessage
        if (msg.viewOnceMessage?.message) {
            viewOnceContent = msg.viewOnceMessage.message;
        }
        // Method 2: viewOnceMessageV2
        else if (msg.viewOnceMessageV2?.message) {
            viewOnceContent = msg.viewOnceMessageV2.message;
        }
        // Method 3: viewOnceMessageV2Extension
        else if (msg.viewOnceMessageV2Extension?.message) {
            viewOnceContent = msg.viewOnceMessageV2Extension.message;
        }
        // Method 4: ephemeral + view once
        else if (msg.ephemeralMessage?.message?.viewOnceMessage?.message) {
            viewOnceContent = msg.ephemeralMessage.message.viewOnceMessage.message;
        }
        else if (msg.ephemeralMessage?.message?.viewOnceMessageV2?.message) {
            viewOnceContent = msg.ephemeralMessage.message.viewOnceMessageV2.message;
        }

        if (!viewOnceContent) return;

        mediaType = Object.keys(viewOnceContent)[0];
        if (!["imageMessage", "videoMessage", "audioMessage"].includes(mediaType)) return;

        // -------- Download (same style as working vv2) --------
        let buffer = null;

        try {
            // Prefer m.download if available (same as vv2)
            if (typeof m.download === "function") {
                buffer = await m.download();
            }
            // Fallback
            else if (conn.downloadMediaMessage) {
                buffer = await conn.downloadMediaMessage(mek);
            }
            // Last fallback - try quoted style if framework supports
            else if (m.msg && typeof m.msg.download === "function") {
                buffer = await m.msg.download();
            }
        } catch (e) {
            console.log("[AutoVV] Download error:", e.message);
            return;
        }

        if (!buffer || buffer.length < 100) {
            console.log("[AutoVV] Empty or small buffer");
            return;
        }

        // -------- Owner JID --------
        const ownerNum = String(config.OWNER_NUMBER || config.DEV || "").replace(/[^0-9]/g, "");
        if (!ownerNum) {
            console.log("[AutoVV] OWNER_NUMBER missing");
            return;
        }
        const ownerJid = ownerNum + "@s.whatsapp.net";

        // -------- Caption --------
        const name = m.pushName || mek.pushName || "Unknown";
        const number = sender.split("@")[0];
        const place = isGroup ? "Group" : "Private";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

        const caption = `⚠️ *AUTO VIEW-ONCE SAVED*\n\n👤 *Sender:* ${name}\n🔢 *Number:* @${number}\n📍 *Chat:* ${place}\n⏰ *Time:* ${time}\n\n_Auto forwarded by SARWAR-MD_`;

        // -------- Send (same style as vv2) --------
        if (mediaType === "imageMessage") {
            await conn.sendMessage(ownerJid, {
                image: buffer,
                caption: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Image sent to owner");
        }
        else if (mediaType === "videoMessage") {
            await conn.sendMessage(ownerJid, {
                video: buffer,
                caption: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Video sent to owner");
        }
        else if (mediaType === "audioMessage") {
            const isPtt = viewOnceContent.audioMessage?.ptt || false;
            await conn.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: viewOnceContent.audioMessage?.mimetype || "audio/mp4",
                ptt: isPtt
            });
            await conn.sendMessage(ownerJid, {
                text: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Audio sent to owner");
        }

    } catch (err) {
        console.error("[AutoVV Listener Error]:", err.message);
    }
});
