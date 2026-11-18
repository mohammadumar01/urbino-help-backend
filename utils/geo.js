/** Do points ke beech seedhi doori (km). */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (d) => (Number(d) * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Shehar mein andaazan pahunchne ka samay: sadak seedhi line se ~1.35x lambi,
 * average speed ~22 km/h (traffic). Kam se kam 2 minute.
 */
function etaMinutes(distanceKm) {
    if (distanceKm == null) return null;
    return Math.max(2, Math.round(((distanceKm * 1.35) / 22) * 60));
}

/** lat/lng body/query se padho; galat ho to null, dono na hon to undefined. */
function readLatLng(src = {}) {
    const hasAny = src.latitude != null || src.longitude != null || src.lat != null || src.lng != null;
    if (!hasAny) return undefined;
    const lat = Number(src.latitude ?? src.lat);
    const lng = Number(src.longitude ?? src.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/** SQL snippet: haversine km (Postgres mein, PostGIS ke bina). */
const SQL_DISTANCE_KM = (latA, lngA, latB, lngB) => `(
    6371 * 2 * asin(sqrt(
        power(sin(radians((${latB}) - (${latA})) / 2), 2) +
        cos(radians(${latA})) * cos(radians(${latB})) * power(sin(radians((${lngB}) - (${lngA})) / 2), 2)
    ))
)`;

module.exports = { haversineKm, etaMinutes, readLatLng, SQL_DISTANCE_KM };
