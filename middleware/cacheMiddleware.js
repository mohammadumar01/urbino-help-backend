const redisClient = require("../config/redis");

/**
 * Public GET responses ko Redis mein thodi der rakho (sab users ke liye same data).
 * Redis band ho to seedha handler chalta hai. Sirf 200 JSON responses cache hote hain.
 *
 *   router.get("/", cachePublic("services", 60), handler)
 *   await invalidatePublic("services")   // data badalne par
 */
const PREFIX = "cache:public:";

function cachePublic(group, ttlSeconds = 60) {
    return async (req, res, next) => {
        if (req.method !== "GET" || req.headers.authorization) return next();
        const key = `${PREFIX}${group}:${req.originalUrl}`;

        const hit = await redisClient.get(key);
        if (hit) {
            res.setHeader("X-Cache", "HIT");
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.status(200).send(hit);
        }

        const json = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode === 200 && body && body.success !== false) {
                redisClient.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
            }
            res.setHeader("X-Cache", "MISS");
            return json(body);
        };
        next();
    };
}

async function invalidatePublic(...groups) {
    await Promise.all(groups.map((g) => redisClient.delByPattern(`${PREFIX}${g}:*`)));
}

module.exports = { cachePublic, invalidatePublic };
