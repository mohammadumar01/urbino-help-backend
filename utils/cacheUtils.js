const redisClient = require("../config/redis");

const clearCustomerBookingCache = async (customerId) => {
    const pattern = `customer:${customerId}:bookings:*`;

    const keys = await redisClient.keys(pattern);
    if(keys.length > 0){
        await redisClient.del(...keys);
        console.log(`Deleted ${keys.length} booking cache(s)`);

    }
};

module.exports = {
    clearCustomerBookingCache
}