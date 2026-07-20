import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function fmt(n) {
    if (n == null || n === '') return '—';
    const num = parseFloat(n);
    if (isNaN(num)) return String(n);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
}

function SparkleIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
        </svg>
    );
}

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

export default function FinanceHome() {
    const user = useSelector(s => s.message.user);
    const [tabState, setTabState] = useState(1);
    const [chipConv, setChipConv] = useState(false);

    const [gateway, setGateway] = useState(null);
    const [txnSummary, setTxnSummary] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [txns, setTxns] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const yyyy = today.getFullYear();
        const cardDate = `${mm}${dd}${yyyy}`;

        Promise.all([
            fetch(`${BASE}/v1/finance/gateway`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
            fetch(`${BASE}/v1/finance/txnsummary?date=${cardDate}`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
            fetch(`${BASE}/v1/finance/customers`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
            fetch(`${BASE}/v1/finance/quotes`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
            fetch(`${BASE}/v1/finance/transactions`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
            fetch(`${BASE}/v1/finance/approvals`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
        ]).then(([gw, txnSum, custs, qs, txnList, approvs]) => {
            if (gw?.status) setGateway(gw.data);
            if (txnSum?.status) setTxnSummary(txnSum.data);
            if (custs?.status) setCustomers(custs.data || []);
            if (qs?.status) setQuotes(qs.data || []);
            if (txnList?.status) setTxns(txnList.data || []);
            if (approvs?.status) setApprovals(approvs.data || []);
        }).finally(() => setLoading(false));
    }, []);

    const approvedTxns = txns.filter(t => t.respstat === 'A');
    const totalCollected = approvedTxns.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    const pendingQuotes = quotes.filter(q => q.status === 'pending_approval' || q.status === 'sent' || q.status === 'draft');
    const txnCount = txnSummary?.txncount || txnSummary?.txnCnt || null;
    const txnTotal = txnSummary?.totalamt || txnSummary?.totalAmt || null;

    return (
        <>
            <main className="page-main">
                <div className="hero">
                    <div className="hero-icon"><SparkleIcon size={22} /></div>
                    <h1 className="hero-title">{greeting()}, {user?.firstname || 'there'}</h1>
                    <p className="hero-sub">What can I help you with today?</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <SparkleIcon size={16} />
                            <input placeholder="Ask anything about your business..." defaultValue="" />
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

                    {!chipConv && (
                        <div className="chips">
                            {[
                                { title: 'What needs my attention today?', cat: 'Priority' },
                                { title: 'Show pending approvals', cat: 'Approvals' },
                                { title: 'Show transactions today', cat: 'Payments' },
                                { title: 'Summarize gateway status', cat: 'Settings' },
                            ].map(chip => (
                                <div className="chip" key={chip.title} onClick={() => setChipConv(true)}>
                                    <span className="chip-icon"><SparkleIcon size={16} /></span>
                                    <div className="chip-body">
                                        <div className="chip-title">{chip.title}</div>
                                        <div className="chip-cat">{chip.cat}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {chipConv && (
                        <div className="aiconv">
                            <div className="aiconv-header">
                                <div className="aiconv-header-title">
                                    <SparkleIcon size={14} />
                                    <span>AI Assistant</span>
                                </div>
                                <button className="aiconv-close" onClick={() => setChipConv(false)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <div className="aiconv-scroll">
                                <div className="aiconv-msg aiconv-msg-ai">
                                    <div className="aiconv-avatar aiconv-avatar-ai"><SparkleIcon size={14} /></div>
                                    <div className="aiconv-bubble-wrap">
                                        <div className="aiconv-text">AI assistant is not yet connected. Configure an OpenAI key to enable this feature.</div>
                                    </div>
                                </div>
                            </div>
                            <div className="aiconv-input-wrap">
                                <div className="cmd-input aiconv-input">
                                    <SparkleIcon size={14} />
                                    <input placeholder="Ask a follow-up..." defaultValue="" />
                                    <button className="cmd-input-btn">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="19" x2="12" y2="5" />
                                            <polyline points="5 12 12 5 19 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="tabs">
                    <div onClick={() => setTabState(1)} className={`tab ${tabState === 1 ? 'active' : ''}`}>Summary</div>
                    <div onClick={() => setTabState(2)} className={`tab ${tabState === 2 ? 'active' : ''}`}>Gateway</div>
                </div>

                {tabState === 1 && (
                    <div className="summary_body">
                        {/* KPI row — live data */}
                        <div className="kpi-grid">
                            <div className="kpi">
                                <div className="kpi-label">Customers</div>
                                <div className="kpi-value">{loading ? '…' : customers.length || '0'}</div>
                                <div className="kpi-trend gray">{customers.filter(c => c.risk_level === 'high').length} high-risk</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Quotes</div>
                                <div className="kpi-value">{loading ? '…' : quotes.length || '0'}</div>
                                <div className="kpi-trend gray">{pendingQuotes.length} active</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Txns Imported</div>
                                <div className="kpi-value">{loading ? '…' : txns.length || '0'}</div>
                                <div className="kpi-trend gray">{fmt(totalCollected)} approved</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Pending Approvals</div>
                                <div className="kpi-value">{loading ? '…' : pendingApprovals.length || '0'}</div>
                                <div className="kpi-trend gray">{fmt(pendingApprovals.reduce((s, a) => s + (a.amount || 0), 0))}</div>
                            </div>
                        </div>

                        {/* Today's CardPointe txnsummary */}
                        {txnSummary && (
                            <div className="card mt-4" style={{ padding: '14px 18px' }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
                                    Today's CardPointe Summary
                                    <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                                        {gateway?.environment === 'sandbox' ? 'UAT / Sandbox' : 'Live'}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px 16px', fontSize: 13 }}>
                                    {Object.entries(txnSummary)
                                        .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
                                        .map(([k, v]) => (
                                            <div key={k}>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                                                <div style={{ fontWeight: 500 }}>{String(v)}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Customers list */}
                        <div className="section-header" style={{ marginTop: 20 }}>
                            <span className="section-title">Customers</span>
                        </div>

                        {loading ? (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 0' }}>Loading…</div>
                        ) : customers.length === 0 ? (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 0' }}>
                                No customers yet. Add one in <strong>Accounts</strong>.
                            </div>
                        ) : (
                            <div className="dlist">
                                {customers.slice(0, 5).map(c => {
                                    const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                    const riskColor = { high: 'var(--red-text)', medium: 'var(--amber-text)', low: 'var(--green-text)' }[c.risk_level] || 'var(--text-tertiary)';
                                    return (
                                        <div key={c._id} className="entity-row flat">
                                            <div className="avatar" style={{ background: 'var(--bg-subtle)' }}>{initials}</div>
                                            <div className="row-body">
                                                <div className="row-title">{c.name}</div>
                                                <div className="row-sub">{c.email || '—'} · {c.payment_terms || 'net30'}</div>
                                            </div>
                                            {c.credit_limit > 0 && (
                                                <div className="row-amount">${c.credit_limit.toLocaleString()}</div>
                                            )}
                                            <span className="badge" style={{ color: riskColor, fontSize: 11 }}>{c.risk_level || 'low'} risk</span>
                                        </div>
                                    );
                                })}
                                {customers.length > 5 && (
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>
                                        +{customers.length - 5} more — view in Accounts
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quotes list */}
                        <div className="section-header" style={{ marginTop: 20 }}>
                            <span className="section-title">Recent Quotes</span>
                        </div>

                        {loading ? (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 0' }}>Loading…</div>
                        ) : quotes.length === 0 ? (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 0' }}>
                                No quotes yet. Create one in <strong>Quotes</strong>.
                            </div>
                        ) : (
                            <div className="dlist">
                                {quotes.slice(0, 5).map(q => (
                                    <div key={q._id} className="entity-row flat">
                                        <div className="row-body">
                                            <div className="row-title">{q.quote_number || q._id} — {q.customer_name || '—'}</div>
                                            <div className="row-sub">{q.status} · {q.valid_until ? `expires ${q.valid_until.slice(0, 10)}` : ''}</div>
                                        </div>
                                        <div className="row-amount">{fmt(q.total)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tabState === 2 && (
                    <div className="summary_body">
                        <div className="card" style={{ padding: '16px 20px', marginTop: 12 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>CardPointe Gateway</div>
                            {loading ? (
                                <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
                            ) : !gateway ? (
                                <div style={{ color: 'var(--red-text)', fontSize: 13 }}>Not connected — check CARDPOINTE_* env vars</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 16px', fontSize: 13 }}>
                                    {Object.entries(gateway)
                                        .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
                                        .map(([k, v]) => (
                                            <div key={k}>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                                                <div style={{ fontWeight: 500, color: k === 'connected' ? (v ? 'var(--green-text)' : 'var(--red-text)') : undefined }}>
                                                    {String(v)}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {txnSummary && (
                            <div className="card" style={{ padding: '16px 20px', marginTop: 12 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Today's Transaction Summary</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px 16px', fontSize: 13 }}>
                                    {Object.entries(txnSummary)
                                        .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
                                        .map(([k, v]) => (
                                            <div key={k}>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                                                <div style={{ fontWeight: 500 }}>{String(v)}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <SparkleIcon size={16} />
                        <span>Pending Approvals</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                {loading ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 16px' }}>Loading…</div>
                ) : pendingApprovals.length === 0 ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 16px' }}>No pending approvals</div>
                ) : (
                    <div className="ai-list">
                        {pendingApprovals.slice(0, 6).map(a => (
                            <div key={a._id} className="ai-list-item amber">
                                <div className="dot" />
                                <div>
                                    <div className="ai-list-item-title">{a.title || a.reference || a._id}</div>
                                    <div className="ai-list-item-sub">{fmt(a.amount)}{a.requested_by ? ` · ${a.requested_by}` : ''}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="ai-section-label" style={{ marginTop: 16 }}>Gateway Status</div>
                <div>
                    {gateway ? (
                        <>
                            <div className="ai-signal-card">
                                <div className={`ai-signal-icon ${gateway.connected ? 'green' : 'red'}`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                        <line x1="12" y1="20" x2="12.01" y2="20" />
                                    </svg>
                                </div>
                                <div style={{ flex: '1 1 0%' }}>
                                    <div className="ai-signal-title">{gateway.connected ? 'Connected' : 'Disconnected'}</div>
                                    <div className="ai-signal-sub">{gateway.environment} · MID {gateway.merchantId || '—'}</div>
                                </div>
                            </div>
                            <div className="ai-signal-card">
                                <div className="ai-signal-icon gray">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                </div>
                                <div style={{ flex: '1 1 0%' }}>
                                    <div className="ai-signal-title">Transactions today</div>
                                    <div className="ai-signal-sub">
                                        {txnCount != null ? `${txnCount} txns` : 'No summary data'}
                                        {txnTotal != null ? ` · $${parseFloat(txnTotal).toFixed(2)}` : ''}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '8px 0' }}>
                            Gateway not configured
                        </div>
                    )}
                </div>

                <div className="ai-section-label" style={{ marginTop: 16 }}>Today's Activity</div>
                <div>
                    <div className="ai-snapshot-row" style={{ padding: '8px 0' }}>
                        <span className="label">Customers</span>
                        <span className="val">{loading ? '…' : customers.length}</span>
                    </div>
                    <div className="ai-snapshot-row" style={{ padding: '8px 0' }}>
                        <span className="label">Quotes total</span>
                        <span className="val">{loading ? '…' : quotes.length}</span>
                    </div>
                    <div className="ai-snapshot-row" style={{ padding: '8px 0' }}>
                        <span className="label">Imported txns</span>
                        <span className="val">{loading ? '…' : txns.length}</span>
                    </div>
                    <div className="ai-snapshot-row" style={{ padding: '8px 0' }}>
                        <span className="label">Collected</span>
                        <span className="val">{loading ? '…' : fmt(totalCollected)}</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
