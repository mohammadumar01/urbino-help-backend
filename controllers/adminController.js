const redisClient = require("../config/redis");
const CACHE_KEYS = require("../config/cacheKeys");
const {
    getAllUsers,
    getAllBookings,
    getDashboardStats,
    getTotalUsers,
    getTotalBookings,
    updateBookingStatus: updateBookingStatusModel , // same name ke ho gye do model ek to isme aur ek model.js mai aur aise krne wale ko alias khte hai
    assignAgentByAdmin,
    updateAgent: updateAgentModel,
    deleteAgent: deleteAgentModel,
    getDeletedAgents,
    restoreAgent: restoreAgentModel

} = require("../models/adminModel");

const bcrypt = require("bcryptjs");

const {
    createUser,
    findUserByEmail
} = require("../models/userModel");


const getUsers = async (req,res) => {
    try {

        // yha pr hamne padination ki hai 

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page -1) * limit;

        // yha pr search ke liye  
        const search = req.query.search || "";

        // ye apna role i mean filter hai 
        const role = req.query.role || "";

        // bhai ye apni sorting kr rhe hai 
        const sortBy = req.query.sortBy || "created_at";
        const order = (req.query.order || "DESC").toUpperCase();

        const allowedSortFields = [
            "name",  // ye yha change kiya 
            "email",
            "created_at"
        ];

        const allowedOrder = [
            "ASC",
            "DESC"
        ];

        if (!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort field"
            });
        }

        if(!allowedOrder.includes(order)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort order"
            });
        }

        const users = await getAllUsers(limit,offset, search, role, sortBy, order);

       const totalUsers = Number(await getTotalUsers(search,role));
       const totalPages = Math.ceil(totalUsers / limit);

        return res.status(200).json({
            success:true,
            currentPage: page,
            limit,
            totalUsers,
            totalPages,
            users
        });
    } catch (error) { 
        return res.status(500).json({
            success: false,
            message:error.message
        });
    }
};

const getBookings = async (req,res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page -1) * limit;

        // yha pr search ke liye 
        const search = req.query.search || "";

        // bhai ye apni sorting kr rhe hai 
        const sortBy = req.query.sortBy || "created_at";
        const order = (req.query.order || "DESC").toUpperCase();
        const status  = req.query.status || "";

        const allowedSortFields = [
            "booking_date",
            "created_at",
            "status"
        ];

        const allowedOrder = [
            "ASC",
            "DESC"
        ];

        if(!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort field"
            });
        }

        if(!allowedOrder.includes(order)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort order"
            });
        }
        
        const bookings = await getAllBookings(
             limit,
             offset,
             search, 
             status,
             sortBy,
             order
            );

        const totalBookings = Number(await getTotalBookings(search, status));
        const totalPages = Math.ceil(totalBookings / limit);

        return res.status(200).json({
            success:true,
            currentPage: page,
            limit,
            totalBookings,
            totalPages,
            bookings
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
    
};

const getDashboard = async(req,res) =>{
    try {
        const cacheKey = CACHE_KEYS.ADMIN_DASHBOARD;

        const cachedDashboard = await redisClient.get(cacheKey);

        if(cachedDashboard) {
            console.log("Dashboard Cache Hit");

            return res.status(200).json({
                success:true,
                dashboard: JSON.parse(cachedDashboard)
            });
        }

        console.log("Dashboard Cache Miss");

        const dashboard = await getDashboardStats();

         await redisClient.set(
            cacheKey,
            JSON.stringify(dashboard),
            {
                EX: 300
            }
        );
        console.log("Dashboard Cached Successfully");

        return res.status(200).json({
            success:true,
            dashboard
        });
    } catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
};
 
const updateBookingStatus = async (req,res) =>{

    try {

        
      const id = req.params.id;
      const { status } = req.body;

      const allowedStatus = [
        "pending",
        "accepted",
        "completed",
        "cancelled"
      ];

      if(!allowedStatus.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid booking status"
        });
      }

      const booking = await updateBookingStatusModel(id,status);

      if(!booking) {
        return res.status(404).json({
            success: false,
            message: "Booking not found"
        });
      }

      await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);

      return res.status(200).json({
        success: true,
        message: "Booking status updated successfully",
        booking
      });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const createAgent = async (req, res) => {
    try {

        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingUser = await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const agent = await createUser(
            name,
            email,
            hashedPassword,
            phone,
            "agent"
        );

        return res.status(201).json({
            success: true,
            message: "Agent created successfully",
            agent
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const getAgents = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search || "";

        const sortBy = req.query.sortBy || "created_at";
        const order = (req.query.order || "DESC").toUpperCase();

        const users = await getAllUsers(
            limit,
            offset,
            search,
            "agent",
            sortBy,
            order
        );

        const totalUsers = Number(
            await getTotalUsers(search, "agent")
        );

        const totalPages = Math.ceil(totalUsers / limit);

        return res.status(200).json({
            success: true,
            currentPage: page,
            limit,
            totalUsers,
            totalPages,
            users
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};
const assignAgent = async (req, res) => {
try {

    const { id } = req.params;
    const { agent_id } = req.body;

    if (!agent_id) {
        return res.status(400).json({
            success: false,
            message: "Agent ID is required"
        });
    }

    const booking = await assignAgentByAdmin(
        id,
        agent_id
    );

    if (!booking) {
        return res.status(404).json({
            success: false,
            message: "Booking not found"
        });
    }

    await redisClient.del(CACHE_KEYS.ADMIN_DASHBOARD);

    return res.status(200).json({
        success: true,
        message: "Agent assigned successfully",
        booking
    });

} catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message
    });

}
};

const updateAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const agent = await  updateAgentModel(
            id,
            name,
            email,
            phone
        );

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found "
            
            });

        }  

        return res.status(200).json({
            success: true,
            message: "Agent updated successfully",
            agent
        });
       
        }   
        catch (error) {
          return res.status(500).json({
            success: false,
            message: error.message
          });

    }
};

const deleteAgent= async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await  deleteAgentModel(
            id,
            req.user.id
        );

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found or already deleted"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Agent deleted successfully",
            agent
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const getDeletedAgentsList = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "deleted_at";
        const order = (req.query.order || "DESC").toUpperCase();

        const allowedSortFields = [
            "deleted_at",
            "name",
            "email"
        ];

        const allowedOrder = [
            "ASC",
            "DESC"
        ];

        if (!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort field"
            });
        }

        if (!allowedOrder.includes(order)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sort order"
            });
        }

        const agents = await getDeletedAgents(
            limit,
            offset,
            search,
            sortBy,
            order
        );

        return res.status(200).json({
            success: true,
            currentPage: page,
            limit,
            totalDeletedAgents: agents.length,
            agents
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const restoreAgent = async (req, res) => {
    try {

        const { id } = req.params;

        const agent = await restoreAgentModel(id);

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found or already active"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Agent restored successfully",
            agent
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
    getUsers,
    getBookings,
    getDashboard,
    updateBookingStatus,
    createAgent,
    assignAgent,
    getAgents,
    updateAgent,
    deleteAgent,
    getDeletedAgentsList,
    restoreAgent
};