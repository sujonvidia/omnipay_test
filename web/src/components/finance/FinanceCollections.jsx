import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function useTransactions() {
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`${BASE}/v1/finance/transactions`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setTxns(j.data || []); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);
    return { txns, loading };
}

function statusColor(respstat) {
    if (respstat === 'A') return 'var(--green-text)';
    if (respstat === 'B') return 'var(--amber-text)';
    return 'var(--red-text)';
}

function statusLabel(respstat, resptext) {
    if (respstat === 'A') return resptext || 'Approved';
    if (respstat === 'B') return resptext || 'Retry';
    return resptext || 'Declined';
}

function formatAuthDate(d) {
    if (!d || d.length !== 8) return d || '—';
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function TransactionCard({ txn, onClear }) {
    const [actionState, setActionState] = useState({ loading: false, result: null, error: '' });
    const stat = txn.respstat;
    const color = statusColor(stat);
    const label = statusLabel(stat, txn.resptext);

    async function doAction(type) {
        setActionState({ loading: true, result: null, error: '' });
        try {
            const r = await fetch(`${BASE}/v1/finance/${type}/${encodeURIComponent(txn.retref)}`, {
                method: 'PUT', credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
            });
            const j = await r.json();
            if (!j.status) throw new Error(j.error || `${type} failed`);
            setActionState({ loading: false, result: j.data, error: '' });
        } catch (e) {
            setActionState({ loading: false, result: null, error: e.message });
        }
    }

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 14px 12px', marginTop: 8, background: 'var(--card-bg, var(--bg-subtle))', position: 'relative' }}>
            <button
                type="button"
                onClick={onClear}
                style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1 }}
                title="Clear"
            >×</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 18 }}>${parseFloat(txn.amount || 0).toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' }}>{txn.currency || 'USD'}</span></span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color, background: `${color}18`, borderRadius: 99, padding: '2px 10px' }}>{label}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12.5 }}>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Card</span><br /><b>••••{txn.lastfour || '—'}</b></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Cardholder</span><br /><b>{txn.name || '—'}</b></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Auth Code</span><br /><b>{txn.authcode || '—'}</b></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Auth Date</span><br /><b>{formatAuthDate(txn.authdate)}</b></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Settlement</span><br /><b>{txn.setlstat || '—'}</b></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Entry</span><br /><b>{txn.entrymode || '—'}</b></div>
            </div>

            {(txn.voidable === 'Y' || txn.refundable === 'Y') && !actionState.result && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                    {txn.voidable === 'Y' && (
                        <button className="btn btn-secondary btn-sm" disabled={actionState.loading} onClick={() => doAction('void')} style={{ flex: 1 }}>
                            {actionState.loading ? '…' : 'Void'}
                        </button>
                    )}
                    {txn.refundable === 'Y' && (
                        <button className="btn btn-secondary btn-sm" disabled={actionState.loading} onClick={() => doAction('refund')} style={{ flex: 1 }}>
                            {actionState.loading ? '…' : 'Refund'}
                        </button>
                    )}
                </div>
            )}

            {actionState.error && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red-text)', background: 'var(--red-bg)', borderRadius: 6, padding: '6px 8px' }}>
                    {actionState.error}
                </div>
            )}

            {actionState.result && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--green-text)', background: 'var(--green-bg)', borderRadius: 6, padding: '6px 8px' }}>
                    {actionState.result.resptext || 'Action completed'} · ref: {actionState.result.retref}
                </div>
            )}

            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                ref: {txn.retref}
            </div>
        </div>
    );
}

function setlColor(s) {
    if (!s) return 'var(--text-tertiary)';
    const sl = s.toLowerCase();
    if (sl.includes('settled') || sl.includes('captured')) return 'var(--green-text)';
    if (sl.includes('authorized') || sl.includes('queued')) return 'var(--amber-text)';
    if (sl.includes('void')) return 'var(--red-text)';
    return 'var(--text-tertiary)';
}

