import { useState, useEffect } from 'react';

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

const SparkleIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
        <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
    </svg>
);

const RISK_COLOR = { low: 'var(--green-text)', medium: 'var(--amber-text)', high: 'var(--red-text)' };
const RISK_BG   = { low: 'var(--green-bg)',   medium: 'var(--amber-bg)',   high: 'var(--red-bg)'   };

const chips = [
    {
        title: 'Which customers need attention?',
        cat: 'Accounts',
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
        title: 'Which accounts have overdue invoices?',
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

function CustomerRow({ c }) {
    const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {c.email || '—'}{c.payment_terms ? ` · ${c.payment_terms}` : ''}
                    {c.phone ? ` · ${c.phone}` : ''}
                </div>
            </div>
            <span style={{
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                color: c.cardpointe_profile_id ? 'var(--green-text)' : 'var(--text-meta)',
                background: c.cardpointe_profile_id ? 'var(--green-bg)' : 'var(--bg-subtle)',
                borderRadius: 99, padding: '2px 8px',
            }}>
                {c.cardpointe_profile_id ? 'card on file' : 'no card'}
            </span>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {c.credit_limit > 0 && (
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>
                        ${c.credit_limit.toLocaleString()} limit
                    </div>
                )}
                <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: RISK_COLOR[c.risk_level] || 'var(--text-tertiary)',
                    background: RISK_BG[c.risk_level] || 'var(--bg-subtle)',
                    borderRadius: 99, padding: '2px 8px',
                }}>
                    {c.risk_level || 'low'} risk
                </span>
            </div>
        </div>
    );
}

function CustomerSection({ tone, label, items }) {
    if (!items.length) return null;
    const colors = { red: 'var(--red-text)', amber: 'var(--amber-text)', green: 'var(--green-text)' };
    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors[tone] || 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {label} · {items.length}
            </div>
            {items.map(c => <CustomerRow key={c._id} c={c} />)}
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 8,
    border: '1px solid var(--border-primary)', background: 'var(--bg-input, var(--bg-subtle))',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 3, display: 'block' };

export default function FinanceAccounts() {
    const { customers, loading, error, reload } = useCustomers();
    const { txns, txnsLoading } = useTransactions();
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', phone: '', payment_terms: 'net30', credit_limit: '', account: '', expiry: '' });

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

    const high_risk = customers.filter(c => c.risk_level === 'high');
    const med_risk  = customers.filter(c => c.risk_level === 'medium');
    const low_risk  = customers.filter(c => c.risk_level !== 'high' && c.risk_level !== 'medium');

    async function createCustomer(e) {
        e.preventDefault();
        if (!form.name.trim()) return setCreateError('Name required');
        setCreating(true); setCreateError('');
        try {
            const r = await fetch(`${BASE}/v1/finance/customers`, {
                method: 'POST',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim() || undefined,
                    phone: form.phone.trim() || undefined,
                    payment_terms: form.payment_terms,
                    credit_limit: parseFloat(form.credit_limit) || 0,
                    account: form.account.trim() || undefined,
                    expiry: form.expiry.trim() || undefined,
                }),
            });
            const j = await r.json();
            if (!j.status) throw new Error(j.error || 'Create failed');
            if (form.account && !j.data.cardpointe_profile_id) {
                setCreateError(j.cardpointe_profile?.resptext || 'Customer created, but card could not be saved — check the card token/expiry.');
            }
            setShowForm(false);
            setForm({ name: '', email: '', phone: '', payment_terms: 'net30', credit_limit: '', account: '', expiry: '' });
            reload();
        } catch (err) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    }

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

    return (
        <>
            <main className="page-main">
                <div className="hero">
                    <div className="hero-icon"><SparkleIcon size={22} /></div>
                    <h1 className="hero-title">Accounts</h1>
                    <p className="hero-sub">Your customer portfolio and account intelligence</p>
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

                {!loading && high_risk.length > 0 && (
                    <div className="ai-update-banner">
                        <span className="dot" />
                        <div>{high_risk.length} account{high_risk.length === 1 ? '' : 's'} need attention based on recent activity.</div>
                    </div>
                )}

                <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setShowForm(v => !v); setShowImport(false); setCreateError(''); }}
                        style={{ fontSize: 13 }}
                    >
                        {showForm ? 'Cancel' : '+ Add Customer'}
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setShowImport(v => !v); setShowForm(false); setImportError(''); }}
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

                {showForm && (
                    <form onSubmit={createCustomer} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={labelStyle}>Name *</label>
                                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" required />
                            </div>
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="billing@acme.com" type="email" />
                            </div>
                            <div>
                                <label style={labelStyle}>Phone</label>
                                <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                            </div>
                            <div>
                                <label style={labelStyle}>Payment Terms</label>
                                <select style={inputStyle} value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                                    <option value="due_on_receipt">Due on Receipt</option>
                                    <option value="net15">Net 15</option>
                                    <option value="net30">Net 30</option>
                                    <option value="net45">Net 45</option>
                                    <option value="net60">Net 60</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Credit Limit ($)</label>
                                <input style={inputStyle} value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} placeholder="10000" type="number" min="0" />
                            </div>
                            <div>
                                <label style={labelStyle}>Card Token / Account</label>
                                <input style={inputStyle} value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} placeholder="4111111111111111 (UAT test PAN)" />
                            </div>
                            <div>
                                <label style={labelStyle}>Expiry (MMYY)</label>
                                <input style={inputStyle} value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} placeholder="1228" maxLength={4} />
                            </div>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                            Card is optional here, but a customer needs one on file before a quote can charge them.
                        </div>
                        {createError && (
                            <div style={{ fontSize: 12, color: 'var(--red-text)', background: 'var(--red-bg)', borderRadius: 6, padding: '6px 8px' }}>{createError}</div>
                        )}
                        <button className="btn btn-primary btn-sm" type="submit" disabled={creating} style={{ alignSelf: 'flex-start', fontSize: 13 }}>
                            {creating ? 'Creating…' : 'Create Customer'}
                        </button>
                    </form>
                )}

                {loading && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '20px 0' }}>Loading customers…</div>}
                {error && <div style={{ fontSize: 13, color: 'var(--red-text)', padding: '20px 0' }}>{error}</div>}

                {!loading && customers.length === 0 && !error && (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                        No customers yet. Add your first customer above.
                    </div>
                )}

                <CustomerSection tone="red"   label="High Risk"   items={high_risk} />
                <CustomerSection tone="amber" label="Medium Risk"  items={med_risk} />
                <CustomerSection tone="green" label="Low Risk"     items={low_risk} />
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <SparkleIcon size={16} />
                        <span>AI Insights</span>
                    </div>
                    <span className="ai-live">Live</span>
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
        </>
    );
}
