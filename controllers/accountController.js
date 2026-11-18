const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const bad = (res, s, m) => res.status(s).json({ success: false, message: m });
const PHONE = /^[6-9]\d{9}$/;
const cleanPhone = (p) => String(p ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");

function passwordProblem(pw) {
    if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters.";
    if (pw.length > 72) return "Password is too long (max 72 characters).";
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use at least one letter and one number.";
    return null;
}

/** GET /api/account/me */
const me = async (req, res, next) => {
    try {
        const r = await pool.query(
            "SELECT id, name, email, phone, role, created_at, must_change_password FROM users WHERE id = $1 AND is_deleted IS NOT TRUE",
            [req.user.id]
        );
        if (!r.rows[0]) return bad(res, 404, "Account not found");
        const u = r.rows[0];
        res.json({ success: true, user: { ...u, role: u.role === "user" ? "customer" : u.role } });
    } catch (e) {
        next(e);
    }
};

/** PUT /api/account/profile { name, phone }  (har role) */
const updateProfile = async (req, res, next) => {
    try {
        const name = String(req.body?.name ?? "").trim().replace(/\s+/g, " ");
        const phone = cleanPhone(req.body?.phone);
        if (name.length < 2 || name.length > 80) return bad(res, 400, "Enter your full name (2-80 characters).");
        if (!PHONE.test(phone)) return bad(res, 400, "Enter a valid 10-digit Indian mobile number.");
        const r = await pool.query(
            "UPDATE users SET name = $2, phone = $3 WHERE id = $1 AND is_deleted IS NOT TRUE RETURNING id, name, email, phone, role",
            [req.user.id, name, phone]
        );
        if (!r.rows[0]) return bad(res, 404, "Account not found");
        const u = r.rows[0];
        res.json({ success: true, message: "Profile updated", user: { ...u, role: u.role === "user" ? "customer" : u.role } });
    } catch (e) {
        next(e);
    }
};

/** PUT /api/account/password { current_password, new_password } */
const changePassword = async (req, res, next) => {
    try {
        const { current_password: current, new_password: next_ } = req.body || {};
        const problem = passwordProblem(next_);
        if (problem) return bad(res, 400, problem);
        const r = await pool.query("SELECT password FROM users WHERE id = $1 AND is_deleted IS NOT TRUE", [req.user.id]);
        if (!r.rows[0]) return bad(res, 404, "Account not found");
        if (!current || !(await bcrypt.compare(String(current), r.rows[0].password))) {
            return bad(res, 400, "Your current password is not correct.");
        }
        if (await bcrypt.compare(next_, r.rows[0].password)) return bad(res, 400, "New password must be different from the old one.");
        await pool.query(
            "UPDATE users SET password = $2, must_change_password = FALSE, password_changed_at = CURRENT_TIMESTAMP WHERE id = $1",
            [req.user.id, await bcrypt.hash(next_, 10)]
        );
        res.json({ success: true, message: "Password changed" });
    } catch (e) {
        next(e);
    }
};

const mailer = require("../services/mailer");

const CODE_MINUTES = 15;
const hashCode = (userId, code) =>
    crypto.createHmac("sha256", process.env.JWT_SECRET || "urbino").update(`${userId}:${code}`).digest("hex");

/** Call wala tareeka: support team verify karke admin panel se temporary password deti hai */
async function requestCallback(user, phone) {
    const open = await pool.query(
        "SELECT 1 FROM support_tickets WHERE user_id = $1 AND category = 'account' AND status <> 'resolved' AND message LIKE 'Password reset%' LIMIT 1",
        [user.id]
    );
    if (!open.rows[0]) {
        await pool.query(
            `INSERT INTO support_tickets (user_id, name, phone, category, message)
             VALUES ($1, $2, $3, 'account', $4)`,
            [user.id, user.name, phone, "Password reset requested. Call the registered number to verify, then use Users > Reset password."]
        );
    }
}

/**
 * POST /api/account/forgot-password { email, phone? }
 *  - Email (SMTP) chalu ho: 6-digit code email par (15 min). channel = "email"
 *  - Warna: support team registered number par call karegi. channel = "call" (phone zaroori)
 * Jawab hamesha same - koi pata na laga sake ki account hai ya nahi.
 */
const forgotPassword = async (req, res, next) => {
    try {
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const phone = cleanPhone(req.body?.phone);
        const viaEmail = mailer.mailEnabled();
        if (!email.includes("@")) return bad(res, 400, "Enter the email on your account.");
        if (!viaEmail && !PHONE.test(phone)) return bad(res, 400, "Enter your email and the 10-digit mobile number on your account.");

        const u = await pool.query("SELECT id, name, phone FROM users WHERE lower(email) = $1 AND is_deleted IS NOT TRUE", [email]);
        const user = u.rows[0];

        if (viaEmail) {
            let debugCode;
            if (user) {
                // 1 minute mein ek hi code (email spam se bachav)
                const recent = await pool.query(
                    "SELECT 1 FROM password_reset_codes WHERE user_id = $1 AND created_at > now() - interval '60 seconds' LIMIT 1",
                    [user.id]
                );
                if (!recent.rows[0]) {
                    const code = String(crypto.randomInt(100000, 1000000));
                    await pool.query("UPDATE password_reset_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [user.id]);
                    await pool.query(
                        "INSERT INTO password_reset_codes (user_id, code_hash, expires_at) VALUES ($1, $2, now() + ($3 || ' minutes')::interval)",
                        [user.id, hashCode(user.id, code), String(CODE_MINUTES)]
                    );
                    try {
                        await mailer.sendMail({ to: email, ...mailer.resetCodeEmail(user.name, code, CODE_MINUTES) });
                    } catch (err) {
                        // Email fail ho to call wala tareeka backup
                        console.error("[mail] reset code:", err.message);
                        if (PHONE.test(cleanPhone(user.phone))) await requestCallback(user, cleanPhone(user.phone));
                    }
                    if (mailer.isDebug()) debugCode = code;
                }
            }
            return res.json({
                success: true,
                channel: "email",
                message: `If an account exists for this email, we've sent a 6-digit code to it. It expires in ${CODE_MINUTES} minutes.`,
                ...(debugCode ? { debug_code: debugCode } : {}),
            });
        }

        if (user && cleanPhone(user.phone) === phone) await requestCallback(user, phone);
        res.json({
            success: true,
            channel: "call",
            message: "If these details match an account, our team will call your registered number within a few hours to reset your password.",
        });
    } catch (e) {
        next(e);
    }
};

/** POST /api/account/reset-password { email, code, new_password } */
const resetPassword = async (req, res, next) => {
    try {
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const code = String(req.body?.code ?? "").replace(/[^0-9]/g, "");
        const problem = passwordProblem(req.body?.new_password);
        if (problem) return bad(res, 400, problem);
        const wrong = () => bad(res, 400, "That code is wrong or has expired. Ask for a new code.");
        if (!email.includes("@") || code.length !== 6) return wrong();

        const u = await pool.query("SELECT id FROM users WHERE lower(email) = $1 AND is_deleted IS NOT TRUE", [email]);
        const user = u.rows[0];
        if (!user) return wrong();
        const r = await pool.query(
            `SELECT id, code_hash, attempts FROM password_reset_codes
             WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()
             ORDER BY created_at DESC LIMIT 1`,
            [user.id]
        );
        const row = r.rows[0];
        if (!row || row.attempts >= 5) return wrong();
        const ok = crypto.timingSafeEqual(Buffer.from(row.code_hash.trim(), "hex"), Buffer.from(hashCode(user.id, code), "hex"));
        if (!ok) {
            await pool.query("UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1", [row.id]);
            return wrong();
        }
        await pool.query("UPDATE password_reset_codes SET used_at = now() WHERE id = $1", [row.id]);
        await pool.query(
            "UPDATE users SET password = $2, must_change_password = FALSE, password_changed_at = CURRENT_TIMESTAMP WHERE id = $1",
            [user.id, await bcrypt.hash(req.body.new_password, 10)]
        );
        res.json({ success: true, message: "Password reset. You can log in with your new password." });
    } catch (e) {
        next(e);
    }
};

/** GET /api/account/reset-options -> frontend jaane ki email code chalega ya call */
const resetOptions = (req, res) => res.json({ success: true, channel: mailer.mailEnabled() ? "email" : "call" });

/** POST /api/admin/users/:id/reset-password  -> ek baar dikhne wala temporary password */
const adminResetPassword = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (id === req.user.id) return bad(res, 400, "Use 'Change password' for your own account.");
        // Aasaan padhne layak: 3 letters + 4 digits + 1 letter (0/O, 1/l jaise confusing chars nahi)
        const letters = "abcdefghjkmnpqrstuvwxyz";
        const pick = (s) => s[crypto.randomInt(s.length)];
        const temp = `${pick(letters).toUpperCase()}${pick(letters)}${pick(letters)}${crypto.randomInt(1000, 9999)}${pick(letters)}`;
        const r = await pool.query(
            `UPDATE users SET password = $2, must_change_password = TRUE, password_changed_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND is_deleted IS NOT TRUE RETURNING id, name, email`,
            [id, await bcrypt.hash(temp, 10)]
        );
        if (!r.rows[0]) return bad(res, 404, "User not found");
        await pool.query(
            `UPDATE support_tickets SET status = 'resolved', resolved_by = $2, admin_note = 'Temporary password issued', updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND category = 'account' AND status <> 'resolved' AND message LIKE 'Password reset%'`,
            [id, req.user.id]
        );
        res.json({
            success: true,
            message: `Temporary password created for ${r.rows[0].name}. Tell it to them on a call; they must change it after logging in.`,
            temporary_password: temp,
        });
    } catch (e) {
        next(e);
    }
};

module.exports = { me, updateProfile, changePassword, forgotPassword, resetPassword, resetOptions, adminResetPassword, passwordProblem };
