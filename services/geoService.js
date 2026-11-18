/**
 * Address search + reverse geocoding (OpenStreetMap Nominatim, bina API key).
 * - Server se call karte hain taaki User-Agent/policy follow ho aur Redis cache lage.
 * - Production mein apna geocoder (self-hosted Nominatim / paid) GEOCODER_URL se laga sakte ho.
 */
const redisClient = require("../config/redis");

const BASE = (process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
const COUNTRY = process.env.GEOCODER_COUNTRY ?? "in";
const UA = process.env.GEOCODER_USER_AGENT || "UrbinoHelp/1.0 (service marketplace)";
const TTL = 7 * 24 * 3600;

// Nominatim policy: max ~1 request/second. Har worker mein chhoti queue.
let last = 0;
async function politeFetch(url) {
    const wait = Math.max(0, last + 1100 - Date.now());
    last = Date.now() + wait;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
        const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: ctrl.signal });
        if (!r.ok) throw new Error(`Geocoder responded ${r.status}`);
        return await r.json();
    } finally {
        clearTimeout(timer);
    }
}

async function cached(key, fn) {
    const hit = await redisClient.get(key);
    if (hit) return JSON.parse(hit);
    const value = await fn();
    await redisClient.setEx(key, TTL, JSON.stringify(value)).catch(() => {});
    return value;
}

function shape(p) {
    const a = p.address || {};
    return {
        label: p.display_name,
        short: [a.road || a.neighbourhood || a.suburb, a.suburb && a.road ? a.suburb : null, a.city || a.town || a.village || a.county]
            .filter(Boolean)
            .join(", ") || p.display_name,
        city: a.city || a.town || a.village || a.county || null,
        state: a.state || null,
        pincode: a.postcode || null,
        latitude: Number(p.lat),
        longitude: Number(p.lon),
    };
}

async function search(q, near) {
    const query = String(q).trim().slice(0, 120);
    const params = new URLSearchParams({ q: query, format: "jsonv2", addressdetails: "1", limit: "6" });
    if (COUNTRY) params.set("countrycodes", COUNTRY);
    if (near) {
        // Customer ke aas-paas ke results pehle (bounded nahi, sirf preference)
        const d = 0.6;
        params.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
    }
    const key = `geo:s:${query.toLowerCase()}:${near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : ""}`;
    return cached(key, async () => (await politeFetch(`${BASE}/search?${params}`)).map(shape));
}

async function reverse(lat, lng) {
    // ~11 m tak round: cache hit zyada, privacy bhi behtar
    const rl = lat.toFixed(4);
    const rg = lng.toFixed(4);
    return cached(`geo:r:${rl},${rg}`, async () => {
        const p = await politeFetch(`${BASE}/reverse?lat=${rl}&lon=${rg}&format=jsonv2&addressdetails=1&zoom=18`);
        if (!p || p.error) return null;
        return shape(p);
    });
}

module.exports = { search, reverse };
