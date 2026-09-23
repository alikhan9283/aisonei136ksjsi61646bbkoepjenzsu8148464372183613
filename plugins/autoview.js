const config = require('../config');
const { cmd } = require('../command');
const fs = require('fs');
const path = './autovv_status.json';

// Baileys download helper (SARWAR-MD / most MD bots mein available)
let downloadMediaMessage;
try {
    downloadMediaMessage = require('@whiskeysockets/baileys').downloadMediaMessage;
} catch (e) {
    try {
        downloadMediaMessage = require('baileys').downloadMediaMessage;
    } catch (e2) {
        downloadMediaMessage = null;
    }
}

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
    const clean = String(sender).replace(/[^0-9]/g, '');
    const list = [];

    if (config.OWNER_NUMBER) list.push(String(config.OWNER_NUMBER).replace(/[^0-9]/g, ''));
    if (config.DEV) list.push(String(config.DEV).replace(/[^0-9]/g, ''));
    if (config.OWNER) list.push(String(config.OWNER).replace(/[^0-9]/g, ''));

    return list.some(num => num && (clean === num || clean.endsWith(num) || num.endsWith(clean)));
}

// ================= UNWRAP VIEW ONCE =================
function unwrapViewOnce(msg) {
    if (!msg) return null;

    // Direct wrappers
    if (msg.viewOnceMessage?.message) return msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) return msg.viewOnceMessageV2.message;
    if (msg.viewOnceMessageV2Extension?.message) return msg.viewOnceMessageV2Extension.message;

    // Ephemeral + view once
    if (msg.ephemeralMessage?.message) {
        const e = msg.ephemeralMessage.message;
        if (e.viewOnceMessage?.message) return e.viewOnceMessage.message;
        if (e.viewOnceMessageV2?.message) return e.viewOnceMessageV2.message;
        if (e.viewOnceMessageV2Extension?.message) return e.viewOnceMessageV2Extension.message;
    }

    // Inner media already has viewOnce: true (common on linked devices)
    if (msg.imageMessage?.viewOnce) return { imageMessage: msg.imageMessage };
    if (msg.videoMessage?.viewOnce) return { videoMessage: msg.videoMessage };
    if (msg.audioMessage?.viewOnce) return { audioMessage: msg.audioMessage };

    return null;
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
        if (mek.key?.fromMe) return;

        const rawMsg = mek.message || m.message || {};
        const viewOnceContent = unwrapViewOnce(rawMsg);

        // Also check framework helpers (same style as working vv2)
        const isViewOnceFlag = m.viewOnce === true || m.msg?.viewOnce === true || mek.key?.isViewOnce === true;

        if (!viewOnceContent && !isViewOnceFlag) return;

        // Detect media type
        let mediaType = null;
        let mediaNode = null;

        if (viewOnceContent) {
            if (viewOnceContent.imageMessage) {
                mediaType = "imageMessage";
                mediaNode = viewOnceContent.imageMessage;
            } else if (viewOnceContent.videoMessage) {
                mediaType = "videoMessage";
                mediaNode = viewOnceContent.videoMessage;
            } else if (viewOnceContent.audioMessage) {
                mediaType = "audioMessage";
                mediaNode = viewOnceContent.audioMessage;
            }
        }

        // Fallback: framework mtype (vv2 style)
        if (!mediaType && m.mtype) {
            if (["imageMessage", "videoMessage", "audioMessage"].includes(m.mtype)) {
                mediaType = m.mtype;
            }
        }

        if (!mediaType) {
            console.log("[AutoVV] ViewOnce detected but no media type found");
            return;
        }

        console.log("[AutoVV] Detected view-once:", mediaType, "from", sender);

        // -------- DOWNLOAD (multiple methods) --------
        let buffer = null;

        // Method 1: same as working vv2
        try {
            if (typeof m.download === "function") {
                buffer = await m.download();
            }
        } catch (e) {
            console.log("[AutoVV] m.download failed:", e.message);
        }

        // Method 2: Baileys downloadMediaMessage
        if ((!buffer || buffer.length < 50) && downloadMediaMessage) {
            try {
                // Reconstruct proper message for download
                const msgForDownload = {
                    key: mek.key,
                    message: viewOnceContent || rawMsg
                };
                buffer = await downloadMediaMessage(
                    msgForDownload,
                    "buffer",
                    {},
                    { reuploadRequest: conn.updateMediaMessage || conn }
                );
            } catch (e) {
                console.log("[AutoVV] downloadMediaMessage failed:", e.message);
            }
        }

        // Method 3: conn.downloadMediaMessage
        if ((!buffer || buffer.length < 50) && typeof conn.downloadMediaMessage === "function") {
            try {
                buffer = await conn.downloadMediaMessage(mek);
            } catch (e) {
                console.log("[AutoVV] conn.downloadMediaMessage failed:", e.message);
            }
        }

        if (!buffer || buffer.length < 50) {
            console.log("[AutoVV] ❌ Download failed - empty buffer");
            return;
        }

        console.log("[AutoVV] ✅ Downloaded, size:", buffer.length);

        // -------- OWNER JID --------
        const ownerNum = String(config.OWNER_NUMBER || config.DEV || "").replace(/[^0-9]/g, "");
        if (!ownerNum) {
            console.log("[AutoVV] OWNER_NUMBER missing in config");
            return;
        }
        const ownerJid = ownerNum + "@s.whatsapp.net";

        // -------- CAPTION --------
        const name = m.pushName || mek.pushName || "Unknown";
        const number = String(sender).split("@")[0];
        const place = isGroup ? "Group" : "Private";
        const time = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

        const caption = `⚠️ *AUTO VIEW-ONCE SAVED*\n\n👤 *Sender:* ${name}\n🔢 *Number:* @${number}\n📍 *Chat:* ${place}\n⏰ *Time:* ${time}\n\n_Auto forwarded by SARWAR-MD_`;

        // -------- SEND (same as vv2) --------
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
            const isPtt = mediaNode?.ptt || false;
            await conn.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: mediaNode?.mimetype || "audio/mp4",
                ptt: isPtt
            });
            await conn.sendMessage(ownerJid, {
                text: caption,
                mentions: [sender]
            });
            console.log("[AutoVV] ✅ Audio sent to owner");
        }

    } catch (err) {
        console.error("[AutoVV Listener Error]:", err);
    }
});
