const { createClient } = require("redis");

/**
 * Redis sirf cache hai. Redis band ho ya slow ho, tab bhi API chalti rahni chahiye.
 * Isliye yahan ek "safe" wrapper export hota hai: har call fail hone par
 * chupchap null / 0 return karti hai aur request database se serve hoti hai.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
// Production mein REDIS_URL na ho to cache band (localhost par connect karke errors na aayein)
const REDIS_ENABLED =
    process.env.REDIS_ENABLED !== "false" && (Boolean(process.env.REDIS_URL) || process.env.NODE_ENV !== "production");
const OP_TIMEOUT_MS = 500;

let client = null;
let lastErrorLog = 0;

function logError(msg, err) {
    // Redis down ho to har second log spam na ho
    const now = Date.now();
    if (now - lastErrorLog > 30000) {
        lastErrorLog = now;
        console.warn(`[redis] ${msg}: ${err?.message || err}`);
    }
}

if (REDIS_ENABLED) {
    client = createClient({
        url: REDIS_URL,
        socket: {
            connectTimeout: 3000,
            reconnectStrategy: (retries) => Math.min(retries * 500, 10000),
        },
    });

    client.on("ready", () => console.log("[redis] ready"));
    client.on("error", (err) => logError("error", err));

    client.connect().catch((err) => logError("initial connect failed", err));
}

function isReady() {
    return Boolean(client && client.isReady);
}

function withTimeout(promise) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("redis timeout")), OP_TIMEOUT_MS)
        ),
    ]);
}

async function safe(fn, fallback) {
    if (!isReady()) return fallback;
    try {
        return await withTimeout(fn());
    } catch (err) {
        logError("operation failed", err);
        return fallback;
    }
}

const redisClient = {
    isReady,
    get: (key) => safe(() => client.get(key), null),
    set: (key, value, options) => safe(() => client.set(key, value, options), null),
    setEx: (key, seconds, value) => safe(() => client.setEx(key, seconds, value), null),
    del: (...keys) => {
        const flat = keys.flat().filter(Boolean);
        if (flat.length === 0) return Promise.resolve(0);
        return safe(() => client.del(flat), 0);
    },
    /** KEYS ki jagah SCAN: production mein KEYS poora Redis block kar deta hai. */
    delByPattern: (pattern) =>
        safe(async () => {
            let deleted = 0;
            const batch = [];
            for await (const keys of client.scanIterator({ MATCH: pattern, COUNT: 200 })) {
                batch.push(...(Array.isArray(keys) ? keys : [keys]));
            }
            if (batch.length) deleted = await client.del(batch);
            return deleted;
        }, 0),
    quit: async () => {
        if (client && client.isOpen) {
            try {
                await client.quit();
            } catch {
                /* ignore */
            }
        }
    },
};

module.exports = redisClient;
