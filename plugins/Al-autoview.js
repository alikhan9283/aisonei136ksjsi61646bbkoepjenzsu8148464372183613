const { cmd } = require("../command");
const config = require("../config");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════
//  AUTO VIEW-ONCE → OWNER INBOX (DEFAULT ON, NO TRIGGER)
//  Group/DM ki har view-once photo/video/voice
//  → seedha owner ke WhatsApp inbox mein (silent)
// ═══════════════════════════════════════════════════════════

const STATE_FILE = path.join(__dirname, "autovv-state.json");
let ON = true, OWNER_OVERRIDE = "";
try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    ON = s.on !== false; OWNER_OVERRIDE = s.owner || "";
} catch (e) {}
const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify({ on: ON, owner: OWNER_OVERRIDE })); } catch (e) {} };

const DONE = new Set();
let CLIENT = null, STORE = null, pollOn = false, hookOn = false, VOCOUNT = 0, LASTERR = "";

const dig = j => String(j || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

// ── Owner inbox: sudo.json → config → globals → override → self ──
function ownerJid(client) {
    if (OWNER_OVERRIDE) return OWNER_OVERRIDE;
    const out = [];
    const push = v => { const d = dig(v); if (d.length >= 8) out.push(d + "@s.whatsapp.net"); };
    try { const sj = require("../lib/sudo.json"); (Array.isArray(sj) ? sj : [sj]).forEach(x => push(typeof x === "string" ? x : (x?.jid || x?.number || ""))); } catch (e) {}
    [global.owner, global.sudo, global.OWNER, config?.OWNER, config?.OWNER_NUMBER, config?.owner_number, config?.owner, config?.NUMBERS?.OWNER]
        .forEach(v => { if (Array.isArray(v)) v.forEach(push); else if (v) push(v); });
    if (out.length) return out[0];
    try { return client?.user?.id || ""; } catch (e) { return ""; } // akhir mein bot ka apna inbox
}

// ── View-once pakro + base ke PROVEN method se download ──
async function handleVO(obj, client) {
    try {
        const msg = obj?.message;
        if (!msg) return false;
        let inner = null;
        const w = msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension;
        if (w?.message) inner = w.message;
        if (!inner && (obj.mtype === "viewOnceMessage" || obj.mtype === "viewOnceMessageV2")) {
            inner = msg[obj.mtype]?.message || null;
        }
        if (!inner) return false;

        const innerType = ["imageMessage", "videoMessage", "audioMessage"].find(k => inner[k]);
        if (!innerType) return false;
        const mediaObj = inner[innerType];

        const id = obj.key?.id || obj.id;
        if (id) { if (DONE.has(id)) return true; DONE.add(id); if (DONE.size > 1200) DONE.clear(); }
        VOCOUNT++;
        console.log("[AUTOVV] view-once pakra:", innerType);

        // DOWNLOAD CHAIN (pehla = aapke base ka proven tarika)
        let buf = null;
        if (typeof obj.download === "function") { try { buf = await obj.download(); } catch (e) {} }
        if (!buf?.length && client?.downloadMediaMessage) {
            for (const s of [{ type: innerType, msg: mediaObj }, mediaObj, obj]) {
                try { buf = await client.downloadMediaMessage(s); if (buf?.length) break; } catch (e) {}
            }
        }
        if (!buf?.length) {
            try {
                const B = require("@whiskeysockets/baileys");
                const st = await B.downloadContentFromMessage(mediaObj, innerType.replace("Message", ""));
                buf = Buffer.from([]); for await (const c of st) buf = Buffer.concat([buf, c]);
            } catch (e) {}
        }
        if (!buf?.length) { LASTERR = "download fail: " + innerType; console.log("[AUTOVV] download fail"); return false; }

        const target = ownerJid(client);
        if (!target) { LASTERR = "owner jid nahi mila"; return false; }

        const caption = `👁️ *AUTO VIEW-ONCE CAPTURE*\n\n👤 Sender: ${obj.pushName || dig(obj.key?.participant || obj.key?.remoteJid) || "Unknown"}\n💬 Chat: ${(obj.key?.remoteJid || "").endsWith("@g.us") ? "Group" : "Private"}\n📝 Caption: ${mediaObj.caption || "No caption"}`;

        let content = {};
        if (innerType === "imageMessage") content = { image: buf, caption, mimetype: mediaObj.mimetype || "image/jpeg" };
        else if (innerType === "videoMessage") content = { video: buf, caption, mimetype: mediaObj.mimetype || "video/mp4" };
        else content = { audio: buf, mimetype: mediaObj.mimetype || "audio/mp4", ptt: mediaObj.ptt || false };

        await client.sendMessage(target, content);
        console.log("[AUTOVV] owner inbox mein bhej diya ✔");
        return true;
    } catch (e) { LASTERR = e.message; console.error("[AUTOVV]:", e.message); return false; }
}

// ── NET 1: event hook ──
function attachHook(client) {
    if (hookOn) return;
    try {
        const ev = client?.ev || client?.sock?.ev;
        if (ev?.on) { ev.on("messages.upsert", async d => { for (const m of (d?.messages || [])) if (ON) await handleVO(m, client); }); hookOn = true; }
    } catch (e) {}
}
// ── NET 2: store polling ──
function startPoll(client, store) {
    CLIENT = client; if (store) STORE = store;
    if (pollOn || !STORE?.messages) return;
    pollOn = true;
    setInterval(async () => {
        if (!ON || !CLIENT) return;
        try {
            const chats = STORE.messages;
            const keys = typeof chats.keys === "function" ? chats.keys() : Object.keys(chats);
            for (const jid of keys) {
                const db = chats[jid];
                let arr = Array.isArray(db?.array) ? db.array : (Array.isArray(db) ? db : null);
                if (!arr) { try { arr = db?.toJSON?.(); } catch (e) {} }
                if (!arr?.length) continue;
                for (const raw of arr.slice(-5)) await handleVO(raw, CLIENT);
            }
        } catch (e) {}
    }, 3000);
    console.log("[AUTOVV] polling ✔");
}
setImmediate(() => {
    const b = setInterval(() => {
        const c = global.client || global.conn || global.sock;
        if (c) { attachHook(c); startPoll(c, global.store); }
        if (pollOn) clearInterval(b);
    }, 3000);
    setTimeout(() => clearInterval(b), 5 * 60 * 1000);
});

// ── NET 3: base dispatch (serialized m — jaise aapka vv2 use karta hai) ──
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (client, m, store, extra) => {
    try {
        CLIENT = client; if (store) STORE = store;
        if (!hookOn) attachHook(client);
        if (!pollOn) startPoll(client, store);
        if (!ON) return;
        if (m?.fromMe || extra?.isMe) return;
        // serialized shape (m.mtype = viewOnceMessage) ya raw wrapper
        await handleVO(m, client);
    } catch (e) {}
});

