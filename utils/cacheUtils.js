const redisClient = require("../config/redis");

const clearCustomerBookingCache = async (customerId) => {
    await redisClient.delByPattern(`customer:${customerId}:bookings:*`);
};

module.exports = {
    clearCustomerBookingCache
};
