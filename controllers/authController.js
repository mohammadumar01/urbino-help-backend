const ROLES = require("../constants/roles");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { createUser, findUserByEmail } = require("../models/userModel");

// Public signup se sirf ye roles ban sakte hain (admin/agent kabhi nahi)
// Professional (agent) khud sign up karke provider ka invite accept karta hai
const SIGNUP_ROLES = [ROLES.CUSTOMER, ROLES.PROVIDER, ROLES.AGENT];

const register = async (req, res) => {
    try {
        const { name, password, phone, role } = req.body;
        const email = String(req.body.email || "").trim().toLowerCase();

        // Required fields
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Role: valid ho to wahi, warna customer
        const userRole = SIGNUP_ROLES.includes(role) ? role : ROLES.CUSTOMER;

        // Email already registered?
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Password hash
        const hashedPassword = await bcrypt.hash(password, 10);

        // User create
        const created = await createUser(
            name,
            email,
            hashedPassword,
            phone,
            userRole
        );

        // Password hash response me nahi bhejna
        const user = {
            id: created.id,
            name: created.name,
            email: created.email,
            phone: created.phone,
            role: created.role
        };

        return res.status(201).json({
            success: true,
            message: "User Registered Successfully",
            user
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and Password are required"
            });
        }

        const user = await findUserByEmail(email);

        // Same message dono cases me, taaki koi ye na jaan sake ki email registered hai ya nahi
        // Deleted (soft-delete) account se login nahi hona chahiye
        if (!user || user.is_deleted) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role === ROLES.USER ? ROLES.CUSTOMER : user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role === ROLES.USER ? ROLES.CUSTOMER : user.role,
            must_change_password: Boolean(user.must_change_password)
        };

        return res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            user: userResponse
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    register,
    login
};