// ── Control command ──
cmd({
    pattern: "autovv",
    alias: ["autoviewonce"],
    desc: "Auto view-once → owner inbox control",
    category: "owner",
    react: "👁️",
    filename: __filename
}, async (client, m, store, { reply, isCreator }) => {
    if (!isCreator) return reply("❌ Owner only!");
    CLIENT = client; if (store) STORE = store;
    if (!hookOn) attachHook(client);
    if (!pollOn) startPoll(client, store);

    const args = (m.body || m.text || "").trim().split(/\s+/).slice(1);
    const a = (args[0] || "").toLowerCase();

    if (a === "off") { ON = false; save(); return reply("⏸️ Auto view-once OFF"); }
    if (a === "on") { ON = true; save(); return reply(`▶️ *AUTO VIEW-ONCE ON!*\nOwner inbox: ${ownerJid(client).split("@")[0]}\nAb har view-once photo/video/voice silent inbox mein aayegi.`); }
    if (a === "set") {
        const d = dig(args[1]);
        if (d.length < 8) return reply("❌ .autovv set 92300xxxxxxx");
        OWNER_OVERRIDE = d + "@s.whatsapp.net"; save();
        return reply(`✅ Owner inbox set: ${d}`);
    }
    return reply(` *AUTO VIEW-ONCE STATUS*\n\n• System: ${ON ? "ON ✅ (default)" : "OFF ⏸️"}\n• Owner inbox: ${ownerJid(client).split("@")[0]}\n• View-once pakre: ${VOCOUNT}\n• Nets: hook ${hookOn ? "✔" : "✗"} / poll ${pollOn ? "✔" : "✗"}\n• Last error: ${LASTERR || "none"}\n\n.autovv on | off | set <number>`);
});

console.log("[AUTOVV] plugin loaded ✔ (default ON)");
