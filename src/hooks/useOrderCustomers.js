import { useEffect, useRef, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

// Loads ONLY the customers behind this vendor's own orders (users/{id}), and —
// for legacy orders with no `pickup` — the order's first wasteEntry so its
// location can be shown. Never subscribes to the whole `users` / `wasteEntries`
// nodes, which exposed every customer's address, phone and OTP to all vendors.
const useOrderCustomers = (orders, { withEntries = false } = {}) => {
    const [usersMap, setUsersMap] = useState({});
    const [entriesMap, setEntriesMap] = useState({});
    const requested = useRef({ users: new Set(), entries: new Set() });

    const userIds = [...new Set(orders.map(o => o.userId).filter(Boolean))].sort();
    const entryIds = withEntries
        ? [...new Set(orders.filter(o => !o.pickup).map(o => o.entryIds?.[0]).filter(Boolean))].sort()
        : [];
    const userKey = userIds.join('|');
    const entryKey = entryIds.join('|');

    const loadMissing = (ids, kind, path, setter) => {
        const seen = requested.current[kind];
        const missing = ids.filter(id => !seen.has(id));
        if (!missing.length) return;
        missing.forEach(id => seen.add(id));
        Promise.all(missing.map(id =>
            get(ref(db, `${path}/${id}`))
                .then(snap => [id, snap.val()])
                .catch(() => { seen.delete(id); return [id, null]; })
        )).then(pairs => {
            setter(prev => {
                const next = { ...prev };
                pairs.forEach(([id, val]) => { if (val) next[id] = val; });
                return next;
            });
        });
    };

    useEffect(() => {
        loadMissing(userIds, 'users', 'users', setUsersMap);
    }, [userKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        loadMissing(entryIds, 'entries', 'wasteEntries', setEntriesMap);
    }, [entryKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return { usersMap, entriesMap };
};

export default useOrderCustomers;
