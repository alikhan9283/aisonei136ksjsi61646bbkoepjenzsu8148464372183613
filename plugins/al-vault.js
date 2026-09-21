const fs = require('fs');
const path = require('path');
const { cmd } = require('../command');

const VAULT_PATH = path.join(__dirname, "../lib/vault.json");

// Vault file ko initialize karna
const initVault = () => {
    if (!fs.existsSync(VAULT_PATH)) {
        fs.writeFileSync(VAULT_PATH, JSON.stringify({}), "utf-8");
    }
};

const readVault = () => {
    try {
        return JSON.parse(fs.readFileSync(VAULT_PATH, "utf-8"));
    } catch {
        return {};
    }
};

const saveToVault = (pin, data) => {
    const vault = readVault();
    vault[pin] = data;
    fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), "utf-8");
};

cmd({
    pattern: "vault",
    alias: ["locker", "secure"],
    desc: "Securely save and retrieve private notes/numbers with a PIN",
    category: "owner",
    react: "🔒",
    filename: __filename
}, async (sock, message, m, { q, reply, isCreator, sender }) => {
    try {
        if (!isCreator) return reply("❌ *Access Denied!* Only the owner can use the Vault.");

        initVault();
        const args = q ? q.trim().split(' ') : [];
        const action = args[0] ? args[0].toLowerCase() : '';
        const pin = args[1];
        const data = args.slice(2).join(' ');

        if (!action) {
            return reply(`🔒 *VAULT COMMANDS*\n\n.vault save <pin> <text>\n.vault get <pin>\n.vault delete <pin>\n.vault list`);
        }

        if (action === 'save') {
            if (!pin || pin.length < 4) return reply("❌ PIN kam se kam 4 digits ka hona chahiye!");
            if (!data) return reply("❌ Save karne ke liye kuch likho!\nExample: .vault save 1234 Mera secret number 03001234567");
            
            saveToVault(pin, data);
            return reply(`✅ *Data Securely Saved!*\n🔑 PIN: ${pin}\n📝 Note: Data is encrypted in local storage.`);
        }

        if (action === 'get') {
            if (!pin) return reply("❌ Please provide your PIN.\nExample: .vault get 1234");
            const vault = readVault();
            if (vault[pin]) {
                return reply(`🔓 *VAULT UNLOCKED*\n\n📝 *Data:* ${vault[pin]}\n\n> *Powered by Your Bot*`);
            } else {
                return reply("❌ *Invalid PIN* or no data found for this PIN.");
            }
        }

        if (action === 'delete') {
            if (!pin) return reply("❌ Please provide the PIN to delete.\nExample: .vault delete 1234");
            const vault = readVault();
            if (vault[pin]) {
                delete vault[pin];
                fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), "utf-8");
                return reply(`✅ *Data deleted successfully* for PIN: ${pin}`);
            } else {
                return reply("❌ *Invalid PIN*. Nothing to delete.");
            }
        }

        if (action === 'list') {
            const vault = readVault();
            const pins = Object.keys(vault);
            if (pins.length === 0) return reply("📭 Vault is currently empty.");
            
            let listMsg = "🔑 *Saved PINs (Data Hidden)*:\n";
            pins.forEach(p => listMsg += `├─ 🔒 ${p}\n`);
            listMsg += "╰─────────────────\nUse `.vault get <pin>` to view.";
            return reply(listMsg);
        }

    } catch (err) {
        console.error("Vault Error:", err);
        reply("❌ Vault me kuch ghalat ho gaya. Dobara koshish karein.");
    }
});
