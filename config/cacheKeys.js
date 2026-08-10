const CACHE_KEYS = {
    ADMIN_DASHBOARD: "dashboard:admin",

    CUSTOMER_BOOKINGS: (customerId, page, limit, search, status, sortBy, order) => 
        `customer:${customerId}:bookings:${page}:${limit}:${search}:${status}:${sortBy}:${order}`
    
};

module.exports = CACHE_KEYS;