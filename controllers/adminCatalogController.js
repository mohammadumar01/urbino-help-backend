const pool = require("../config/db");
const { invalidatePublic } = require("../middleware/cacheMiddleware");

const bad = (res, s, m) => res.status(s).json({ success: false, message: m });
const str = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);

async function refreshPublic() {
    await invalidatePublic("catalog", "providers");
}

/** GET /api/admin/catalog/services?search=&category_id=&status=active|inactive */
const listServices = async (req, res, next) => {
    try {
        const values = [];
        let where = "WHERE 1=1";
        if (req.query.search) {
            values.push(`%${String(req.query.search).slice(0, 80)}%`);
            where += ` AND (s.name ILIKE $${values.length} OR s.description ILIKE $${values.length})`;
        }
        if (Number(req.query.category_id)) {
            values.push(Number(req.query.category_id));
            where += ` AND s.category_id = $${values.length}`;
        }
        if (req.query.status === "active") where += " AND s.is_active";
        if (req.query.status === "inactive") where += " AND NOT s.is_active";

        const r = await pool.query(
            `
            SELECT s.id, s.name, s.description, s.base_price::float AS base_price, s.is_active, s.category_id,
                   c.name AS category_name, s.created_at, s.updated_at,
                   (SELECT COUNT(*) FROM provider_services ps WHERE ps.service_id = s.id AND ps.is_active)::int AS providers,
                   (SELECT MIN(ps.price)::float FROM provider_services ps WHERE ps.service_id = s.id AND ps.is_active) AS min_price,
                   (SELECT COUNT(*) FROM bookings bk WHERE bk.service_id = s.id)::int AS bookings,
                   (SELECT COUNT(*) FROM bookings bk WHERE bk.service_id = s.id AND bk.created_at >= now() - interval '30 days')::int AS bookings_30d,
                   (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN bookings bk ON bk.id = p.booking_id
                     WHERE bk.service_id = s.id AND p.payment_status = 'successful')::float AS revenue
            FROM services s
            JOIN categories c ON c.id = s.category_id
            ${where}
            ORDER BY c.name, s.name
            `,
            values
        );
        res.json({ success: true, services: r.rows });
    } catch (e) {
        next(e);
    }
};

function cleanService(body, partial) {
    const out = {};
    if (!partial || body.name !== undefined) {
        out.name = str(body.name, 120);
        if (!out.name || out.name.length < 3) return { error: "Service name must be at least 3 characters." };
    }
    if (!partial || body.category_id !== undefined) {
        out.category_id = Number(body.category_id);
        if (!Number.isInteger(out.category_id) || out.category_id <= 0) return { error: "Choose a category." };
    }
    if (body.description !== undefined) out.description = str(body.description, 2000);
    if (!partial || body.base_price !== undefined) {
        out.base_price = Number(body.base_price);
        if (body.base_price === "" || !Number.isFinite(out.base_price) || out.base_price < 0 || out.base_price > 500000) {
            return { error: "Starting price must be between ₹0 and ₹5,00,000." };
        }
    }
    if (body.is_active !== undefined) out.is_active = Boolean(body.is_active);
    return { data: out };
}

function dbError(res, e, next) {
    if (e.code === "23505") return bad(res, 409, "This category already has a service with that name.");
    if (e.code === "23503") return bad(res, 400, "Category not found.");
    return next(e);
}

/** POST /api/admin/catalog/services */
const createService = async (req, res, next) => {
    try {
        const { data, error } = cleanService(req.body || {}, false);
        if (error) return bad(res, 400, error);
        const r = await pool.query(
            `INSERT INTO services (name, category_id, description, base_price, is_active)
             VALUES ($1, $2, $3, $4, COALESCE($5, TRUE)) RETURNING *`,
            [data.name, data.category_id, data.description ?? null, data.base_price, data.is_active ?? null]
        );
        await refreshPublic();
        res.status(201).json({ success: true, message: "Service added", service: r.rows[0] });
    } catch (e) {
        dbError(res, e, next);
    }
};

/** PUT /api/admin/catalog/services/:id  (partial; is_active = hide/show for customers) */
const updateService = async (req, res, next) => {
    try {
        const { data, error } = cleanService(req.body || {}, true);
        if (error) return bad(res, 400, error);
        const keys = Object.keys(data);
        if (!keys.length) return bad(res, 400, "Nothing to update.");
        // keys sirf cleanService se aate hain (whitelist), user input nahi
        const sets = keys.map((k, i) => `${k} = $${i + 2}`);
        const r = await pool.query(
            `UPDATE services SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [Number(req.params.id), ...keys.map((k) => data[k])]
        );
        if (!r.rows[0]) return bad(res, 404, "Service not found.");
        await refreshPublic();
        const message = data.is_active === false ? "Service hidden from customers" : data.is_active === true ? "Service is live again" : "Service updated";
        res.json({ success: true, message, service: r.rows[0] });
    } catch (e) {
        dbError(res, e, next);
    }
};

/** GET /api/admin/catalog/categories */
const listCategories = async (req, res, next) => {
    try {
        const r = await pool.query(`
            SELECT c.id, c.name, c.description, c.is_active, c.created_at,
                   COUNT(s.id)::int AS services,
                   COUNT(s.id) FILTER (WHERE s.is_active)::int AS active_services
            FROM categories c LEFT JOIN services s ON s.category_id = c.id
            GROUP BY c.id ORDER BY c.name`);
        res.json({ success: true, categories: r.rows });
    } catch (e) {
        next(e);
    }
};

/** POST /api/admin/catalog/categories { name, description? } */
const createCategory = async (req, res, next) => {
    try {
        const name = str(req.body?.name, 80);
        if (!name || name.length < 3) return bad(res, 400, "Category name must be at least 3 characters.");
        const r = await pool.query("INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *", [
            name,
            str(req.body?.description, 500),
        ]);
        await refreshPublic();
        res.status(201).json({ success: true, message: "Category added", category: r.rows[0] });
    } catch (e) {
        if (e.code === "23505") return bad(res, 409, "A category with this name already exists.");
        next(e);
    }
};

/** PUT /api/admin/catalog/categories/:id { name?, description?, is_active? } */
const updateCategory = async (req, res, next) => {
    try {
        const b = req.body || {};
        const name = b.name !== undefined ? str(b.name, 80) : undefined;
        if (name !== undefined && (!name || name.length < 3)) return bad(res, 400, "Category name must be at least 3 characters.");
        const r = await pool.query(
            `UPDATE categories SET
                name = COALESCE($2, name),
                description = CASE WHEN $3::boolean THEN $4 ELSE description END,
                is_active = COALESCE($5, is_active)
             WHERE id = $1 RETURNING *`,
            [
                Number(req.params.id),
                name ?? null,
                b.description !== undefined,
                str(b.description, 500),
                b.is_active === undefined ? null : Boolean(b.is_active),
            ]
        );
        if (!r.rows[0]) return bad(res, 404, "Category not found.");
        await refreshPublic();
        res.json({ success: true, message: "Category updated", category: r.rows[0] });
    } catch (e) {
        if (e.code === "23505") return bad(res, 409, "A category with this name already exists.");
        next(e);
    }
};

module.exports = { listServices, createService, updateService, listCategories, createCategory, updateCategory };
