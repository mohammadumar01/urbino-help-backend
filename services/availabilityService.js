const { getDayScheduleAndBookings } = require("../models/providerAvailabilityModel");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_MINUTES = 60;
const MIN_LEAD_MINUTES = 60; // aaj ke liye kam se kam 1 ghante baad ka slot

const toMin = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
};
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** India time (IST) mein abhi ki date aur minute. */
function nowIst() {
    const d = new Date(Date.now() + 5.5 * 3600 * 1000);
    return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

function isTime(v) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));
}

/**
 * Schedule validate karo: din sahi, HH:MM, start < end, ek din mein overlap nahi,
 * har din max 3 ranges. Error message ya null.
 */
function validateSchedule(ranges) {
    if (!Array.isArray(ranges)) return "schedule must be a list";
    if (ranges.length > DAYS.length * 3) return "Too many time ranges";
    const byDay = {};
    for (const r of ranges) {
        if (!DAYS.includes(r?.day_of_week)) return `Invalid day: ${r?.day_of_week}`;
        if (!isTime(r.start_time) || !isTime(r.end_time)) return "Times must be in HH:MM format";
        if (toMin(r.start_time) >= toMin(r.end_time)) return `${r.day_of_week}: start time must be before end time`;
        if (toMin(r.end_time) - toMin(r.start_time) < SLOT_MINUTES) {
            return `${r.day_of_week}: each range must be at least ${SLOT_MINUTES} minutes`;
        }
        (byDay[r.day_of_week] ||= []).push(r);
    }
    for (const [day, list] of Object.entries(byDay)) {
        if (list.length > 3) return `${day}: at most 3 time ranges per day`;
        const sorted = [...list].sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
        for (let i = 1; i < sorted.length; i++) {
            if (toMin(sorted[i].start_time) < toMin(sorted[i - 1].end_time)) return `${day}: time ranges overlap`;
        }
    }
    return null;
}

/**
 * Ek provider ke ek din ke free slots.
 * hasSchedule=false matlab provider ne hours set nahi kiye -> koi bhi time chalega.
 */
async function getFreeSlots(providerId, date) {
    const { ranges, bookedTimes, hasSchedule } = await getDayScheduleAndBookings(providerId, date);
    const booked = new Set(bookedTimes);
    const now = nowIst();
    const slots = [];
    for (const r of ranges) {
        for (let t = toMin(r.start_time); t + SLOT_MINUTES <= toMin(r.end_time); t += SLOT_MINUTES) {
            const hhmm = toHHMM(t);
            if (booked.has(hhmm)) continue;
            if (date === now.date && t < now.minutes + MIN_LEAD_MINUTES) continue;
            if (!slots.includes(hhmm)) slots.push(hhmm);
        }
    }
    return { hasSchedule, slots, slotMinutes: SLOT_MINUTES };
}

module.exports = { DAYS, SLOT_MINUTES, validateSchedule, getFreeSlots, isTime };
