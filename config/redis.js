const { createClient } = require("redis");

const redisClient = createClient({
    url:
        process.env.REDIS_URL ||
        "redis://127.0.0.1:6379",
});

redisClient.on("connect", () => {
    console.log("Redis Socket Connected");
});

redisClient.on("ready", () => {
    console.log("Redis Ready");
});

redisClient.on("error", (err) => {
    console.error("Redis Error:", err);
});

(async () => {
    try {
        await redisClient.connect();
        console.log("Redis Connected");
    } catch (err) {
        console.error("Redis Connection Error:", err);
    }
})();

module.exports = redisClient;