import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function useProfiles() {
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const fetch_ = (profileId) => {
        if (!profileId) return;
        setProfileLoading(true); setProfileError(''); setProfile(null);
        fetch(`${BASE}/v1/finance/profile/${profileId}`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setProfile(j.data); else setProfileError(j.error || 'Not found'); })
            .catch(e => setProfileError(e.message))
            .finally(() => setProfileLoading(false));
    };
    return { profile, profileLoading, profileError, fetchProfile: fetch_ };
}

function useInvoices() {
    const [invoices, setInvoices] = useState([]);
    const [invLoading, setInvLoading] = useState(true);
    useEffect(() => {
        fetch(`${BASE}/v1/finance/invoices`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setInvoices(j.data || []); })
            .catch(() => {})
            .finally(() => setInvLoading(false));
    }, []);
    return { invoices, invLoading };
}

function useTransactions() {
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = () => {
        setLoading(true);
        fetch(`${BASE}/v1/finance/transactions`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setTxns(j.data); else setError(j.error || 'Failed'); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);
    return { txns, loading, error, reload: load };
}

const SparkleIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
        <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
    </svg>
);

const RECV_CHIPS = [
    { title: 'What needs my attention?', cat: 'Priority' },
    { title: 'Which customers are at risk?', cat: 'Risk Analysis' },
    { title: 'What should I follow up on?', cat: 'Actions' },
    { title: 'Show overdue invoices', cat: 'Overdue' },
];

function setlColor(s) {
    if (!s) return 'var(--text-tertiary)';
    s = s.toLowerCase();
    if (s.includes('settled') || s.includes('captured')) return 'var(--green-text)';
    if (s.includes('authorized') || s.includes('queued')) return 'var(--amber-text)';
    if (s.includes('void')) return 'var(--red-text)';
    return 'var(--text-tertiary)';
}

const RISK_AVATAR_COLORS = ['#1F2937', '#F59E0B', '#EF4444', '#6B7280', '#0EA5E9'];

