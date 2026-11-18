const geo = require("../services/geoService");
const { readLatLng } = require("../utils/geo");

/** GET /api/geo/search?q=&lat=&lng= */
const searchPlaces = async (req, res, next) => {
    try {
        const q = String(req.query.q || "").trim();
        if (q.length < 3) return res.status(400).json({ success: false, message: "Type at least 3 letters" });
        const near = readLatLng(req.query) || null;
        const results = await geo.search(q, near);
        res.json({ success: true, results });
    } catch (err) {
        if (err.name === "AbortError" || /Geocoder/.test(err.message)) {
            return res.status(503).json({ success: false, message: "Address search is busy. Please type the address or try again." });
        }
        next(err);
    }
};

/** GET /api/geo/reverse?lat=&lng= */
const reversePlace = async (req, res, next) => {
    try {
        const p = readLatLng(req.query);
        if (!p) return res.status(400).json({ success: false, message: "Valid lat and lng are required" });
        const place = await geo.reverse(p.lat, p.lng);
        res.json({ success: true, place });
    } catch (err) {
        if (err.name === "AbortError" || /Geocoder/.test(err.message)) {
            return res.status(503).json({ success: false, message: "Could not find this address right now." });
        }
        next(err);
    }
};

module.exports = { searchPlaces, reversePlace };
