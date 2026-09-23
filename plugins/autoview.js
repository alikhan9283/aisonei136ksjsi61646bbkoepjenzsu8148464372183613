const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");

const STATUS_FILE = path.join(__dirname, "../database/vvauto.json");

// Ensure status file exists
if (!fs.existsSync(STATUS_FILE)) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ enabled: false }, null, 2));
}

function getStatus() {
    try {
        const data = JSON.parse(fs.readFileSync(STATUS_FILE));
        return data.enabled === true;
    } catch {
        return false;
    }
}

function setStatus(value) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ enabled: value }, null, 2));
}

cmd({
    pattern: "vvauto",
    alias: ["autovv", "vvon", "vvoff"],
    desc: "View-Once Auto Forward System ON/OFF",
    category: "owner",
    filename: __filename,
    react: "⚙️"
}, async (client, message, match, { from, isCreator, args, reply }) => {
    if (!isCreator) return reply("❌ Ye command sirf owner ke liye hai.");

    const option = (args[0] || "").toLowerCase();

    if (option === "on" || option === "enable" || option === "1") {
        setStatus(true);
        return reply("✅ *VV Auto System ON* ho gaya.\n\nAb koi bhi view-once message (group ya private) aayega to automatically aapke private inbox mein bhej diya jayega.");
    }

    if (option === "off" || option === "disable" || option === "0") {
        setStatus(false);
        return reply("❌ *VV Auto System OFF* kar diya gaya.");
    }

    // Status check
    const current = getStatus();
    return reply(
        `*VV Auto System Status*\n\n` +
        `Current: ${current ? "✅ ON" : "❌ OFF"}\n\n` +
        `Usage:\n` +
        `• .vvauto on\n` +
        `• .vvauto off`
    );
});