export default function FinanceReceivables() {
    const { txns, loading, error, reload } = useTransactions();
    const { invoices, invLoading } = useInvoices();
    const [pageTab, setPageTab] = useState('receivables');
    const [importRef, setImportRef] = useState('');
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importOk, setImportOk] = useState('');

    // Authorize test card + auto-import
    const [authCard, setAuthCard] = useState('4111111111111111');
    const [authExpiry, setAuthExpiry] = useState('1225');
    const [authAmount, setAuthAmount] = useState('10.00');
    const [authName, setAuthName] = useState('Test Cardholder');
    const [authorizing, setAuthorizing] = useState(false);
    const [authResult, setAuthResult] = useState(null);
    const [authError, setAuthError] = useState('');

    // Profile
    const [profCard, setProfCard] = useState('4111111111111111');
    const [profExpiry, setProfExpiry] = useState('1225');
    const [profName, setProfName] = useState('Test Cardholder');
    const [creatingProf, setCreatingProf] = useState(false);
    const [profResult, setProfResult] = useState(null);
    const [profError, setProfError] = useState('');
    const [lookupId, setLookupId] = useState('');
    const { profile, profileLoading, profileError, fetchProfile } = useProfiles();

    // Inquire — live CardPointe lookup by retref
    const DEFAULT_RETREF = '191578756768';
    const [inquireRef, setInquireRef] = useState(DEFAULT_RETREF);
    const [inquiring, setInquiring] = useState(false);
    const [inquireResult, setInquireResult] = useState(null);
    const [inquireError, setInquireError] = useState('');

    async function fetchInquire(ref) {
        if (!ref) return;
        setInquiring(true); setInquireError(''); setInquireResult(null);
        try {
            const r = await fetch(`${BASE}/v1/finance/inquire/${encodeURIComponent(ref)}`, {
                headers: { ...authH() }, credentials: 'include',
            });
            const j = await r.json();
            if (!j.status) throw new Error(j.error?.resptext || j.error?.error || JSON.stringify(j.error) || 'Lookup failed');
            console.log('[inquire]', j.data);
            setInquireResult(j.data);
        } catch (err) {
            setInquireError(err.message);
        } finally {
            setInquiring(false);
        }
    }

    useEffect(() => { fetchInquire(DEFAULT_RETREF); }, []);

    async function doInquire(e) {
        e.preventDefault();
        fetchInquire(inquireRef.trim());
    }

    const approved = txns.filter(t => t.respstat === 'A');
    const declined = txns.filter(t => t.respstat === 'C');
    const totalAmt = approved.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    // ── Invoice-based receivables (Overdue / At Risk / Due Soon), real with
    // per-section mock fallback from the design when nothing qualifies yet. ──
    const daysTillInv = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
    const isOverdueInv = (inv) => inv.due_date && new Date(inv.due_date) < new Date() && !['paid', 'cancelled'].includes(inv.status);
    const isOutstandingInv = (inv) => !['paid', 'cancelled'].includes(inv.status);
    const openAmt = (inv) => parseFloat(inv.amount_due ?? (parseFloat(inv.total || 0) - parseFloat(inv.amount_paid || 0))) || 0;
    const fmtR = (n) => `$${Math.round(n || 0).toLocaleString('en-US')}`;

    const outstandingInv = invoices.filter(isOutstandingInv);
    const overdueInv = outstandingInv.filter(isOverdueInv).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const atRiskInv = outstandingInv
        .filter(inv => !isOverdueInv(inv) && inv.due_date && daysTillInv(inv.due_date) <= 5 && openAmt(inv) > 5000)
        .sort((a, b) => daysTillInv(a.due_date) - daysTillInv(b.due_date));
    const atRiskIds = new Set(atRiskInv.map(i => i._id));
    const dueSoonInv = outstandingInv
        .filter(inv => !isOverdueInv(inv) && !atRiskIds.has(inv._id) && inv.due_date && daysTillInv(inv.due_date) > 0 && daysTillInv(inv.due_date) <= 30)
        .sort((a, b) => daysTillInv(a.due_date) - daysTillInv(b.due_date));

    const overdueAmt = overdueInv.reduce((s, i) => s + openAmt(i), 0);
    const outstandingAmt = outstandingInv.reduce((s, i) => s + openAmt(i), 0);
    const paidAmt = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount_paid) || parseFloat(i.total) || 0), 0);
    const totalInvoicedAll = invoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const collectedPct = totalInvoicedAll > 0 ? Math.round((paidAmt / totalInvoicedAll) * 100) : null;
    const highRiskAccountCount = new Set(overdueInv.map(i => String(i.customer_id))).size;
    const hasInvoiceData = invoices.length > 0;

    // Per-customer aggregates for the "Also Noted" aside slots
    const invByCust = {};
    invoices.forEach(inv => {
        const key = String(inv.customer_id);
        if (!invByCust[key]) invByCust[key] = [];
        invByCust[key].push(inv);
    });
    const custMultiOverdue = Object.entries(invByCust)
        .map(([key, list]) => ({ name: list[0].customer_name, overdue: list.filter(isOverdueInv) }))
        .filter(c => c.overdue.length >= 2)
        .map(c => ({ name: c.name, amt: c.overdue.reduce((s, i) => s + openAmt(i), 0) }))
        .sort((a, b) => b.amt - a.amt)[0];
    const custOnTrack = outstandingInv
        .filter(inv => !isOverdueInv(inv) && inv.due_date && daysTillInv(inv.due_date) > 0 && daysTillInv(inv.due_date) <= 7)
        .sort((a, b) => daysTillInv(a.due_date) - daysTillInv(b.due_date))[0];
    const custReliable = Object.entries(invByCust)
        .map(([key, list]) => ({ name: list[0].customer_name, hasOverdue: list.some(isOverdueInv), paidCount: list.filter(i => i.status === 'paid').length }))
        .filter(c => !c.hasOverdue && c.paidCount > 0)
        .sort((a, b) => b.paidCount - a.paidCount)[0];

    async function doAuthorize(e) {
        e.preventDefault();
        setAuthorizing(true); setAuthError(''); setAuthResult(null);
        try {
            // Step 1: authorize test card against CardPointe UAT
            const r1 = await fetch(`${BASE}/v1/finance/authorize`, {
                method: 'POST', credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account: authCard.trim(),
                    expiry: authExpiry.trim(),
                    amount: String(Math.round(parseFloat(authAmount) * 100)), // cents as string
                    name: authName.trim(),
                    capture: 'Y',
                }),
            });
            const j1 = await r1.json();
            if (!j1.status) throw new Error(j1.error?.resptext || j1.error?.error || JSON.stringify(j1.error) || 'Authorize failed');
            const retref = j1.data?.retref;
            if (!retref) throw new Error('No retref in response');
            // Step 2: auto-import the retref into MongoDB
            const r2 = await fetch(`${BASE}/v1/finance/transactions/import`, {
                method: 'POST', credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ retref }),
            });
            const j2 = await r2.json();
            setAuthResult({ ...j1.data, imported: j2.status });
            reload();
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setAuthorizing(false);
        }
    }

    async function doCreateProfile(e) {
        e.preventDefault();
        setCreatingProf(true); setProfError(''); setProfResult(null);
        try {
            const r = await fetch(`${BASE}/v1/finance/profile`, {
                method: 'PUT', credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account: profCard.trim(),
                    expiry: profExpiry.trim(),
                    name: profName.trim(),
                    accttype: 'VISA',
                }),
            });
            const j = await r.json();
            if (!j.status) throw new Error(j.error?.resptext || j.error?.error || JSON.stringify(j.error) || 'Profile creation failed');
            setProfResult(j.data);
            if (j.data?.profileid) setLookupId(j.data.profileid);
        } catch (err) {
            setProfError(err.message);
        } finally {
            setCreatingProf(false);
        }
    }

    async function doImport(e) {
        e.preventDefault();
        const ref = importRef.trim();
        if (!ref) return;
        setImporting(true); setImportError(''); setImportOk('');
        try {
            const r = await fetch(`${BASE}/v1/finance/transactions/import`, {
                method: 'POST', credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ retref: ref }),
            });
            const j = await r.json();
            if (!j.status) throw new Error(j.error || 'Import failed');
            setImportOk(`Imported ${j.data.retref}`);
            setImportRef('');
            reload();
        } catch (err) {
            setImportError(err.message);
        } finally {
            setImporting(false);
        }
    }

    const inputStyle = { fontSize: 12.5, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', outline: 'none' };
    const btnStyle = (disabled) => ({ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 });

    return (
        <>
            <main className="page-main">
                <div className="hero">
                    <div className="hero-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                        </svg>
                    </div>
                    <h1 className="hero-title">Receivables</h1>
                    <p className="hero-sub">Verified payments imported from CardPointe / Fiserv</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                                <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                            </svg>
                            <input placeholder="Ask anything about your receivables..." defaultValue="" />
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
                        {RECV_CHIPS.map((chip) => (
                            <div className="chip" key={chip.title}>
                                <span className="chip-icon"><SparkleIcon size={16} /></span>
                                <div className="chip-body">
                                    <div className="chip-title">{chip.title}</div>
                                    <div className="chip-cat">{chip.cat}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="tabs" style={{ marginTop: 20 }}>
                    <div onClick={() => setPageTab('receivables')} className={`tab ${pageTab === 'receivables' ? 'active' : ''}`}>Receivables</div>
                    <div onClick={() => setPageTab('all')} className={`tab ${pageTab === 'all' ? 'active' : ''}`}>All Invoices</div>
                </div>

                {pageTab === 'receivables' && (
                    <>
                        <div className="status-banner red">
                            <span className="dot" />
                            <div>
                                <b>Overdue invoices are driving risk:</b>{' '}
                                {hasInvoiceData
                                    ? `${fmtR(overdueAmt)} overdue across ${overdueInv.length} invoice${overdueInv.length === 1 ? '' : 's'}.`
                                    : '$165,400 overdue across 18 invoices.'}
                            </div>
                        </div>

                        <div className="section-header red">
                            <span className="dot" />
                            <span className="section-title">Overdue</span>
                            <span className="section-count">{overdueInv.length > 0 ? overdueInv.length : 8}</span>
                        </div>
                        <div>
                            {(overdueInv.length > 0 ? overdueInv : [
                                { _id: 'm1', customer_name: 'Vertex Systems', amt: 9400, sub: '10 days overdue · no recent response' },
                                { _id: 'm2', customer_name: 'Vertex Systems', amt: 12500, sub: '14 days overdue · customer typically pays late' },
                            ]).map((inv, i) => (
                                <div className="entity-row" key={inv._id || i}>
                                    <div className="avatar" style={{ background: RISK_AVATAR_COLORS[i % RISK_AVATAR_COLORS.length] }}>
                                        {(inv.customer_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="row-body">
                                        <div className="row-title">
                                            {inv.customer_name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {fmtR(inv.due_date ? openAmt(inv) : inv.amt)}</span>
                                        </div>
                                        <div className="row-sub">{inv.due_date ? `${daysTillInv(inv.due_date) * -1} days overdue` : inv.sub}</div>
                                    </div>
                                    <div className="row-actions">
                                        <button className="btn btn-primary btn-sm">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13" />
                                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                            </svg>
                                            Send Reminder
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="section-header amber">
                            <span className="dot" />
                            <span className="section-title">At Risk</span>
                            <span className="section-count">{atRiskInv.length > 0 ? atRiskInv.length : 2}</span>
                        </div>
                        <div>
                            {(atRiskInv.length > 0 ? atRiskInv : [
                                { _id: 'm3', customer_name: 'Apex Utilities', amt: 12200, sub: 'due in 3 days · high value + slow payer' },
                                { _id: 'm4', customer_name: 'TechCore Industries', amt: 8900, sub: 'due in 2 days · payment history shows delays' },
                            ]).map((inv, i) => (
                                <div className="entity-row" key={inv._id || i}>
                                    <div className="avatar" style={{ background: RISK_AVATAR_COLORS[(i + 3) % RISK_AVATAR_COLORS.length] }}>
                                        {(inv.customer_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="row-body">
                                        <div className="row-title">
                                            {inv.customer_name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {fmtR(inv.due_date ? openAmt(inv) : inv.amt)}</span>
                                        </div>
                                        <div className="row-sub">{inv.due_date ? `due in ${daysTillInv(inv.due_date)} day${daysTillInv(inv.due_date) === 1 ? '' : 's'}` : inv.sub}</div>
                                    </div>
                                    <div className="row-actions">
                                        <button className="btn btn-secondary btn-sm">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                            </svg>
                                            Follow Up
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="section-header violet">
                            <span className="dot" />
                            <span className="section-title">Due Soon</span>
                            <span className="section-count">{dueSoonInv.length > 0 ? dueSoonInv.length : 5}</span>
                        </div>
                        <div>
                            {(dueSoonInv.length > 0 ? dueSoonInv : [
                                { _id: 'm5', customer_name: 'Vertex Systems', amt: 5750, dateLabel: 'May 12, 2026' },
                                { _id: 'm6', customer_name: 'Vertex Systems', amt: 3980, dateLabel: 'May 19, 2026' },
                            ]).map((inv, i) => (
                                <div className="entity-row" key={inv._id || i}>
                                    <div className="avatar" style={{ background: RISK_AVATAR_COLORS[i % RISK_AVATAR_COLORS.length] }}>
                                        {(inv.customer_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="row-body">
                                        <div className="row-title">
                                            {inv.customer_name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {fmtR(inv.due_date ? openAmt(inv) : inv.amt)}</span>
                                        </div>
                                        <div className="row-sub">Due {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : inv.dateLabel} · on track</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {pageTab === 'all' && (
                    <>
                        <div className="section-header blue" style={{ marginTop: 16 }}>
                            <span className="dot" />
                            <span className="section-title">All Invoices</span>
                            {!invLoading && <span className="section-count">{invoices.length}</span>}
                        </div>
                        {invLoading && <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>}
                        {!invLoading && invoices.length === 0 && (
                            <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
                                No invoices yet.
                            </div>
                        )}
                        {invoices.length > 0 && (
                            <div className="dlist">
                                {invoices.map(inv => (
                                    <div className="entity-row flat" key={inv._id} style={{ padding: '10px 4px' }}>
                                        <div className="row-body">
                                            <div className="row-title" style={{ fontSize: 13 }}>{inv.invoice_number} — {inv.customer_name}</div>
                                            <div className="row-sub" style={{ fontSize: 11.5 }}>
                                                <span className={`badge ${{ paid: 'green', overdue: 'red', draft: 'gray', cancelled: 'gray' }[inv.status] || 'violet'}`} style={{ fontSize: 10.5 }}>{inv.status}</span>
                                                {' '}{inv.due_date ? `· due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtR(inv.total)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* KPIs from real data */}
                {!loading && txns.length > 0 && (
                    <div className="kpi-grid kpi-grid-3 mt-4">
                        <div className="kpi">
                            <div className="kpi-label">Approved / Collected</div>
                            <div className="kpi-value">{approved.length}</div>
                            <div className="kpi-trend green">
                                ${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Declined</div>
                            <div className="kpi-value">{declined.length}</div>
                            <div className="kpi-trend red">
                                {txns.length > 0 ? ((declined.length / txns.length) * 100).toFixed(0) : 0}% rate
                            </div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Total Imported</div>
                            <div className="kpi-value">{txns.length}</div>
                            <div className="kpi-trend gray">records in MongoDB</div>
                        </div>
                    </div>
                )}

                {/* Transactions list */}
                <div className="section-header violet" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">Verified Payments</span>
                    {!loading && <span className="section-count">{txns.length}</span>}
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        MongoDB · via CardPointe /inquire
                    </span>
                </div>

                {loading && <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>}
                {error && <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--red-text)', background: 'var(--red-bg)', borderRadius: 8 }}>{error}</div>}

                {txns.length > 0 && (
                    <div className="dlist">
                        {txns.map(t => (
                            <div className="entity-row flat" key={t.retref} style={{ padding: '10px 4px' }}>
                                <div className="avatar" style={{
                                    width: 32, height: 32, fontSize: 11,
                                    background: t.respstat === 'A' ? 'var(--green-bg)' : 'var(--red-bg)',
                                    color: t.respstat === 'A' ? 'var(--green-text)' : 'var(--red-text)',
                                }}>
                                    {t.respstat === 'A' ? '✓' : '✗'}
                                </div>
                                <div className="row-body">
                                    <div className="row-title" style={{ fontSize: 13 }}>
                                        {t.cardholder_name || 'Unknown'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>••••{t.card_last_four}</span>
                                    </div>
                                    <div className="row-sub" style={{ fontSize: 11.5 }}>
                                        <span style={{ color: setlColor(t.setlstat) }}>{t.setlstat || '—'}</span>
                                        {' · '}{t.authdate ? `${t.authdate.slice(0,4)}-${t.authdate.slice(4,6)}-${t.authdate.slice(6)}` : '—'}
                                        {' · '}<span style={{ color: 'var(--text-tertiary)' }}>{t.retref}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>${parseFloat(t.amount || 0).toFixed(2)}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{t.entrymode || '—'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && txns.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>
                        No imported transactions yet. Import a retref below.
                    </div>
                )}


                {/* ── Import by retref ── */}
                <div className="section-header blue" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">Import by Retref</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        GET /inquire → MongoDB
                    </span>
                </div>
                <form onSubmit={doImport} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                        value={importRef}
                        onChange={e => setImportRef(e.target.value)}
                        placeholder="Paste retref…"
                        style={{ flex: 1, ...inputStyle }}
                    />
                    <button type="submit" disabled={importing} style={btnStyle(importing)}>
                        {importing ? '…' : 'Import'}
                    </button>
                </form>
                {importError && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red-text)' }}>{importError}</div>}
                {importOk && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--green-text)' }}>{importOk}</div>}

                {/* ── Live Transaction Lookup (CardPointe /inquire) ── */}
                <div className="section-header amber" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">Live Transaction Lookup</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        GET /inquire/:retref — CardPointe live
                    </span>
                </div>
                <form onSubmit={doInquire} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                        value={inquireRef}
                        onChange={e => setInquireRef(e.target.value)}
                        placeholder="Enter retref…"
                        style={{ flex: 1, ...inputStyle }}
                    />
                    <button type="submit" disabled={inquiring} style={btnStyle(inquiring)}>
                        {inquiring ? '…' : 'Lookup'}
                    </button>
                </form>
                {inquireError && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red-text)' }}>{inquireError}</div>}
                {inquireResult && (() => {
                    const r = inquireResult;
                    // CardPointe: authdate = YYYYMMDD (8) or YYYYMMDDHHmmss (14); authtime = HHMMSS or HH:MM:SS
                    const toTimeStr = (digits) => {
                        if (!digits || digits.length < 6) return '';
                        let h = parseInt(digits.slice(0,2), 10);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12 || 12;
                        return `${h}:${digits.slice(2,4)}:${digits.slice(4,6)} ${ampm}`;
                    };
                    const fmtDate = (d) => {
                        if (!d || d.length < 8) return d || '—';
                        return `${d.slice(4,6)}/${d.slice(6,8)}/${d.slice(0,4)}`;
                    };
                    const adStr = String(r.authdate || '').replace(/\D/g, '');
                    const atStr = String(r.authtime || '').replace(/\D/g, '');
                    const timePart = adStr.length >= 14 ? toTimeStr(adStr.slice(8)) : toTimeStr(atStr);
                    const dateTimeStr = [fmtDate(r.authdate), timePart].filter(Boolean).join(' ') || '—';
                    const row = (label, val) => val ? <div><span style={{ color: 'var(--text-tertiary)', marginRight: 4 }}>{label}</span>{val}</div> : null;
                    const summaryItems = [
                        ['Date/Time', dateTimeStr],
                        ['Status', r.setlstat],
                        ['Payment Type', r.accttype],
                        ['Location', r.merchantid],
                        ['Method', r.entrymode],
                    ].filter(([, val]) => val && val.trim() !== '');
                    return (
                        <div style={{ marginTop: 8, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', fontSize: 12.5 }}>
                            {/* Header */}
                            <div style={{ padding: '10px 14px', background: r.respstat === 'A' ? 'var(--green-bg)' : 'var(--red-bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: r.respstat === 'A' ? 'var(--green-text)' : 'var(--red-text)' }}>
                                    {r.respstat === 'A' ? '✓ Approved' : r.respstat === 'C' ? '✗ Declined' : r.respstat || '—'}
                                </span>
                                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 15 }}>${parseFloat(r.amount || 0).toFixed(2)}</span>
                            </div>

                            {/* Summary strip */}
                            <div style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px' }}>
                                {summaryItems.map(([label, val]) => (
                                    <div key={label}>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
                                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{val}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Transaction section */}
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Transaction</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', color: 'var(--text-secondary)' }}>
                                    {row('retref', r.retref)}
                                    {row('authcode', r.authcode)}
                                    {row('order id', r.orderid)}
                                    {row('batch #', r.batchid)}
                                    {row('date', fmtDate(r.authdate))}
                                    {row('capture date', fmtDate(r.capturedate))}
                                    <div><span style={{ color: 'var(--text-tertiary)', marginRight: 4 }}>settlement</span><span style={{ color: setlColor(r.setlstat) }}>{r.setlstat || '—'}</span></div>
                                    {row('entry', r.entrymode)}
                                    {row('acct type', r.accttype)}
                                    {row('token source', r.tokensource)}
                                </div>
                            </div>

                            {/* Card / cardholder section */}
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Card &amp; Cardholder</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', color: 'var(--text-secondary)' }}>
                                    {row('name', r.name)}
                                    <div><span style={{ color: 'var(--text-tertiary)', marginRight: 4 }}>card</span>••••{r.lastfour || '—'} {r.accttype || ''}</div>
                                    {r.token && <div style={{ gridColumn: '1 / 3' }}><span style={{ color: 'var(--text-tertiary)', marginRight: 4 }}>token</span><span style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{r.token}</span></div>}
                                    {row('expiry', r.expiry ? `${r.expiry.slice(0,2)}/${r.expiry.slice(2)}` : null)}
                                    {row('email', r.email)}
                                    {row('phone', r.phone)}
                                </div>
                            </div>

                            {/* Billing address section — only if any field present */}
                            {(r.address || r.city || r.region || r.postal || r.country) && (
                                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Billing Address</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', color: 'var(--text-secondary)' }}>
                                        {row('street', r.address)}
                                        {row('city', r.city)}
                                        {row('state', r.region)}
                                        {row('zip', r.postal)}
                                        {row('country', r.country)}
                                    </div>
                                </div>
                            )}

                            {/* Security checks */}
                            {(r.avsresp || r.cvvresp) && (
                                <div style={{ padding: '10px 14px' }}>
                                    <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Security</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', color: 'var(--text-secondary)' }}>
                                        {row('AVS', r.avsresp)}
                                        {row('CVV', r.cvvresp)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ── Card Profiles ── */}
                <div className="section-header violet" style={{ marginTop: 24 }}>
                    <span className="dot" />
                    <span className="section-title">Card Profiles</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        PUT/GET /profile — CardPointe tokenized storage
                    </span>
                </div>
                <form onSubmit={doCreateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6, marginTop: 8 }}>
                    <input value={profCard} onChange={e => setProfCard(e.target.value)} placeholder="Card number" style={inputStyle} />
                    <input value={profExpiry} onChange={e => setProfExpiry(e.target.value)} placeholder="MMYY" style={inputStyle} />
                    <input value={profName} onChange={e => setProfName(e.target.value)} placeholder="Cardholder name" style={{ ...inputStyle, gridColumn: '1 / 2' }} />
                    <button type="submit" disabled={creatingProf} style={btnStyle(creatingProf)}>
                        {creatingProf ? '…' : 'Store'}
                    </button>
                </form>
                {profError && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red-text)' }}>{profError}</div>}
                {profResult && (
                    <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--green-bg)', fontSize: 12.5 }}>
                        <div style={{ fontWeight: 600, color: 'var(--green-text)', marginBottom: 4 }}>Profile created</div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                            profileid: <b>{profResult.profileid}</b> · acctid: <b>{profResult.acctid}</b>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input
                        value={lookupId}
                        onChange={e => setLookupId(e.target.value)}
                        placeholder="profileid to lookup…"
                        style={{ flex: 1, ...inputStyle }}
                    />
                    <button
                        type="button"
                        disabled={profileLoading}
                        onClick={() => fetchProfile(lookupId.trim())}
                        style={btnStyle(profileLoading)}
                    >
                        {profileLoading ? '…' : 'Fetch'}
                    </button>
                </div>
                {profileError && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red-text)' }}>{profileError}</div>}
                {profile && (
                    <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 12.5 }}>
                        {(Array.isArray(profile) ? profile : [profile]).map((acct, i) => (
                            <div key={i} style={{ marginBottom: i < (Array.isArray(profile) ? profile : [profile]).length - 1 ? 8 : 0 }}>
                                <span style={{ fontWeight: 600 }}>••••{acct.acctid || acct.acct?.slice(-4) || '—'}</span>
                                {acct.expiry && <span style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>exp {acct.expiry}</span>}
                                {acct.accttype && <span style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>{acct.accttype}</span>}
                                {acct.name && <span style={{ marginLeft: 8 }}>{acct.name}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                        </svg>
                        <span>Summary</span>
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
                        <div className="ai-alert-title">Overdue invoices are driving risk</div>
                        <div className="ai-alert-sub">Highest impact on cash flow</div>
                        <div className="ai-alert-text">
                            {hasInvoiceData ? `${fmtR(overdueAmt)} overdue across ${overdueInv.length} invoice${overdueInv.length === 1 ? '' : 's'}` : '$165,400 overdue across 18 invoices'}
                        </div>
                    </div>
                </div>

                <div className="ai-section-label">Key Metrics</div>
                <div className="ai-list">
                    <div className="ai-list-item red">
                        <div className="dot" />
                        <div><div className="ai-list-item-title">{hasInvoiceData ? overdueInv.length : 18} invoices overdue</div></div>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div><div className="ai-list-item-title">{hasInvoiceData ? highRiskAccountCount : 6} high-risk accounts</div></div>
                    </div>
                    <div className="ai-list-item green">
                        <div className="dot" />
                        <div><div className="ai-list-item-title">{fmtR(hasInvoiceData ? outstandingAmt : 234500)} total outstanding</div></div>
                    </div>
                </div>

                <div className="ai-section-label">Focus on overdue invoices first</div>
                <div className="ai-signal-card">
                    <div className="ai-signal-icon green">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                        </svg>
                    </div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">18% ahead of March pace</div>
                        <div className="ai-signal-sub">
                            {hasInvoiceData && collectedPct != null ? `${collectedPct}% collected · ${fmtR(outstandingAmt)} remaining` : '29% collected · $165,400 remaining'}
                        </div>
                    </div>
                </div>

                <div className="ai-section-label">Also Noted</div>
                <div className="ai-list">
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">{custMultiOverdue ? `${custMultiOverdue.name} has multiple overdue` : 'Meridian has multiple overdue'}</div>
                            <div className="ai-list-item-sub">{fmtR(custMultiOverdue ? custMultiOverdue.amt : 12200)} total</div>
                        </div>
                    </div>
                    <div className="ai-list-item green">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">{custOnTrack ? `${custOnTrack.customer_name} payment on track` : 'Nova Corp payment on track'}</div>
                            <div className="ai-list-item-sub">Due in {custOnTrack ? daysTillInv(custOnTrack.due_date) : 5} days</div>
                        </div>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">Apex at risk despite high value</div>
                            <div className="ai-list-item-sub">Slow payment history</div>
                        </div>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">TechCore shows delay patterns</div>
                            <div className="ai-list-item-sub">Watch closely</div>
                        </div>
                    </div>
                    <div className="ai-list-item green">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">{custReliable ? `${custReliable.name} reliable payer` : 'Pacific Solutions reliable payer'}</div>
                            <div className="ai-list-item-sub">Low risk</div>
                        </div>
                    </div>
                </div>

                <div className="ai-suggested">
                    <div className="ai-suggested-title">
                        <SparkleIcon size={14} />
                        <span>Total outstanding</span>
                    </div>
                    <div className="ai-suggested-text">{fmtR(hasInvoiceData ? outstandingAmt : 234500)} across all accounts</div>
                </div>

                <div className="ai-section-label">Payment Stats</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-label">Imported transactions</div>
                    <div className="ai-snapshot-row">
                        <span className="label">Total records</span>
                        <span className="val">{loading ? '…' : txns.length}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Approved</span>
                        <span className="val" style={{ color: 'var(--green-text)' }}>
                            {loading ? '…' : approved.length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Total collected</span>
                        <span className="val">{loading ? '…' : `$${totalAmt.toFixed(2)}`}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Declined</span>
                        <span className="val" style={{ color: declined.length > 0 ? 'var(--red-text)' : undefined }}>
                            {loading ? '…' : declined.length}
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}
