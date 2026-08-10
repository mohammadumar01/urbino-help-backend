const redisClient = require("../config/redis");
const CACHE_KEYS = require("../config/cacheKeys");
const {
    getPendingBookings,
    acceptBooking,
    completeBooking,
    assignAgentToBooking,
    getTotalPendingBookings,

} = require("../models/providerModel");

const getAllPendingBookings = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page-1) * limit;

        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "created_at";
        const order = (req.query.order || "ASC").toUpperCase();

        const allowedSortFields = [
            "booking_date",
            "created_at"
        ];

        const allowedOrder = [
            "ASC",
            "DESC"
        ];

        if(!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                message:"Invalid sort field"
            });
        }

        if(!allowedOrder.includes(order)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort order"
            });
        }

      
        const bookings = await getPendingBookings(
            limit,
            offset,
            search,
            sortBy,
            order
        );

        const totalPendingBookings = Number(
            await getTotalPendingBookings(search)
        );
        const totalPages = Math.ceil(totalPendingBookings / limit);
        return res.status(200).json({
            success: true,
            currentPage: page,
            limit,
            totalPendingBookings,
            totalPages,
            bookings
        });
        

       
    } catch(error){
        return res.status(500).json({
            success:false,
            message: error.message
        });
    }
};

const acceptCustomerBooking = async(req,res) => {
    try {
        const{ id } = req.params;
        const booking = await acceptBooking(
            id,
            req.user.id
        );

        if(!booking) {
            return res.status(404).json({
                success: false,
                message:"Booking not found or already accepted"
            });
        }

        await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
        console.log("Dashboard Cache Cleared");

        return res.status(200).json({
            success: true,
            message: "Booking accepted by provider successfully",
            booking
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const completeCustomerBooking = async (req,res) => {
    try {
        const { id } = req.params;

        const booking = await completeBooking(id, req.user.id);

        if(!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or already completed"
            });
        }
        //yaad rhe yha chche memori connect kr rhe aur ye sb mai kiya hai to bhulna mt 
        
             await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
             console.log("Dashboard Cache Cleared");

        return res.status(200).json({
            success: true,
            message: "Booking completed Successfully",
            booking
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const assignAgent = async (req,res) => {
    try {
        const { id } = req.params;
        const { agent_id } = req.body;

        if(!agent_id) {
            return res.status(400).json({
                success: false,
                message: "Agent ID is required"
            });
        }

        const booking = await assignAgentToBooking(
            id,
            req.user.id,
            agent_id
        );
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or not accepted"
            });
        }

        await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);
        console.log("Dashboard cache Cleared");
        return res.status(200).json({
            success: true,
            message: "Agent assigned successfully",
            booking
        });

    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllPendingBookings,
    acceptCustomerBooking,
    completeCustomerBooking,
    assignAgent
};