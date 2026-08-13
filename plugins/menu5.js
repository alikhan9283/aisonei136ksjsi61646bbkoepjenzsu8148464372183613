// SARWAR-MD
const { cmd, commands } = require('../command');

const OWNER_NAME_RAW = "SARWAR ALI";
const BOT_NAME_RAW = "SARWAR-MD";
const MENU_IMAGE = "https://i.ibb.co/ynrV1479/SARWAR-MD.png";
const MENU_AUDIO = "https://files.catbox.moe/6xnj2o.mp3";

const CATEGORY_TITLES = {
    main: "MAIN",
    group: "GROUP / ADMIN",
    downloader: "DOWNLOADERS",
    download: "DOWNLOADERS",
    fun: "FUN / GAMES",
    tools: "TOOLS / UTILITY",
    utility: "SETTINGS / UTILITY",
    sticker: "STICKER MAKER",
    ai: "AI / CHATBOT",
    search: "SEARCH",
    convert: "CONVERTER",
    music: "MUSIC",
    general: "GENERAL / BASIC",
    owner: "OWNER / BOT-CONTROL",
    other: "MISCELLANEOUS",
    // "hidden" is intentionally left out of CATEGORY_ORDER below, so
    // owner-only / internal commands never show up in the public menu.
};

const CATEGORY_ORDER = ["main", "downloader", "download", "ai", "fun", "group", "tools", "utility", "general", "owner", "search", "sticker", "music", "convert", "other"];

function runtime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function buildCommandList() {
    const seen = new Set();
    const byCategory = {};

    for (const entry of Object.values(commands)) {
        if (!entry || !entry.pattern || entry.pattern.trim() === '') continue;
        if (entry.category === "hidden") continue;
        if (seen.has(entry.pattern)) continue;
        seen.add(entry.pattern);

        const cat = CATEGORY_TITLES[entry.category] ? entry.category : "other";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(entry.pattern);
    }

    for (const cat in byCategory) {
        byCategory[cat].sort();
    }

    return { seen, byCategory };
}

function toBoldSerif(text) {
    const upper = { A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙' };
    const lower = { a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳' };
    const digit = { 0:'𝟎',1:'𝟏',2:'𝟐',3:'𝟑',4:'𝟒',5:'𝟓',6:'𝟔',7:'𝟕',8:'𝟖',9:'𝟗' };
    return String(text).split('').map(ch => upper[ch] || lower[ch] || digit[ch] || ch).join('');
}
function toSmallCaps(text) {
    const map = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
    return String(text).toLowerCase().split('').map(ch => map[ch] || ch).join('');
}

// ── Royal Gold theme — the one style, kept fixed (no random rotation) ───
// Each command line gets the decorative "┃✮│➤" left border requested.
function formatCategory(categoryKey, patterns) {
    if (!patterns || !patterns.length) return '';
    const title = toBoldSerif(CATEGORY_TITLES[categoryKey] || "MISCELLANEOUS");
    const lines = patterns.map(p => `┃✮│➤ .${toBoldSerif(p)}`).join('\n');
    return `\n╔══════❰ ${title} ❱══════╗\n${lines}\n╚════════════════════════════╝`;
}

function buildMenuText() {
    const { seen, byCategory } = buildCommandList();

    if (seen.size === 0) {
        return "⚠️ No commands are currently loaded.";
    }

    const orderedCats = [
        ...CATEGORY_ORDER.filter(c => byCategory[c]),
        ...Object.keys(byCategory).filter(c => !CATEGORY_ORDER.includes(c)),
    ];

    const upStr = runtime(process.uptime());
    const owner = toBoldSerif(OWNER_NAME_RAW);
    const botName = toBoldSerif(BOT_NAME_RAW);

    let header = `╒═════════════════════╕\n👑 ${botName} 👑\n╘═════════════════════╛\n\n`;
    header += `╔══════❰ 🤖 ${toSmallCaps('bot info')} ❱══════╗\n`;
    header += `║ 👑 ${toSmallCaps('owner')}    : ${owner}\n`;
    header += `║ 📜 ${toSmallCaps('commands')} : ${seen.size}\n`;
    header += `║ ⏱️ ${toSmallCaps('runtime')}  : ${upStr}\n`;
    header += `╚════════════════════════════╝`;

    let sections = '';
    for (const cat of orderedCats) {
        sections += formatCategory(cat, byCategory[cat]);
    }

    return `${header}\n${sections}\n\n🏆 ${toSmallCaps('powered by')} ${toSmallCaps(BOT_NAME_RAW)} 👑`;
}

cmd({
    pattern: "menu5",
    alias: ["m2", "menulist"],
    use: '.menu2',
    desc: "Show all currently loaded bot commands",
    category: "main",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const menuText = buildMenuText();

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363407310860031@newsletter',
                newsletterName: BOT_NAME_RAW,
                serverMessageId: 143
            }
        };

        try {
            await conn.sendMessage(from, {
                image: { url: MENU_IMAGE },
                caption: menuText,
                contextInfo
            }, { quoted: mek });
        } catch (imgErr) {
            console.error("⚠️ menu2: image send failed, falling back to text:", imgErr.message);
            await conn.sendMessage(from, { text: menuText, contextInfo }, { quoted: mek });
        }

        try {
            await conn.sendMessage(from, {
                audio: { url: MENU_AUDIO },
                mimetype: "audio/mpeg",
                ptt: false
            });
        } catch (audioErr) {
            console.error("⚠️ menu2: audio send failed (non-fatal):", audioErr.message);
        }

    } catch (e) {
        console.error("Error in menu2 command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
