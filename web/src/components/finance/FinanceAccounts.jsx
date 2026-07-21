import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateMenu from './CreateMenu';
import DocEditor from './DocEditor';
import CreateCustomerModal from './CreateCustomerModal';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function useCustomers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = () => {
        setLoading(true);
        fetch(`${BASE}/v1/finance/customers`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setCustomers(j.data || []); else setError(j.error || 'Failed'); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);
    return { customers, loading, error, reload: load };
}

function useTransactions() {
    const [txns, setTxns] = useState([]);
    const [txnsLoading, setTxnsLoading] = useState(true);
    useEffect(() => {
        fetch(`${BASE}/v1/finance/transactions`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setTxns(j.data || []); })
            .catch(() => {})
            .finally(() => setTxnsLoading(false));
    }, []);
    return { txns, txnsLoading };
}

// Invoices + quotes — only fetched here to compute the "Needs Attention"
// per-customer signals below; each falls back to the design's mock row
// when no customer in this company qualifies for that signal yet.
function useAccountSignals() {
    const [invoices, setInvoices] = useState([]);
    const [quotes, setQuotes] = useState([]);
    useEffect(() => {
        Promise.all([
            fetch(`${BASE}/v1/finance/invoices`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
            fetch(`${BASE}/v1/finance/quotes`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
        ]).then(([inv, qs]) => {
            if (inv?.status) setInvoices(inv.data || []);
            if (qs?.status) setQuotes(qs.data || []);
        });
    }, []);
    return { invoices, quotes };
}

const SparkleIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
        <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
    </svg>
);

// Placeholder portfolio table — real per-customer invoice/YTD/outstanding
// rollups aren't computed yet; swap for real data once that's wired up.
const MOCK_CUSTOMERS = [
    { name: 'Crestline Manufacturing', type: 'Manufacturing', avatar: '#8B5CF6', since: 'Jan 2020', invoices: 42, ytd: 450000, outstanding: 28400, overdue: 0, status: { label: 'High value', tone: 'violet' } },
    { name: 'Solara Industries', type: 'Industrial', avatar: '#3B82F6', since: 'Apr 2021', invoices: 28, ytd: 320000, outstanding: 18500, overdue: 0, status: { label: 'High value', tone: 'violet' } },
    { name: 'Westbridge Capital', type: 'Financial Services', avatar: '#7C3AED', since: 'Nov 2020', invoices: 22, ytd: 290000, outstanding: 0, overdue: 0, status: { label: 'High value', tone: 'violet' } },
    { name: 'Vertex Systems', type: 'Industrial Equipment & Services', avatar: '#1F2937', since: 'Jan 2023', invoices: 24, ytd: 132500, outstanding: 27250, overdue: 18245, status: { label: 'Needs attention', tone: 'red' } },
    { name: 'Meridian Industrial', type: 'Manufacturing & Engineering', avatar: '#F59E0B', since: 'Mar 2021', invoices: 18, ytd: 98400, outstanding: 24850, overdue: 12450, status: { label: 'Needs attention', tone: 'red' } },
    { name: 'Ironwood Construction', type: 'Construction', avatar: '#06B6D4', since: 'Jun 2023', invoices: 12, ytd: 98000, outstanding: 18200, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'Pinnacle Energy', type: 'Energy', avatar: '#10B981', since: 'May 2022', invoices: 14, ytd: 88200, outstanding: 52900, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'BluePeak Logistics', type: 'Logistics', avatar: '#EF4444', since: 'Aug 2022', invoices: 9, ytd: 64200, outstanding: 8700, overdue: 3700, status: { label: 'Needs attention', tone: 'red' } },
    { name: 'Summit Solutions', type: 'Technology', avatar: '#3B82F6', since: 'Sep 2023', invoices: 8, ytd: 54000, outstanding: 8900, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'TechCore Industries', type: 'Technology', avatar: '#0EA5E9', since: 'Feb 2023', invoices: 6, ytd: 48000, outstanding: 18200, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'Apex Utilities', type: 'Utilities', avatar: '#6B7280', since: 'Feb 2024', invoices: 7, ytd: 41200, outstanding: 12000, overdue: 0, status: { label: 'Needs attention', tone: 'red' } },
    { name: 'Nova Corp', type: 'Energy', avatar: '#1F2937', since: 'Jul 2023', invoices: 5, ytd: 36000, outstanding: 6800, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'Pacific Solutions', type: 'Solutions', avatar: '#10B981', since: 'Oct 2022', invoices: 4, ytd: 28000, outstanding: 4200, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'Cascade Solutions', type: 'Renewables', avatar: '#8B5CF6', since: 'Feb 2024', invoices: 3, ytd: 24000, outstanding: 8900, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'Northfield Schools', type: 'Education', avatar: '#1F2937', since: 'Mar 2024', invoices: 2, ytd: 22000, outstanding: 0, overdue: 0, status: { label: 'Stable', tone: 'green' } },
    { name: 'Harbor Group', type: 'Logistics', avatar: '#A855F7', since: 'Jan 2026', invoices: 1, ytd: 4300, outstanding: 4300, overdue: 0, status: { label: 'Stable', tone: 'green' } },
];

const fmtMoney2 = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AiGoArrow = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const chips = [
    {
        title: 'Which customers need attention?',
        cat: 'Customers',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ),
    },
    {
        title: 'Show high-value customers',
        cat: 'Revenue',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
    },
    {
        title: 'Which customers have overdue invoices?',
        cat: 'Payments',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
            </svg>
        ),
    },
    {
        title: 'Summarize portfolio health',
        cat: 'AI Summary',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
            </svg>
        ),
    },
];

