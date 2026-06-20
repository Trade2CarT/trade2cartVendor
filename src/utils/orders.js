// Shared order helpers.
// The vendor, customer, and admin apps share one Firebase DB and have written
// order status / timestamps with inconsistent casing and field names over time
// ("Completed" vs "completed", `completedAt` vs `timestamp`). These readers stay
// tolerant of every variant so completed orders, earnings, and history never
// silently disappear — without changing what other apps write.

const norm = (status) => String(status ?? '').trim().toLowerCase();

export const isCompleted = (order) => norm(order?.status) === 'completed';
export const isAssigned = (order) => norm(order?.status) === 'assigned';

// Best available "when did this happen" timestamp, newest-meaningful first.
export const getOrderTime = (order) =>
    order?.completedAt || order?.timestamp || order?.processedAt || order?.assignedAt || null;

export const isToday = (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d) && d.toDateString() === new Date().toDateString();
};
