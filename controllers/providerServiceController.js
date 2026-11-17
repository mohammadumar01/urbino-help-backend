const m = require("../models/providerServiceModel");

const MAX_PRICE = 500000;

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

function parsePrice(v) {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Math.round(Number(v) * 100) / 100;
    return Number.isFinite(n) && n > 0 && n <= MAX_PRICE ? n : NaN;
}

const getServices = async (req, res, next) => {
    try {
        const services = await m.getProviderServices(req.user.id);
        res.status(200).json({ success: true, services });
    } catch (error) {
        next(error);
    }
};

/** POST /api/provider-services { service_id, price? }  price na ho to service ka base price */
const addService = async (req, res, next) => {
    try {
        const serviceId = Number(req.body.service_id);
        if (!Number.isInteger(serviceId) || serviceId <= 0) return bad(res, 400, "Choose a valid service");

        const service = await m.serviceExists(serviceId);
        if (!service) return bad(res, 404, "Service not found");

        let price = parsePrice(req.body.price);
        if (Number.isNaN(price)) return bad(res, 400, `Price must be between ₹1 and ₹${MAX_PRICE.toLocaleString("en-IN")}`);
        if (price === undefined) price = Number(service.base_price);
        if (!price) return bad(res, 400, "Please set a price for this service");

        const row = await m.addProviderService(req.user.id, serviceId, price);
        res.status(201).json({ success: true, message: "Service added", service: row });
    } catch (error) {
        if (error.code === "23505") return bad(res, 409, "You already offer this service");
        next(error);
    }
};

/** PUT /api/provider-services/:serviceId { price?, is_active? } */
const updateService = async (req, res, next) => {
    try {
        const price = parsePrice(req.body.price);
        if (Number.isNaN(price)) return bad(res, 400, `Price must be between ₹1 and ₹${MAX_PRICE.toLocaleString("en-IN")}`);
        const is_active = typeof req.body.is_active === "boolean" ? req.body.is_active : undefined;
        if (price === undefined && is_active === undefined) return bad(res, 400, "Nothing to update");

        const row = await m.updateProviderService(req.user.id, Number(req.params.serviceId), { price, is_active });
        if (!row) return bad(res, 404, "You don't offer this service");
        res.status(200).json({ success: true, message: "Service updated", service: row });
    } catch (error) {
        next(error);
    }
};

const deleteService = async (req, res, next) => {
    try {
        const row = await m.deleteProviderService(req.user.id, Number(req.params.serviceId));
        if (!row) return bad(res, 404, "You don't offer this service");
        res.status(200).json({ success: true, message: "Service removed", service: row });
    } catch (error) {
        next(error);
    }
};

module.exports = { getServices, addService, updateService, deleteService };
