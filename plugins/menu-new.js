const fs = require('fs');
const path = require('path');
const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const converter = require('../data/converter');

// Human-friendly labels + emoji for each category key. If a plugin uses a
// category not listed here, it still shows up — grouped under its own
// raw category name — so nothing from plugins/ ever silently disappears.
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

function metaFor(catKey) {
    return CATEGORY_META[catKey] || { label: catKey.charAt(0).toUpperCase() + catKey.slice(1), emoji: '📦' };
}

// Builds { categoryKey: [ {pattern, desc}, ... ] } straight from whatever
// is currently registered in commands — so anything added to plugins/
// shows up automatically next time the bot restarts, with no manual list
// to keep in sync.
function buildCategoryMap() {
    const map = {};
    const list = Array.isArray(commands) ? commands : Object.values(commands || {});

    for (const c of list) {
        if (!c || !c.pattern) continue;
        if (c.dontAddCommandList) continue; // respect a common "hide from menu" flag if plugins set it

        const catKey = (c.category || 'other').toLowerCase();
        if (!map[catKey]) map[catKey] = [];
        map[catKey].push({ pattern: c.pattern, desc: c.desc || '' });
    }

    for (const key in map) {
        map[key].sort((a, b) => a.pattern.localeCompare(b.pattern));
    }

    return map;
}

// Fixed display order for known categories; any unknown category (from a
// plugin using a category name not in CATEGORY_META) is appended after.
const ORDER = ['main', 'menu', 'download', 'downloader', 'group', 'fun', 'owner', 'ai', 'anime', 'convert', 'reactions', 'tools', 'search', 'other'];

function orderedCategoryKeys(map) {
    const known = ORDER.filter(k => map[k]);
    const unknown = Object.keys(map).filter(k => !ORDER.includes(k)).sort();
    return [...new Set([...known, ...unknown])];
}

function formatSection(catKey, items, prefix) {
    const meta = metaFor(catKey);
    const lines = items.map(c => {
        const desc = c.desc ? ` — ${c.desc}` : '';
        return `• *${prefix}${c.pattern}*${desc}`;
    });
    return `${meta.emoji} *${meta.label.toUpperCase()} MENU*\n${lines.join('\n')}`;
}

cmd({
pattern: "menu",
desc: "Show interactive menu system",
category: "menu",
react: "🧾",
filename: __filename
}, async (conn, mek, m, { from, reply, isOwner }) => {
try {
    const totalCommands = Object.keys(commands).length;
    const botName = config.BOT_NAME || "SARWAR-MD";
    const mode = config.MODE || "public";
    const prefix = config.PREFIX || ".";
    const creatorName = "SARWAR-MD";
    const uptime = runtime(process.uptime());

    // Build categories dynamically from whatever is actually registered
    const rawMap = buildCategoryMap();
    // Merge "main" and "menu" categories into a single "main" bucket
    if (rawMap.menu) {
        rawMap.main = [...(rawMap.main || []), ...rawMap.menu];
        delete rawMap.menu;
    }
    const orderedKeys = orderedCategoryKeys(rawMap).filter(k => k !== 'menu');

    // Number each section 1..N based on what's actually present
    const sectionList = orderedKeys.map((key, i) => ({
        number: String(i + 1),
        key,
        meta: metaFor(key),
        items: rawMap[key]
    }));

    const sectionLinesForOverview = sectionList
        .map(s => `${s.number}. ${s.meta.emoji} ${s.meta.label} Menu`)
        .join('\n');

    // ── Clean list style, no box-drawing ────────────────────────
    const menuCaption = `*${botName}*

Mode: *${mode}*
Prefix: *${prefix}*
Runtime: *${uptime}*
Creator: *${creatorName}*
Total Commands: *${totalCommands}*

*MENU SECTIONS*
${sectionLinesForOverview}

Reply with a number (1-${sectionList.length}) to open a section.

*Powered by ${creatorName}*`;

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

    const sendMenuImage = async () => {
        try {
            return await conn.sendMessage(
                from,
                {
                    image: { url: config.MENU_IMAGE_URL || 'https://i.ibb.co/cKZNpnR9/MOON-MD.jpg' },
                    caption: menuCaption,
                    contextInfo: contextInfo
                },
                { quoted: mek }
            );
        } catch (e) {
            console.log('Image send failed, falling back to text');
            return await conn.sendMessage(
                from,
                { text: menuCaption, contextInfo: contextInfo },
                { quoted: mek }
            );
        }
    };

    let sentMsg;
    try {
        sentMsg = await Promise.race([
            sendMenuImage(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Image send timeout')), 10000))
        ]);
    } catch (e) {
        console.log('Menu send error:', e);
        sentMsg = await conn.sendMessage(
            from,
            { text: menuCaption, contextInfo: contextInfo },
            { quoted: mek }
        );
    }

    try {
        const audioPath = path.join(__dirname, '../assets/menu-new.m4a');
        if (fs.existsSync(audioPath)) {
            const buffer = fs.readFileSync(audioPath);
            const ptt = await converter.toPTT(buffer, 'm4a');

            await conn.sendMessage(from, {
                audio: ptt,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
            }, { quoted: mek });
        } else {
            console.error('menu-new.m4a not found in assets folder');
        }
    } catch (audioError) {
        console.log('Audio send error:', audioError);
    }

    const messageID = sentMsg.key.id;

    // Build each section's reply text dynamically too
    const menuData = {};
    for (const s of sectionList) {
        menuData[s.number] = {
            title: `${formatSection(s.key, s.items, prefix)}\n\n*Powered by ${creatorName}*`,
            image: true
        };
    }

    const handler = async (msgData) => {
        try {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

            const isReplyToMenu = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToMenu) {
                const receivedText = receivedMsg.message.conversation ||
                                  receivedMsg.message.extendedTextMessage?.text;
                const senderID = receivedMsg.key.remoteJid;

                if (menuData[receivedText]) {
                    const selectedMenu = menuData[receivedText];

                    try {
                        if (selectedMenu.image) {
                            await conn.sendMessage(
                                senderID,
                                {
                                    image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/zc57w6.jpg' },
                                    caption: selectedMenu.title,
                                    contextInfo: contextInfo
                                },
                                { quoted: receivedMsg }
                            );
                        } else {
                            await conn.sendMessage(
                                senderID,
                                { text: selectedMenu.title, contextInfo: contextInfo },
                                { quoted: receivedMsg }
                            );
                        }

                        await conn.sendMessage(senderID, {
                            react: { text: '✅', key: receivedMsg.key }
                        });

                    } catch (e) {
                        console.log('Menu reply error:', e);
                        await conn.sendMessage(
                            senderID,
                            { text: selectedMenu.title, contextInfo: contextInfo },
                            { quoted: receivedMsg }
                        );
                    }

                } else {
                    await conn.sendMessage(
                        senderID,
                        {
                            text: `❌ Invalid option! Please reply with a number between 1-${sectionList.length}.`
                        },
                        { quoted: receivedMsg }
                    );
                }
            }
        } catch (e) {
            console.log('Handler error:', e);
        }
    };

    conn.ev.on("messages.upsert", handler);

    setTimeout(() => {
        conn.ev.off("messages.upsert", handler);
    }, 300000);

} catch (e) {
    console.error('Menu Error:', e);
    try {
        await conn.sendMessage(
            from,
            {
                text: `❌ Menu system is busy. Please try again later.`
            },
            { quoted: mek }
        );
    } catch (finalError) {
        console.log('Final error handling failed:', finalError);
    }
}

});
