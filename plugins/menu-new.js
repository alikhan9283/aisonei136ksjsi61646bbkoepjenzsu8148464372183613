const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');

// Emoji + label per category. Anything not listed here still shows up,
// grouped under its own raw category name, so nothing in plugins/ is ever
// silently dropped from the menu.
const CATEGORY_META = {
    main:        { label: 'Main',        emoji: '🏠' },
    menu:        { label: 'Main',        emoji: '🏠' },
    download:    { label: 'Download',    emoji: '📥' },
    downloader:  { label: 'Download',    emoji: '📥' },
    group:       { label: 'Group',       emoji: '👥' },
    fun:         { label: 'Fun',         emoji: '😄' },
    owner:       { label: 'Owner',       emoji: '👑' },
    ai:          { label: 'AI',          emoji: '🤖' },
    anime:       { label: 'Anime',       emoji: '🎎' },
    convert:     { label: 'Convert',     emoji: '🔄' },
    tools:       { label: 'Tools',       emoji: '🛠️' },
    other:       { label: 'Other',       emoji: '📌' },
    reactions:   { label: 'Reactions',   emoji: '💞' },
    search:      { label: 'Search',      emoji: '🔎' }
};

const ORDER = ['main', 'menu', 'download', 'downloader', 'group', 'fun', 'owner', 'ai', 'anime', 'convert', 'reactions', 'tools', 'search', 'other'];

function metaFor(catKey) {
    return CATEGORY_META[catKey] || { label: catKey.charAt(0).toUpperCase() + catKey.slice(1), emoji: '📦' };
}

// Reads every currently-registered command straight from commands, groups
// it by category — so any plugin added later shows up automatically on
// the bot's next restart with zero changes needed here.
function buildCategoryMap() {
    const map = {};
    const list = Array.isArray(commands) ? commands : Object.values(commands || {});

    for (const c of list) {
        if (!c || !c.pattern) continue;
        if (c.dontAddCommandList) continue;

        const catKey = (c.category || 'other').toLowerCase();
        if (!map[catKey]) map[catKey] = [];
        map[catKey].push({ pattern: c.pattern, desc: c.desc || '' });
    }

    for (const key in map) {
        map[key].sort((a, b) => a.pattern.localeCompare(b.pattern));
    }
    return map;
}

function orderedCategoryKeys(map) {
    const known = ORDER.filter(k => map[k]);
    const unknown = Object.keys(map).filter(k => !ORDER.includes(k)).sort();
    return [...new Set([...known, ...unknown])];
}

// Bold-gold styled command list for a single card's body text.
function formatCardBody(items, prefix) {
    return items
        .map(c => `✦ *${prefix}${c.pattern}*${c.desc ? `\n   ➤ ${c.desc}` : ''}`)
        .join('\n\n');
}

cmd({
pattern: "menu",
desc: "Show the full command menu as a scrollable carousel",
category: "menu",
react: "🧾",
filename: __filename
}, async (conn, mek, m, { from }) => {
try {
    const totalCommands = Object.keys(commands).length;
    const botName = config.BOT_NAME || "SARWAR-MD";
    const mode = config.MODE || "public";
    const prefix = config.PREFIX || ".";
    const creatorName = "SARWAR-MD";
    const uptime = runtime(process.uptime());
    const menuImage = config.MENU_IMAGE_URL || 'https://i.ibb.co/cKZNpnR9/MOON-MD.jpg';

    const rawMap = buildCategoryMap();
    if (rawMap.menu) {
        rawMap.main = [...(rawMap.main || []), ...rawMap.menu];
        delete rawMap.menu;
    }
    const orderedKeys = orderedCategoryKeys(rawMap).filter(k => k !== 'menu');

    // Every category becomes one horizontally-scrollable card — the whole
    // menu arrives in a single message, no reply/number-selection needed.
    const cards = orderedKeys.map(key => {
        const meta = metaFor(key);
        const items = rawMap[key];
        return {
            image: { url: menuImage },
            title: `${meta.emoji} ${meta.label.toUpperCase()} MENU`,
            body: formatCardBody(items, prefix),
            footer: `★ POWERED BY ${creatorName} ★`
        };
    });

    const bodyText =
`✦═══════════════✦
   🥇 *${botName}* 🥇
✦═══════════════✦

➤ 𝗠𝗼𝗱𝗲: *${mode}*
➤ 𝗣𝗿𝗲𝗳𝗶𝘅: *${prefix}*
➤ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲: *${uptime}*
➤ 𝗖𝗿𝗲𝗮𝘁𝗼𝗿: *${creatorName}*
➤ 𝗧𝗼𝘁𝗮𝗹 𝗖𝗺𝗱𝘀: *${totalCommands}*

Swipe through the cards below ➜ each one is a full menu section.

★ 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 *${creatorName}* ★`;

    const contextInfo = {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363407310860031@newsletter',
            newsletterName: creatorName,
            serverMessageId: 143
        }
    };

    try {
        await conn.sendMessage(from, {
            text: bodyText,
            title: `🥇 ${botName} MENU`,
            subtitle: `${totalCommands} commands available`,
            footer: `★ POWERED BY ${creatorName} ★`,
            cards,
            contextInfo
        }, { quoted: mek });
    } catch (e) {
        // Fallback for bot forks where the carousel `cards` shape isn't
        // supported by sendMessage — sends the same content as a single
        // scroll-through text message instead of failing silently.
        console.log('[MENU] Carousel send failed, falling back to text:', e.message);

        const fallbackText = [
            bodyText,
            '',
            ...cards.map(c => `${c.title}\n${c.body}\n${c.footer}`)
        ].join('\n\n═══════════════\n\n');

        await conn.sendMessage(from, {
            image: { url: menuImage },
            caption: fallbackText,
            contextInfo
        }, { quoted: mek });
    }

} catch (e) {
    console.error('Menu Error:', e);
    try {
        await conn.sendMessage(from, { text: `❌ Menu system is busy. Please try again later.` }, { quoted: mek });
    } catch (finalError) {
        console.log('Final error handling failed:', finalError);
    }
}

});
