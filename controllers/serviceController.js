const {
    getServices,
    getTotalServices,
    getServiceById: findServiceById
} = require("../models/serviceModel");


const getAllServices = async (req, res) => {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const offset = (page - 1) * limit;

        const search = req.query.search || "";
        const categoryId = req.query.category_id || "";


        if (page < 1 || limit < 1 || limit > 100) {

            return res.status(400).json({
                success: false,
                message: "Invalid page or limit"
            });
        }


        if (
            categoryId &&
            !Number.isInteger(Number(categoryId))
        ) {

            return res.status(400).json({
                success: false,
                message: "category_id must be an integer"
            });
        }


        const services = await getServices(
            search,
            categoryId,
            limit,
            offset
        );


        const totalServices = await getTotalServices(
            search,
            categoryId
        );


        const totalPages = Math.max(
            1,
            Math.ceil(totalServices / limit)
        );


        return res.status(200).json({

            success: true,

            currentPage: page,

            limit,

            totalServices,

            totalPages,

            services

        });

    } catch (error) {

        console.error(
            "Get Services Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


const getServiceById = async (req, res) => {

    try {

        const id = Number(req.params.id);


        if (
            !Number.isInteger(id) ||
            id < 1
        ) {

            return res.status(400).json({
                success: false,
                message: "Service ID must be a positive integer"
            });
        }


        const service = await findServiceById(id);


        if (!service) {

            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }


        return res.status(200).json({

            success: true,

            service

        });

    } catch (error) {

        console.error(
            "Get Service By ID Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


module.exports = {
    getAllServices,
    getServiceById
};