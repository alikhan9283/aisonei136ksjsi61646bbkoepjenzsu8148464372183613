const { cmd, commands } = require('../command');
const axios = require('axios');

// The old URL had a typo (`appcode?number=` instead of `app/code?number=`)
// which is why it always failed — there was no slash between the domain
// and the "code" path, so it hit a nonexistent host. Also updated to the
// new Railway deployment (the old Heroku pair site is no longer used).
const PAIR_BASE_URL = 'https://sarwar-md-pair-production-761e.up.railway.app';

cmd({
    pattern: "pair",
    alias: ["getpair", "clonebot"],
    react: "✅",
    desc: "Get pairing code for sᴀʀᴡᴀʀ-ᴀʟɪ-ᴍᴅ",
    category: "download",
    use: ".pair 923242895504",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply }) => {
    try {
        // Extract number
        let phoneNumber = q
            ? q.trim().replace(/[^0-9+]/g, '')
            : senderNumber.replace(/[^0-9]/g, '');

        phoneNumber = phoneNumber.replace(/\+/g, '');

        if (phoneNumber.startsWith('0') && phoneNumber.length === 11) {
            phoneNumber = '92' + phoneNumber.substring(1);
        }

        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            return await reply("❌ Invalid number\nExample: .pair 923242895504");
        }

        let response;
        let pairingCode;

        // Try a couple of likely endpoint shapes since the exact API path
        // on this Railway deployment isn't publicly documented — /code is
        // what the original bot code used (just missing its slash), and
        // /pair/code is a common alternate shape for sites with a /pair
        // landing page like this one has.
        const endpointsToTry = [
            `${PAIR_BASE_URL}/code?number=${encodeURIComponent(phoneNumber)}`,
            `${PAIR_BASE_URL}/pair/code?number=${encodeURIComponent(phoneNumber)}`
        ];

        let lastError = null;
        for (const url of endpointsToTry) {
            try {
                response = await axios.get(url, { timeout: 20000 });
                pairingCode = response.data?.code || response.data?.pairingCode || response.data?.pair_code;
                if (pairingCode) break;
            } catch (e) {
                lastError = e;
                console.log(`[PAIR] ${url} failed:`, e.message);
            }
        }

        if (!pairingCode) {
            console.error('[PAIR] All endpoints failed. Last error:', lastError?.message);
            return await reply("❌ Failed to retrieve pairing code. The pair server may be busy — try again shortly.");
        }

        const doneMessage = "> *SARWAR-MD PAIRING COMPLETED*";

        await reply(`${doneMessage}\n\n*Your pairing code is:* ${pairingCode}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        await reply(`${pairingCode}`);

    } catch (error) {
        console.error("Pair command error:", error);
        await reply(`❌ Error: ${error.message}`);
    }
});
