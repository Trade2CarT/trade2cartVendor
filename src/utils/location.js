// Shared pickup-location helpers.
// An order's location should come from the ORDER, not the customer's profile:
// `users/{uid}` address/lastLat/lastLng are overwritten on every booking, so an
// older open order would otherwise point at the customer's newest address.
// Preference: assignment.pickup (written by admin at assign time) → the order's
// wasteEntry (exactLat/exactLng/address) → legacy customer profile fields.

const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// Take address AND coordinates from ONE source — never mix, or a typed-address
// order would borrow GPS from the customer's newer booking.
export const getPickup = (order, userProfile, entry) => {
    const source = order?.pickup
        ? { address: order.pickup.address, lat: order.pickup.lat, lng: order.pickup.lng }
        : entry
            ? { address: entry.address, lat: entry.exactLat, lng: entry.exactLng }
            : { address: userProfile?.address, lat: userProfile?.lastLat, lng: userProfile?.lastLng };
    const lat = num(source.lat);
    const lng = num(source.lng);
    const hasCoords = lat !== null && lng !== null;
    return {
        address: source.address || '',
        lat: hasCoords ? lat : null,
        lng: hasCoords ? lng : null,
        hasCoords,
    };
};

// Google Maps turn-by-turn link. Falls back to the typed address when the
// customer booked without GPS; null when there is nothing to navigate to.
export const directionsUrl = ({ lat, lng, address } = {}) => {
    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    if (address && address.trim()) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
    }
    return null;
};

export const haversineKm = (a, b) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
};

export const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
