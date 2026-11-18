const {
    getProviderProfile,
    upsertProviderProfile,
    getPublicProviderProfile,
    getOnboardingStatus,
} = require("../models/providerProfileModel");
const { invalidatePublic } = require("../middleware/cacheMiddleware");
const { readLatLng } = require("../utils/geo");

function bad(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/** Body ko validate + saaf karo. Error ho to { error } lautao. */
function cleanProfile(body) {
    const str = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);
    const bio = str(body.bio, 1000);
    const skills = str(body.skills, 500);
    const service_area = str(body.service_area, 255);
    const experience_years = body.experience_years === "" || body.experience_years == null ? 0 : Number(body.experience_years);
    const hourly_rate = body.hourly_rate === "" || body.hourly_rate == null ? null : Number(body.hourly_rate);
    const profile_image = str(body.profile_image, 500);

    if (!service_area) return { error: "Service area is required (for example: Kota, Jaipur)." };
    if (!Number.isInteger(experience_years) || experience_years < 0 || experience_years > 60) {
        return { error: "Experience must be a whole number between 0 and 60." };
    }
    if (hourly_rate != null && (!Number.isFinite(hourly_rate) || hourly_rate <= 0 || hourly_rate > 100000)) {
        return { error: "Hourly rate must be between ₹1 and ₹1,00,000." };
    }
    if (profile_image && !/^https:\/\/[^\s]+$/i.test(profile_image)) {
        return { error: "Profile image must be an https:// link." };
    }
    // Map par base location (optional) + kitne km tak kaam karte hain
    const point = readLatLng(body);
    if (point === null) return { error: "Invalid map location. Please pin your base location again." };
    const radius = body.service_radius_km == null || body.service_radius_km === "" ? null : Number(body.service_radius_km);
    if (radius != null && (!Number.isInteger(radius) || radius < 1 || radius > 100)) {
        return { error: "Service radius must be between 1 and 100 km." };
    }
    return {
        data: {
            bio, skills, service_area, experience_years, hourly_rate, profile_image,
            latitude: point?.lat ?? null, longitude: point?.lng ?? null, service_radius_km: radius,
        },
    };
}

/** POST aur PUT /api/provider-profile/profile dono: create ya update. */
const saveProfile = async (req, res, next) => {
    try {
        const { data, error } = cleanProfile(req.body || {});
        if (error) return bad(res, 400, error);
        await upsertProviderProfile(req.user.id, data);
        // naam/email ke saath poora profile lautao
        const profile = await getProviderProfile(req.user.id);
        await invalidatePublic("providers");
        return res.status(200).json({ success: true, message: "Profile saved", profile });
    } catch (error) {
        next(error);
    }
};

/** GET /api/provider-profile/profile -> profile ya null (naya provider) */
const getProfile = async (req, res, next) => {
    try {
        const profile = await getProviderProfile(req.user.id);
        await invalidatePublic("providers");
        return res.status(200).json({ success: true, profile: profile || null });
    } catch (error) {
        next(error);
    }
};

/** GET /api/provider-profile/onboarding -> kya kya baaki hai */
const getOnboarding = async (req, res, next) => {
    try {
        const s = await getOnboardingStatus(req.user.id);
        const steps = [
            { key: "profile", label: "Complete your profile", done: !!s.profile?.service_area },
            { key: "services", label: "Add services and prices", done: s.active_services > 0 },
            { key: "availability", label: "Set your working hours", done: s.availability_slots > 0 },
            {
                key: "documents",
                label: "Upload Aadhaar for verification",
                done: s.documents > 0,
                status: s.approved_documents > 0 ? "approved" : s.rejected_documents > 0 ? "rejected" : s.documents > 0 ? "pending" : "missing",
            },
            { key: "agents", label: "Add your team (optional)", done: s.agents > 0, optional: true },
        ];
        const required = steps.filter((x) => !x.optional);
        return res.status(200).json({
            success: true,
            verified: !!s.profile?.is_verified,
            completed: required.filter((x) => x.done).length,
            total: required.length,
            visible_to_customers: !!s.profile?.service_area && s.active_services > 0,
            steps,
            counts: s,
        });
    } catch (error) {
        next(error);
    }
};

const getPublicProfile = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return bad(res, 400, "Invalid provider id");
        const profile = await getPublicProviderProfile(id);
        if (!profile) return bad(res, 404, "Provider profile not found");
        return res.status(200).json({ success: true, profile });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProfile: saveProfile,
    updateProfile: saveProfile,
    saveProfile,
    getProfile,
    getOnboarding,
    getPublicProfile,
};
