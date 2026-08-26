const {
getServices,
getTotalServices
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


module.exports = {
getAllServices
};