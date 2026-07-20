import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const HREF_BY_TYPE = {
    customer_created: '/connect/finance/accounts',
    customer_profile_imported: '/connect/finance/accounts',
    quote_created: '/connect/finance/quotes',
    payment_charged: '/connect/finance/activity',
    payment_declined: '/connect/finance/activity',
    commission_recorded: '/connect/finance/activity',
};

// Reads the append-only FinanceActivityLog feed (written server-side at the
// point each event happens) — both the Notifications and Recent header
// popovers read this, just render different slice sizes/styling.
export function useRecentEvents(limit = 20) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        fetch(`${BASE}/v1/finance/activity-log?limit=${limit}`, { headers: authH(), credentials: 'include' })
            .then((r) => r.json())
            .then((j) => {
                const rows = j.status ? (j.data || []) : [];
                setEvents(rows.map((e) => ({
                    id: e._id,
                    type: e.type,
                    title: e.title,
                    sub: e.sub,
                    at: e.createdAt,
                    href: HREF_BY_TYPE[e.type] || '/connect/finance/activity',
                })));
            })
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    };

    useEffect(load, [limit]);
    return { events, loading, reload: load };
}