const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 8,
    border: '1px solid var(--border-primary)', background: 'var(--bg-input, var(--bg-subtle))',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 3, display: 'block' };

export default function FinanceAccounts() {
    const navigate = useNavigate();
    const { customers, loading, error, reload } = useCustomers();
    const { txns, txnsLoading } = useTransactions();
    const { invoices, quotes: acctQuotes } = useAccountSignals();
    const [tabState, setTabState] = useState(1);
    const [createFlow, setCreateFlow] = useState(null); // 'invoice' | 'quote' | 'customer' | null
    const [custSearch, setCustSearch] = useState('');
    const [custSort, setCustSort] = useState({ key: 'ytd', dir: 'desc' });

    const [showImport, setShowImport] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importForm, setImportForm] = useState({ profileid: '', acctid: '', name: '', payment_terms: 'net30', credit_limit: '' });

    const cardMap = {};
    txns.forEach(t => {
        const key = t.card_last_four || 'Unknown';
        if (!cardMap[key]) cardMap[key] = { last4: key, name: t.cardholder_name, count: 0, total: 0, latest: t.authdate };
        cardMap[key].count += 1;
        cardMap[key].total += parseFloat(t.amount) || 0;
        if ((t.authdate || '') > (cardMap[key].latest || '')) cardMap[key].latest = t.authdate;
    });
    const cards = Object.values(cardMap);

    // ── Needs Attention — real per-customer signals, one per archetype,
    // falling back to the design's mock row when no customer qualifies. ──
    const isOverdueInv = (inv) => inv.due_date && new Date(inv.due_date) < new Date() && !['paid', 'cancelled'].includes(inv.status);
    const daysAgo = (d) => Math.floor((new Date() - new Date(d)) / 86400000);
    const yearNow = new Date().getFullYear();
    const invByCustomer = {};
    invoices.forEach(inv => {
        const key = String(inv.customer_id);
        if (!invByCustomer[key]) invByCustomer[key] = [];
        invByCustomer[key].push(inv);
    });
    const quotesPendingByCustomer = {};
    acctQuotes.filter(q => q.status === 'pending_approval').forEach(q => {
        const key = String(q.customer_id);
        quotesPendingByCustomer[key] = (quotesPendingByCustomer[key] || 0) + 1;
    });

    const custSignals = customers.map(c => {
        const custInvoices = invByCustomer[String(c._id)] || [];
        const overdue = custInvoices.filter(isOverdueInv);
        const ytdTotal = custInvoices
            .filter(i => new Date(i.issued_date || i.createdAt).getFullYear() === yearNow)
            .reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
        const lastActivity = custInvoices
            .map(i => new Date(i.paid_date || i.issued_date || i.createdAt))
            .sort((a, b) => b - a)[0];
        const lastPaid = custInvoices
            .filter(i => i.paid_date)
            .map(i => new Date(i.paid_date))
            .sort((a, b) => b - a)[0];
        const overdueAmt = overdue.reduce((s, i) => s + openAmountAcct(i), 0);
        return {
            customer: c,
            invoiceCount: custInvoices.length,
            overdueCount: overdue.length,
            overdueAmt,
            ytdTotal,
            daysSinceActivity: lastActivity ? daysAgo(lastActivity) : null,
            daysSinceLastPaid: lastPaid ? daysAgo(lastPaid) : null,
            quotesPending: quotesPendingByCustomer[String(c._id)] || 0,
        };
    });

    function openAmountAcct(inv) {
        return parseFloat(inv.amount_due ?? (parseFloat(inv.total || 0) - parseFloat(inv.amount_paid || 0))) || 0;
    }

    const riskAvatarColors = ['#1F2937', '#F59E0B', '#EF4444', '#6B7280'];
    const bestOverdueRisk = custSignals.filter(s => s.overdueCount >= 2).sort((a, b) => b.overdueCount - a.overdueCount)[0];
    const bestInactive = custSignals.filter(s => s.invoiceCount > 0 && s.daysSinceActivity != null && s.daysSinceActivity >= 14).sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)[0];
    const bestPaymentRisk = custSignals.filter(s => s.overdueAmt > 0 && s.daysSinceLastPaid != null).sort((a, b) => b.overdueAmt - a.overdueAmt)[0];
    const bestQuotesPending = custSignals.filter(s => s.quotesPending > 0).sort((a, b) => b.quotesPending - a.quotesPending)[0];

    const needsAttention = [
        bestOverdueRisk
            ? { name: bestOverdueRisk.customer.name, sub: `${bestOverdueRisk.invoiceCount} invoice${bestOverdueRisk.invoiceCount === 1 ? '' : 's'} · ${fmtKAcct(bestOverdueRisk.ytdTotal)} YTD · ${bestOverdueRisk.overdueCount} overdue — action needed to reduce risk` }
            : { name: 'Vertex Systems', sub: '12 invoices · $120K YTD · 2 overdue — action needed to reduce risk' },
        bestInactive
            ? { name: bestInactive.customer.name, sub: `No activity in ${bestInactive.daysSinceActivity} days — follow-up recommended` }
            : { name: 'Meridian Industrial', sub: 'No activity in 14 days — follow-up recommended' },
        bestPaymentRisk
            ? { name: bestPaymentRisk.customer.name, sub: `${fmtAcct(bestPaymentRisk.overdueAmt)} overdue · last payment ${bestPaymentRisk.daysSinceLastPaid} days ago — payment at risk` }
            : { name: 'BluePeak Logistics', sub: '$3,700 overdue · last payment 21 days ago — payment at risk' },
        bestQuotesPending
            ? { name: bestQuotesPending.customer.name, sub: `${bestQuotesPending.quotesPending} quote${bestQuotesPending.quotesPending === 1 ? '' : 's'} awaiting approval — action required` }
            : { name: 'Apex Utilities', sub: '3 quotes awaiting approval — action required' },
    ];

    function fmtAcct(n) { return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
    function fmtKAcct(n) { return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : fmtAcct(n); }

    // ── AI Insights aside — real single worst-case signals, falling back to
    // the design's mock content per-item when nothing real qualifies. ──
    const worstOverdueInvoiceObj = invoices.filter(isOverdueInv).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
    const avgPayCustomers = customers.filter(c => c.avg_days_to_pay > 0).sort((a, b) => b.avg_days_to_pay - a.avg_days_to_pay);
    const worstAvgPay = avgPayCustomers[0];
    const utilCustomers = customers.filter(c => c.credit_limit > 0).map(c => ({ ...c, util: (c.credit_used || 0) / c.credit_limit })).sort((a, b) => b.util - a.util);
    const worstUtil = utilCustomers[0];

    // ── Stable / High Value — real signals for customers NOT already
    // flagged in Needs Attention, falling back to the design's mock rows
    // when there isn't enough real portfolio data yet. ──
    const troubledIds = new Set(
        [bestOverdueRisk, bestInactive, bestPaymentRisk, bestQuotesPending]
            .filter(Boolean)
            .map(s => String(s.customer._id))
    );
    const untroubled = custSignals.filter(s => !troubledIds.has(String(s.customer._id)) && s.invoiceCount > 0);

    const stableReal = untroubled
        .slice()
        .sort((a, b) => (a.daysSinceActivity ?? 999) - (b.daysSinceActivity ?? 999))
        .slice(0, 4)
        .map(s => {
            const sub = s.daysSinceActivity != null && s.daysSinceActivity <= 10
                ? `Active customer · last invoice paid ${s.daysSinceActivity} day${s.daysSinceActivity === 1 ? '' : 's'} ago — healthy`
                : `${s.invoiceCount} invoice${s.invoiceCount === 1 ? '' : 's'} · ${fmtKAcct(s.ytdTotal)} YTD · no overdue — low risk`;
            return { name: s.customer.name, sub };
        });
    const stable = stableReal.length > 0 ? stableReal : [
        { name: 'Pinnacle Energy', sub: 'Strong payment history · on track — low risk' },
        { name: 'Ironwood Construction', sub: '12 invoices paid on time · $98K YTD — performing well' },
        { name: 'Summit Solutions', sub: 'Active customer · last invoice paid 6 days ago — healthy' },
        { name: 'Northfield Schools', sub: '2 invoices · $22K YTD · no overdue — low risk' },
    ];

    const HIGH_VALUE_TAGS = ['top customer by revenue — strategic customer', 'high potential — monitor closely', 'long-term customer — strong relationship'];
    const highValueReal = untroubled
        .filter(s => s.ytdTotal > 0)
        .sort((a, b) => b.ytdTotal - a.ytdTotal)
        .slice(0, 3)
        .map((s, i) => ({ name: s.customer.name, sub: `${fmtKAcct(s.ytdTotal)} YTD · ${HIGH_VALUE_TAGS[i] || HIGH_VALUE_TAGS[HIGH_VALUE_TAGS.length - 1]}` }));
    const highValue = highValueReal.length > 0 ? highValueReal : [
        { name: 'Crestline Manufacturing', sub: '$450K YTD · top 5% by revenue — strategic customer' },
        { name: 'Solara Industries', sub: '$320K YTD · growing · high potential — monitor closely' },
        { name: 'Westbridge Capital', sub: '$290K YTD · long-term customer — strong relationship' },
    ];

    async function importProfile(e) {
        e.preventDefault();
        if (!importForm.profileid.trim() || !importForm.acctid.trim()) return setImportError('profileid and acctid required');
        setImporting(true); setImportError('');
        try {
            const r = await fetch(`${BASE}/v1/finance/customers/import-profile`, {
                method: 'POST',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    profileid: importForm.profileid.trim(),
                    acctid: importForm.acctid.trim(),
                    name: importForm.name.trim() || undefined,
                    payment_terms: importForm.payment_terms,
                    credit_limit: parseFloat(importForm.credit_limit) || 0,
                }),
            });
            const j = await r.json();
            if (!j.status) throw new Error(j.error || 'Import failed');
            setShowImport(false);
            setImportForm({ profileid: '', acctid: '', name: '', payment_terms: 'net30', credit_limit: '' });
            reload();
        } catch (err) {
            setImportError(err.message);
        } finally {
            setImporting(false);
        }
    }

    const custSortToggle = (key) => setCustSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    const filteredMockCustomers = MOCK_CUSTOMERS
        .filter(c => c.name.toLowerCase().includes(custSearch.trim().toLowerCase()))
        .slice()
        .sort((a, b) => {
            const { key, dir } = custSort;
            const av = key === 'name' ? a.name.toLowerCase() : a[key];
            const bv = key === 'name' ? b.name.toLowerCase() : b[key];
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return dir === 'asc' ? cmp : -cmp;
        });

    return (
        <>
            <main className="page-main">
                <div className="page-actions">
                    <CreateMenu onPick={setCreateFlow} />
                </div>

                <div className="hero">
                    <div className="hero-icon"><SparkleIcon size={22} /></div>
                    <h1 className="hero-title">Customers</h1>
                    <p className="hero-sub">Your customer portfolio and customer intelligence</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <SparkleIcon size={16} />
                            <input placeholder="Ask anything about your customers..." defaultValue="" />
                            <button type="button" className="cmd-input-mic">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            </button>
                            <button type="submit" className="cmd-input-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="19" x2="12" y2="5" />
                                    <polyline points="5 12 12 5 19 12" />
                                </svg>
                            </button>
                        </div>
                    </form>
                    <div className="chips">
                        {chips.map((chip) => (
                            <div className="chip" key={chip.title}>
                                <span className="chip-icon">{chip.icon}</span>
                                <div className="chip-body">
                                    <div className="chip-title">{chip.title}</div>
                                    <div className="chip-cat">{chip.cat}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {!loading && (
                    <div className="ai-update-banner">
                        <span className="dot" />
                        <div>{needsAttention.length} customers need attention based on recent activity.</div>
                    </div>
                )}

                <div className="tabs" style={{ margin: '20px 0 4px' }}>
                    <div className={`tab ${tabState === 1 ? 'active' : ''}`} onClick={() => setTabState(1)}>Overview</div>
                    <div className={`tab ${tabState === 2 ? 'active' : ''}`} onClick={() => setTabState(2)}>
                        All Customers <span className="text-meta" style={{ fontWeight: 400 }}>· {MOCK_CUSTOMERS.length}</span>
                    </div>
                </div>

                {loading && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading customers…</div>}
                {error && <div style={{ fontSize: 13, color: 'var(--red-text)', padding: '20px 0' }}>{error}</div>}

                {!loading && customers.length === 0 && !error && (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                        No customers yet. Use <b>+ Create</b> above to add your first customer.
                    </div>
                )}

                {!loading && tabState === 1 && (
                    <>
                        <div style={{ marginTop: 4 }}>
                            <div className="section-header red">
                                <span className="dot" />
                                <span className="section-title">Needs Attention</span>
                                <span className="section-count">{needsAttention.length}</span>
                            </div>
                            <div>
                                {needsAttention.map((item, i) => (
                                    <div className="entity-row" key={item.name + i}>
                                        <div className="avatar" style={{ background: riskAvatarColors[i % riskAvatarColors.length] }}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="row-body">
                                            <div className="row-title">{item.name}</div>
                                            <div className="row-sub">{item.sub}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <div className="section-header green">
                                <span className="dot" />
                                <span className="section-title">Stable</span>
                                <span className="section-count">{stable.length}</span>
                            </div>
                            <div>
                                {stable.map((item, i) => (
                                    <div className="entity-row" key={item.name + i}>
                                        <div className="avatar" style={{ background: riskAvatarColors[(i + 1) % riskAvatarColors.length] }}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="row-body">
                                            <div className="row-title">{item.name}</div>
                                            <div className="row-sub">{item.sub}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <div className="section-header violet">
                                <span className="dot" />
                                <span className="section-title">High Value</span>
                                <span className="section-count">{highValue.length}</span>
                            </div>
                            <div>
                                {highValue.map((item, i) => (
                                    <div className="entity-row" key={item.name + i}>
                                        <div className="avatar" style={{ background: riskAvatarColors[(i + 2) % riskAvatarColors.length] }}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="row-body">
                                            <div className="row-title">{item.name}</div>
                                            <div className="row-sub">{item.sub}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {!loading && tabState === 2 && (
                    <>
                        <div style={{ margin: '4px 0 12px' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setShowImport(v => !v); setImportError(''); }}
                                style={{ fontSize: 13 }}
                            >
                                {showImport ? 'Cancel' : 'Link Existing Profile'}
                            </button>
                        </div>

                        {showImport && (
                            <form onSubmit={importProfile} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    Pulls an existing CardPointe profile/account (visible in the CardPointe portal contact URL: <code>.../contactdetail/&lt;profileid&gt;/&lt;acctid&gt;</code>) into a customer record here — no new card token needed.
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={labelStyle}>Profile ID *</label>
                                        <input style={inputStyle} value={importForm.profileid} onChange={e => setImportForm(f => ({ ...f, profileid: e.target.value }))} placeholder="13840143476606191591" required />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Account ID *</label>
                                        <input style={inputStyle} value={importForm.acctid} onChange={e => setImportForm(f => ({ ...f, acctid: e.target.value }))} placeholder="1" required />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Name override (optional)</label>
                                        <input style={inputStyle} value={importForm.name} onChange={e => setImportForm(f => ({ ...f, name: e.target.value }))} placeholder="Uses CardPointe's name if blank" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Payment Terms</label>
                                        <select style={inputStyle} value={importForm.payment_terms} onChange={e => setImportForm(f => ({ ...f, payment_terms: e.target.value }))}>
                                            <option value="due_on_receipt">Due on Receipt</option>
                                            <option value="net15">Net 15</option>
                                            <option value="net30">Net 30</option>
                                            <option value="net45">Net 45</option>
                                            <option value="net60">Net 60</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Credit Limit ($)</label>
                                        <input style={inputStyle} value={importForm.credit_limit} onChange={e => setImportForm(f => ({ ...f, credit_limit: e.target.value }))} placeholder="10000" type="number" min="0" />
                                    </div>
                                </div>
                                {importError && (
                                    <div style={{ fontSize: 12, color: 'var(--red-text)', background: 'var(--red-bg)', borderRadius: 6, padding: '6px 8px' }}>{importError}</div>
                                )}
                                <button className="btn btn-primary btn-sm" type="submit" disabled={importing} style={{ alignSelf: 'flex-start', fontSize: 13 }}>
                                    {importing ? 'Importing…' : 'Import Customer'}
                                </button>
                            </form>
                        )}

                        <div className="flex items-center gap-3 mt-4">
                            <input
                                placeholder="Search customers…"
                                value={custSearch}
                                onChange={e => setCustSearch(e.target.value)}
                                style={{ flex: '1 1 0%', maxWidth: 320, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13.5 }}
                            />
                            <div className="text-meta" style={{ fontSize: 12.5 }}>
                                {filteredMockCustomers.length} of {MOCK_CUSTOMERS.length} customers
                            </div>
                        </div>

                        <div className="card mt-4 items-scroll" style={{ padding: 0 }}>
                            <div className="cust-head">
                                <div className="cust-sort" onClick={() => custSortToggle('name')}>Customer</div>
                                <div>Since</div>
                                <div className="cust-sort" style={{ textAlign: 'right' }} onClick={() => custSortToggle('invoices')}>Invoices</div>
                                <div className="cust-sort" style={{ textAlign: 'right' }} onClick={() => custSortToggle('ytd')}>
                                    YTD {custSort.key === 'ytd' ? (custSort.dir === 'desc' ? '↓' : '↑') : ''}
                                </div>
                                <div className="cust-sort" style={{ textAlign: 'right' }} onClick={() => custSortToggle('outstanding')}>Outstanding</div>
                                <div className="cust-sort" style={{ textAlign: 'right' }} onClick={() => custSortToggle('overdue')}>Overdue</div>
                                <div>Status</div>
                            </div>
                            {filteredMockCustomers.map(c => (
                                <div className="cust-row" key={c.name}>
                                    <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                                        <div className="avatar" style={{ background: c.avatar, color: '#fff', width: 30, height: 30, fontSize: 13, flexShrink: 0 }}>
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                            <div className="text-meta" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-secondary" style={{ fontSize: 13 }}>{c.since}</div>
                                    <div style={{ textAlign: 'right', fontSize: 13.5 }}>{c.invoices}</div>
                                    <div style={{ textAlign: 'right', fontSize: 13.5 }}>{fmtMoney2(c.ytd)}</div>
                                    <div style={{ textAlign: 'right', fontSize: 13.5 }}>{fmtMoney2(c.outstanding)}</div>
                                    <div style={{ textAlign: 'right', fontSize: 13.5, color: c.overdue > 0 ? 'var(--red-text)' : 'inherit', fontWeight: c.overdue > 0 ? 600 : 400 }}>
                                        {c.overdue > 0 ? fmtMoney2(c.overdue) : '—'}
                                    </div>
                                    <div><span className={`badge ${c.status.tone}`}>{c.status.label}</span></div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <SparkleIcon size={16} />
                        <span>AI Insights</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-alert red">
                    <div className="ai-alert-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="ai-alert-body">
                        <div className="ai-alert-title">Overdue payment risk</div>
                        <div className="ai-alert-sub">Most urgent action right now</div>
                        <div className="ai-alert-text">
                            {worstOverdueInvoiceObj
                                ? `${worstOverdueInvoiceObj.invoice_number} is ${daysAgo(worstOverdueInvoiceObj.due_date)} days past due — ${fmtAcct(openAmountAcct(worstOverdueInvoiceObj))} outstanding.`
                                : 'INV-1199 is 14 days past due — $12,450 outstanding. Atypical for this account.'}
                        </div>
                        <a className="ai-alert-link" href="/connect/finance/receivables">View overdue invoices →</a>
                    </div>
                </div>

                <div className="ai-section-label">Also Noted</div>
                <div className="ai-list">
                    <div className="ai-list-item amber clickable">
                        <div className="dot" />
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-list-item-title">{worstAvgPay ? 'Elevated average days to pay' : 'Late payment pattern worsening'}</div>
                            <div className="ai-list-item-sub">Avg {worstAvgPay ? worstAvgPay.avg_days_to_pay : 22}d</div>
                        </div>
                        <span className="ai-go"><AiGoArrow /></span>
                    </div>
                    <div className="ai-list-item green clickable">
                        <div className="dot" />
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-list-item-title">Q2 maintenance renewal likely</div>
                            <div className="ai-list-item-sub">~$6,500</div>
                        </div>
                        <span className="ai-go"><AiGoArrow /></span>
                    </div>
                    <div className="ai-list-item green clickable">
                        <div className="dot" />
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-list-item-title">Upsell: extended warranty</div>
                            <div className="ai-list-item-sub">~$2,800</div>
                        </div>
                        <span className="ai-go"><AiGoArrow /></span>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-list-item-title">Declining engagement this quarter</div>
                        </div>
                    </div>
                    <div className="ai-list-item violet clickable">
                        <div className="dot" />
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-list-item-title">Credit utilization at limit threshold</div>
                            <div className="ai-list-item-sub">{worstUtil ? `${Math.round(worstUtil.util * 100)}%` : '50%'}</div>
                        </div>
                        <span className="ai-go"><AiGoArrow /></span>
                    </div>
                </div>

                <div className="ai-suggested">
                    <div className="ai-suggested-title">
                        <SparkleIcon size={14} />
                        <span>Q2 renewal opportunity</span>
                    </div>
                    <div className="ai-suggested-text">Est. ~$6,500 — ask AI</div>
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', padding: '12px 0' }}>
                    {loading
                        ? 'Loading…'
                        : customers.length === 0
                            ? 'No customers to analyze yet.'
                            : `${customers.length} customer${customers.length !== 1 ? 's' : ''} in portfolio.`}
                </div>

                <div className="ai-section-label" style={{ marginTop: 18 }}>
                    Payment Activity{' '}
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-tertiary)' }}>CardPointe</span>
                </div>
                {txnsLoading && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading…</div>}
                {!txnsLoading && cards.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        No transactions imported. Use <b>Receivables</b> → Import retref.
                    </div>
                )}
                {cards.map(c => (
                    <div key={c.last4} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                            ••{c.last4}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name || 'Card holder'}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                                {c.count} txn{c.count !== 1 ? 's' : ''} · last {c.latest ? `${c.latest.slice(0, 4)}-${c.latest.slice(4, 6)}-${c.latest.slice(6)}` : '—'}
                            </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>${c.total.toFixed(2)}</div>
                    </div>
                ))}
            </aside>

            {(createFlow === 'invoice' || createFlow === 'quote') && (
                <DocEditor
                    mode={createFlow}
                    onClose={() => setCreateFlow(null)}
                    onCreated={() => navigate(createFlow === 'invoice' ? '/connect/finance/collections' : '/connect/finance/quotes')}
                />
            )}
            {createFlow === 'customer' && (
                <CreateCustomerModal
                    onClose={() => setCreateFlow(null)}
                    onCreated={reload}
                />
            )}
        </>
    );
}