export default function FinanceCollections() {
    const { txns, loading: txnsLoading } = useTransactions();
    const [retref, setRetref] = useState('');
    const [txn, setTxn] = useState(null);
    const [txnError, setTxnError] = useState('');
    const [txnLoading, setTxnLoading] = useState(false);

    const approved = txns.filter(t => t.respstat === 'A');
    const declined = txns.filter(t => t.respstat !== 'A');
    const totalCollected = approved.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    async function lookupPayment(e) {
        e.preventDefault();
        const ref = retref.trim();
        if (!ref) return;
        setTxnLoading(true);
        setTxnError('');
        setTxn(null);
        try {
            const res = await fetch(`${BASE}/v1/finance/payment/${encodeURIComponent(ref)}`, {
                headers: authH(), credentials: 'include',
            });
            const json = await res.json();
            if (!res.ok || !json.status) throw new Error(json.error || 'Lookup failed');
            setTxn(json.data);
        } catch (err) {
            setTxnError(err.message);
        } finally {
            setTxnLoading(false);
        }
    }

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
                    <h1 className="hero-title">Collections</h1>
                    <p className="hero-sub">Verified payments from CardPointe / Fiserv</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                                <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                            </svg>
                            <input placeholder="Ask anything about collections..." defaultValue="" />
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
                </div>

                {/* KPIs from real data */}
                {!txnsLoading && txns.length > 0 && (
                    <div className="kpi-grid kpi-grid-3 mt-4">
                        <div className="kpi">
                            <div className="kpi-label">Total Collected</div>
                            <div className="kpi-value">${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="kpi-trend green">{approved.length} approved txns</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Declined / Failed</div>
                            <div className="kpi-value">{declined.length}</div>
                            <div className="kpi-trend red">
                                {txns.length > 0 ? ((declined.length / txns.length) * 100).toFixed(0) : 0}% decline rate
                            </div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Total Records</div>
                            <div className="kpi-value">{txns.length}</div>
                            <div className="kpi-trend gray">imported transactions</div>
                        </div>
                    </div>
                )}

                {/* Imported transactions list */}
                <div className="section-header violet" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">Imported Transactions</span>
                    {!txnsLoading && <span className="section-count">{txns.length}</span>}
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        MongoDB · /finance/transactions
                    </span>
                </div>

                {txnsLoading && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                )}
                {!txnsLoading && txns.length === 0 && (
                    <div className="card" style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        No transactions imported yet. Use Receivables to import a retref.
                    </div>
                )}
                {txns.length > 0 && (
                    <div className="dlist">
                        {txns.map((t, i) => (
                            <div className="entity-row flat" key={t.retref || i} style={{ padding: '12px 18px' }}>
                                <div className="avatar" style={{
                                    width: 34, height: 34, fontSize: 12,
                                    background: t.respstat === 'A' ? 'var(--green-bg)' : 'var(--red-bg)',
                                    color: t.respstat === 'A' ? 'var(--green-text)' : 'var(--red-text)',
                                }}>
                                    {t.respstat === 'A' ? '✓' : '✗'}
                                </div>
                                <div className="row-body">
                                    <div className="row-title" style={{ fontSize: 13 }}>
                                        {t.cardholder_name || 'Unknown'}
                                        {t.card_last_four ? <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> ••••{t.card_last_four}</span> : ''}
                                    </div>
                                    <div className="row-sub" style={{ fontSize: 12 }}>
                                        <span style={{ color: setlColor(t.setlstat) }}>{t.setlstat || '—'}</span>
                                        {' · '}{t.authdate ? formatAuthDate(t.authdate) : '—'}
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
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                        </svg>
                        <span>Verify Payment</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-section-label">Lookup by retref</div>
                <form onSubmit={lookupPayment} style={{ display: 'flex', gap: 6 }}>
                    <input
                        value={retref}
                        onChange={e => setRetref(e.target.value)}
                        placeholder="Enter retref…"
                        style={{
                            flex: 1, fontSize: 12.5, padding: '6px 10px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--bg-subtle)',
                            color: 'var(--text-primary)', outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={txnLoading}
                        style={{
                            padding: '6px 12px', borderRadius: 8, border: 'none',
                            background: 'var(--primary)', color: '#fff', fontSize: 12.5,
                            fontWeight: 600, cursor: txnLoading ? 'default' : 'pointer',
                            opacity: txnLoading ? 0.6 : 1,
                        }}
                    >
                        {txnLoading ? '…' : 'Look up'}
                    </button>
                </form>

                {txnError && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--red-text)', background: 'var(--red-bg)', borderRadius: 8, padding: '8px 10px' }}>
                        {txnError}
                    </div>
                )}

                {txn && <TransactionCard txn={txn} onClear={() => { setTxn(null); setRetref(''); }} />}

                {!txnsLoading && txns.length > 0 && (
                    <>
                        <div className="ai-section-label" style={{ marginTop: 16 }}>Quick lookup</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {txns.slice(0, 5).map(t => (
                                <button
                                    key={t.retref}
                                    type="button"
                                    onClick={() => setRetref(t.retref)}
                                    style={{
                                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                                        borderRadius: 6, padding: '5px 8px', fontSize: 11.5,
                                        color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                                        display: 'flex', justifyContent: 'space-between',
                                    }}
                                >
                                    <span style={{ color: 'var(--text-tertiary)' }}>{t.retref}</span>
                                    <span style={{ fontWeight: 600 }}>${parseFloat(t.amount || 0).toFixed(2)}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </aside>
        </>
    );
}
