const { cmd, commands } = require("../command");
const config = require("../config");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { runtime } = require("../lib/functions");

// Helper function for small caps text
const toSmallCaps = (text) => {
    if (!text || typeof text !== "string") return "";
    const smallCapsMap = {
        a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
        j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
        s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
        A: "ᴀ", B: "ʙ", C: "ᴄ", D: "ᴅ", E: "ᴇ", F: "ғ", G: "ɢ", H: "ʜ", I: "ɪ",
        J: "ᴊ", K: "ᴋ", L: "ʟ", M: "ᴍ", N: "ɴ", O: "ᴏ", P: "ᴘ", Q: "ǫ", R: "ʀ",
        S: "s", T: "ᴛ", U: "ᴜ", V: "ᴠ", W: "ᴡ", X: "x", Y: "ʏ", Z: "ᴢ",
    };
    return text.split("").map((char) => smallCapsMap[char] || char).join("");
};

// Format category with sidebar design
const formatCategory = (category, cmds) => {
    const validCmds = cmds.filter((c) => c.pattern && c.pattern.trim() !== "");
    if (validCmds.length === 0) return "";

    let title = `\n▰▰▰❰ ${toSmallCaps(category.toUpperCase())} ❱▰▰▰\n║\n`;
    let body = validCmds
        .map((c) => `➤ ─ ${toSmallCaps(c.pattern || "")}`)
        .join("\n");
    let footer = `\n➤\n▰▰▰▰▰▰▰▰▰▰▰▰▰`;
    return `${title}${body}${footer}`;
};

// Validate and fetch a remote menu image, falling back gracefully if it
// isn't reachable or isn't actually an image.
const validateAndFetchImage = async (url) => {
    if (!url || typeof url !== "string" || url.trim() === "") {
        return { valid: false };
    }
    try {
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(url.trim())) return { valid: false };

        const response = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 5,
            responseType: "arraybuffer",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "image/*,*/*",
            },
            validateStatus: (status) => status < 400,
        });

        const contentType = response.headers["content-type"];
        if (contentType && contentType.startsWith("image/")) {
            return { valid: true, buffer: Buffer.from(response.data), contentType };
        }
        return { valid: false };
    } catch (error) {
        console.log("Image validation failed:", error.message);
        return { valid: false };
    }
};

cmd({
    pattern: "menu",
    alias: ["m", "help", "allmenu", "fullmenu"],
    use: ".menu",
    desc: "Show all bot commands",
    category: "main",
    react: "⚡",
    filename: __filename,
}, async (client, message, match, { from, reply }) => {
    try {
        await client.sendPresenceUpdate("composing", message.chat);

        const totalCommands = Object.keys(commands).length;

        const categories = [...new Set(Object.values(commands).map((c) => c.category))].filter(
            (cat) => cat && cat.trim() !== "" && cat !== "undefined"
        );

        const categorized = {};
        categories.forEach((cat) => {
            const categoryCommands = Object.values(commands).filter((c) => c.category === cat);
            const validCommands = categoryCommands.filter((c) => c.pattern && c.pattern.trim() !== "");
            if (validCommands.length > 0) categorized[cat] = validCommands;
        });

        let menuSections = "";
        for (const [category, cmds] of Object.entries(categorized)) {
            if (cmds && cmds.length > 0) {
                const section = formatCategory(category, cmds);
                if (section !== "") menuSections += section;
            }
        }

        const BOT_NAME = config.BOT_NAME || "SARWAR-MD";
        const OWNER_NAME = config.OWNER_NAME || "Owner";
        const PREFIX = config.PREFIX || ".";
        const MODE = config.MODE || "private";
        const VERSION = config.VERSION || "1.0.0";
        const DESCRIPTION = config.DESCRIPTION || "";
        const BOT_IMAGE = config.BOT_IMAGE || config.BOT_MEDIA_URL;

        const dec = `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
➤  ${BOT_NAME}
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

▰▰▰❰ 🤖 ʙᴏᴛ ɪɴғᴏ ❱▰▰▰
➤ 👑 ${toSmallCaps("Owner")}: ${OWNER_NAME}
➤ 📜 ${toSmallCaps("Commands")}: ${totalCommands}
➤ ⏱️ ${toSmallCaps("Runtime")}: ${runtime(process.uptime())}
➤ 📦 ${toSmallCaps("Prefix")}: ${PREFIX}
➤ ⚙️ ${toSmallCaps("Mode")}: ${MODE}
➤ 🏷️ ${toSmallCaps("Version")}: ${VERSION}
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
${menuSections}

> ${DESCRIPTION || ""}`;

        const contextInfo = {
            mentionedJid: [message.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363407310860031@newsletter",
                newsletterName: BOT_NAME,
                serverMessageId: 143,
            },
        };

        let imageToSend;
        const localImagePath = path.join(__dirname, "../lib/ERFAN.jpg");

        const imageValidation = await validateAndFetchImage(BOT_IMAGE);

        if (imageValidation.valid) {
            imageToSend = imageValidation.buffer;
        } else if (fs.existsSync(localImagePath)) {
            imageToSend = fs.readFileSync(localImagePath);
        } else {
            return await client.sendMessage(message.chat, { text: dec, contextInfo }, { quoted: message });
        }

        await client.sendMessage(
            message.chat,
            { image: imageToSend, caption: dec, contextInfo },
            { quoted: message }
        );
    } catch (e) {
        console.log(e);
        reply(`Error: ${e}`);
    }
});
