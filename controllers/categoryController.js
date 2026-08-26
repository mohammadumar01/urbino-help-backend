const {
getAllCategories
} = require("../models/categoryModel");

const getCategories = async (req, res) => {
try {

    const categories = await getAllCategories();

    return res.status(200).json({
        success: true,
        categories
    });

} catch (error) {

    console.error("Get Categories Error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}
};

module.exports = {
getCategories
};