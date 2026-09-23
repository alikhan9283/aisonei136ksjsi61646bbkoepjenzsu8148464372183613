const { cmd } = require("../command");
const config = require("../config");
const fs = require("fs");

// Status file path
const statusFile = "./data/autovv_status.json";

// Status load karna
function getStatus() {
    try {
        if (fs.existsSync(statusFile)) {
            const data = JSON.parse(fs.readFileSync(statusFile));
            return data.status === true;
        }
    } catch (e) {}
    return false;
}

// Status save karna
function setStatus(status) {
    try {
        if (!fs.existsSync("./data")) {
            fs.mkdirSync("./data");
        }
        fs.writeFileSync(statusFile, JSON.stringify({ status: status }));
    } catch (e) {
        console.log("Status save error:", e);
    }
}

// ══════════════════════════════════════════════════════════
//  COMMAND: .autovv on / .autovv off
// ══════════════════════════════════════════════════════════
cmd({
    pattern: "autovv",
    alias: ["autoview", "vvon", "vvoff"],
    react: "👁️",
    desc: "Auto View-Once ON/OFF",
    category: "owner",
    filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("*📛 Yeh command sirf Owner use kar sakta hai!*");

        const match = m.body ? m.body.split(" ").slice(1).join(" ").trim().toLowerCase() : "";

        if (match === "on") {
            setStatus(true);
            return reply("✅ *Auto View-Once Forwarder is now ON!*\n\nAb koi bhi view-once media bhejega, toh wo seedha aapke inbox mein aa jayegi.");
        } 
        else if (match === "off") {
            setStatus(false);
            return reply("❌ *Auto View-Once Forwarder is now OFF!*");
        } 
        else {
            const currentStatus = getStatus();
            return reply(`*Current Status:* ${currentStatus ? "ON ✅" : "OFF ❌"}\n\n*Usage:*\n.autovv on\n.autovv off`);
        }
    } catch (error) {
        console.error("[AutoVV Command Error]:", error);
        reply("❌ *Error:* " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════
//  COMMAND: .vv (Manual - Reply to view-once message)
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve"],
    react: "🐳",
    desc: "Owner Only - retrieve view once message",
    category: "owner",
    filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("*📛 This is an owner command.*");

        if (!m.quoted) {
            return reply("*🍁 Please reply to a view-once image / video / audio!*");
        }

        const quoted = m.quoted;

        // Check if it's view-once
        if (!quoted.viewOnce) {
            return reply("❌ This message is not a view-once message.");
        }

        const buffer = await quoted.download();
        if (!buffer) return reply("❌ Failed to download message.");

        let content = {};

        if (quoted.mtype === "imageMessage") {
            content = {
                image: buffer,
                caption: quoted.text || "",
                mimetype: quoted.mimetype || "image/jpeg"
            };
        } 
        else if (quoted.mtype === "videoMessage") {
            content = {
                video: buffer,
                caption: quoted.text || "",
                mimetype: quoted.mimetype || "video/mp4"
            };
        } 
        else if (quoted.mtype === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: quoted.ptt || false
            };
        } 
        else {
            return reply("❌ Only image, video, and audio messages are supported.");
        }

        await client.sendMessage(from, content, { quoted: m });
        console.log("[VV] ✅ View-once retrieved successfully");

    } catch (error) {
        console.error("vv Error:", error);
        reply("❌ Error fetching view-once message.");
    }
});

// ═══════════════════════════════════════════════════════════
//  COMMAND: .vv2 (Emoji Reply - Auto forward to owner)
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "vv2",
    alias: ["wah", "", "❤️", "✌️", "nice", "ok"],
    react: "👀",
    desc: "Owner Only - view once media goes to owner inbox",
    category: "owner",
    filename: __filename
}, async (client, m, store, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return;
        if (!m.quoted) return;

        const quoted = m.quoted;
        if (!quoted.viewOnce) return;

        const buffer = await quoted.download();
        if (!buffer) return;

        let content = {};

        if (quoted.mtype === "imageMessage") {
            content = {
                image: buffer,
                caption: quoted.text || ""
            };
        } 
        else if (quoted.mtype === "videoMessage") {
            content = {
                video: buffer,
                caption: quoted.text || ""
            };
        } 
        else if (quoted.mtype === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: quoted.ptt || false
            };
        } 
        else {
            return;
        }

        // Owner ke inbox mein bhejo
        const ownerNumber = config.OWNER || config.owner || config.ownerNumber || config.owner_number;
        const ownerJid = ownerNumber ? ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : from;
        
        await client.sendMessage(ownerJid, content, { quoted: m });
        console.log("[VV2] ✅ View-once forwarded to owner inbox");

    } catch (err) {
        console.error("VV2 Error:", err);
    }
});
