const CACHE_KEYS = require("../config/cacheKeys");
const redisClient = require("../config/redis");
const { createBooking,
     getBookingsByCustomerId,
     getTotalBookingsByCustomerId,
     cancelBooking } = require("../models/bookingModel");

const { clearCustomerBookingCache } = require("../utils/cacheUtils");

const createCustomerBooking = async (req, res) => {

     try {
        const {
            service_name,
            address,
            booking_date,
            booking_time
        } = req.body;

        if(
            !service_name ||
             !address || 
             !booking_date ||
             !booking_time

        ){
            return res.status(400).json({
                success: false,
                message:"All fields are required"
            });
        }

     

        const booking = await createBooking(
            req.user.id,
            service_name,
            address,
            booking_date,
            booking_time

        );
           await clearCustomerBookingCache(req.user.id);
           await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
           console.log("Dashboard Cache Cleared");

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking
        });


     } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
     }

     
};

const getMyBooking = async (req,res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page -1) * limit;

        const search = req.query.search || "";
        const status = req.query.status || "";

        let sortBy = req.query.sortBy || "created_at";
        let order = req.query.order || "DESC";
         
        const allowedSortFields = [
            "created_at",
            "booking_date",
            "service_name",
            "status"
        ];
         const allowedOrder = ["ASC", "DESC"];

         if(!allowedSortFields.includes(sortBy)){
            sortBy = "created_at";
         }

         if(!allowedOrder.includes(order.toUpperCase())) {
            order = "DESC";
         }

         else {
            order = order.toUpperCase();
         }
// yha Generate kr rhe hai Cache key
         const cacheKey = CACHE_KEYS.CUSTOMER_BOOKINGS(
            req.user.id,
            page,
            limit,
            search,
            status,
            sortBy,
            order
         );

         // Check redis cache 

         const cachedBookings = await redisClient.get(cacheKey);

         if (cachedBookings) {
            console.log("Customer Bookings Cache Hit");
            return res.status(200).json(JSON.parse(cachedBookings));
            
         }
         console.log("Customer Bookings Cache Miss");

         
        const bookings = await getBookingsByCustomerId(
            req.user.id,
            limit,
            offset,
            search,
            status,
            sortBy,
            order
        );

        const totalBookings = await getTotalBookingsByCustomerId(
            req.user.id,
            search,
            status
        );
        const totalPages = Math.max(1,Math.ceil(totalBookings / limit));

// yha respomse ka redis ke ander save kiya hamne yaad rakhna
        const response =  {
            success: true,
            currentPage: page,
            limit,
            totalBookings,
            totalPages,
            bookings
        };

        await redisClient.setEx(
            cacheKey,
            300,
            JSON.stringify(response)
        );

        console.log("Customer Bookings Cached");

        return res.status(200).json(response);

    }  catch(error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const cancelCustomerBooking = async (req,res) => {
    try {

        const{ id} = req.params;

        const booking = await cancelBooking(
            id,
            req.user.id
        );

        if(!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }
           await clearCustomerBookingCache(req.user.id);
           await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
           console.log("Dashboard Cache Cleared");

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = {
    createCustomerBooking,
    getMyBooking,
    cancelCustomerBooking
}