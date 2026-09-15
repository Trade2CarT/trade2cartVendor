// Fire-and-forget admin email for app events. Handled by the admin app's
// api/notify.js (see the event types listed there). Never blocks or throws —
// a failed email must not break registration, billing, etc.
const NOTIFY_URL = 'https://trade2cart.trade.admin.trade2cart.in/api/notify';

export const notifyAdmin = (type, details = {}) => {
    try {
        fetch(NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, ...details }),
            keepalive: true, // still delivered if the page navigates away right after
        }).catch(() => {});
    } catch { /* ignore */ }
};
