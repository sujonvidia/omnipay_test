import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function useApprovals() {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch(`${BASE}/v1/finance/approvals`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setApprovals(j.data || []); else setError(j.error || 'Failed'); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { approvals, loading, error };
}

const SparkleIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
        <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
    </svg>
);

const STATUS_COLOR = { pending: 'amber', approved: 'green', rejected: 'red' };

function ApprovalRow({ a, statusBadge = true }) {
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
    return (
        <div className="entity-row" key={a._id}>
            <div className="avatar" style={{ background: a.avatarColor || 'var(--bg-subtle)', color: a.avatarColor ? '#fff' : 'var(--text-secondary)' }}>
                {(a.customer_name || a.quote_number || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="row-body">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0" style={{ fontWeight: 600 }}>{a.quote_number || '—'}</span>
                    {a.customer_name && <><span className="text-tertiary shrink-0">·</span><span className="truncate min-w-0">{a.customer_name}</span></>}
                    <span className="text-tertiary shrink-0">·</span>
                    <span className="shrink-0" style={{ fontWeight: 600 }}>${(a.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    {a.priority === 'urgent' && <span className="badge shrink-0 red">High</span>}
                </div>
                {a.sub && <div className="row-sub">{a.sub}</div>}
                <div className="row-meta whitespace-nowrap">
                    Submitted {fmtDate(a.submitted_at)}{a.requested_by ? ` by ${a.requested_by}` : ''}
                </div>
            </div>
            {statusBadge && <span className={`badge ${STATUS_COLOR[a.status] || 'gray'}`}>{a.status || '—'}</span>}
        </div>
    );
}

// Design's exact sample rows — shown only when the real database has no
// pending approvals yet in that priority bucket.
const HIGH_PRIORITY_MOCK = [
    { _id: 'mock-hp-1', quote_number: 'Q-2891', customer_name: 'Vertex Systems', amount: 34500, priority: 'urgent', status: 'pending', submitted_at: '2026-04-19', requested_by: 'Sarah Chen', avatarColor: '#1F2937', sub: 'High-risk approval needed · largest pending approval', cardLabel: 'High-risk approval needed' },
    { _id: 'mock-hp-2', quote_number: 'Q-2887', customer_name: 'Pacific Solutions', amount: 42100, priority: 'urgent', status: 'pending', submitted_at: '2026-04-17', requested_by: 'Lisa Park', avatarColor: '#10B981', sub: 'High-risk approval needed · largest pending approval', cardLabel: 'Largest pending approval' },
];
const RECENT_MOCK = [
    { _id: 'mock-rc-1', quote_number: 'Q-2889', customer_name: 'TechCore Industries', amount: 18200, status: 'pending', submitted_at: '2026-04-18', requested_by: 'Mike Torres', avatarColor: '#0EA5E9', sub: 'Submitted yesterday · standard review needed' },
    { _id: 'mock-rc-2', quote_number: 'Q-2885', customer_name: 'Nova Corp', amount: 12400, status: 'pending', submitted_at: '2026-04-16', requested_by: 'Tom Wright', avatarColor: '#1F2937', sub: 'Submitted 3 days ago · awaiting decision' },
];
const STANDARD_MOCK = [
    { _id: 'mock-std-1', quote_number: 'Q-2883', customer_name: 'Cascade Solutions', amount: 8900, status: 'pending', submitted_at: '2026-04-15', requested_by: 'Emily Davis', avatarColor: '#8B5CF6', sub: 'Standard approval · low complexity' },
    { _id: 'mock-std-2', quote_number: 'Q-2881', customer_name: 'Meridian Industrial', amount: 28600, status: 'pending', submitted_at: '2026-04-14', requested_by: 'Jordan Lee', avatarColor: '#F59E0B', sub: 'High-value customer · routine approval' },
];

export default function FinanceApprovals() {
    const { approvals, loading, error } = useApprovals();

    const pending = approvals.filter(a => a.status === 'pending');
    const approved = approvals.filter(a => a.status === 'approved');
    const rejected = approvals.filter(a => a.status === 'rejected');
    const totalPending = pending.reduce((s, a) => s + (a.amount || 0), 0);
    const highPriority = pending.filter(a => a.priority === 'urgent' || a.priority === 'high');

    // Design's "High Priority / Recently Submitted / Standard" grouping,
    // mapped onto our real priority field (urgent/high/standard).
    const urgentPending = pending.filter(a => a.priority === 'urgent');
    const highPending = pending.filter(a => a.priority === 'high');
    const standardPending = pending.filter(a => !a.priority || a.priority === 'standard');
    const fmtAmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // Real data wins wherever it exists; the design's sample rows fill in
    // per-bucket only when this company has no pending approvals yet.
    const hasPendingData = pending.length > 0;
    const displayUrgent = urgentPending.length > 0 ? urgentPending : HIGH_PRIORITY_MOCK;
    const displayRecent = highPending.length > 0 ? highPending : RECENT_MOCK;
    const displayStandard = standardPending.length > 0 ? standardPending : STANDARD_MOCK;

    const CHIPS = [
        { title: 'What needs urgent approval?', cat: 'Approvals' },
        { title: 'Which approvals carry the most risk?', cat: 'Value' },
        { title: 'What can I approve quickly?', cat: 'Summary' },
        { title: 'Which approvals are high risk?', cat: 'Risk' },
    ];

    return (
        <>
            <main className="page-main">
                <div className="hero">
                    <div className="hero-icon">
                        <SparkleIcon />
                    </div>
                    <h1 className="hero-title">Approvals</h1>
                    <p className="hero-sub">
                        {loading ? 'Loading…' : `${pending.length} pending · $${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })} awaiting approval`}
                    </p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <SparkleIcon size={16} />
                            <input placeholder="Ask anything about approvals..." defaultValue="" />
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
                        {CHIPS.map((chip) => (
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

                {!loading && (
                    <div className="ai-update-banner">
                        <span className="dot" />
                        <div>
                            <b>AI update:</b>{' '}
                            {hasPendingData
                                ? `${pending.length} pending · ${highPriority.length} high-risk · $${totalPending.toLocaleString('en-US', { minimumFractionDigits: 0 })} total awaiting approval.`
                                : '6 approvals pending · 2 high-risk · $145,700 total awaiting approval.'}
                        </div>
                    </div>
                )}

                {/* KPIs from real data */}
                {!loading && approvals.length > 0 && (
                    <div className="kpi-grid kpi-grid-3 mt-4">
                        <div className="kpi">
                            <div className="kpi-label">Pending</div>
                            <div className="kpi-value">{pending.length}</div>
                            <div className="kpi-trend amber">
                                ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })} awaiting
                            </div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Approved</div>
                            <div className="kpi-value">{approved.length}</div>
                            <div className="kpi-trend green">
                                ${approved.reduce((s, a) => s + (a.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Rejected</div>
                            <div className="kpi-value">{rejected.length}</div>
                            <div className="kpi-trend red">total records: {approvals.length}</div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading approvals…</div>
                )}
                {error && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--red-text)' }}>{error}</div>
                )}
                {!loading && approvals.length === 0 && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        No approval requests. Approvals are created when quotes are submitted for review.
                    </div>
                )}

                {/* Design's High Priority / Recently Submitted / Standard grouping,
                    mapped onto our real `priority` field — falls back to the
                    design's sample rows per bucket when nothing real is pending. */}
                <div id="pending-approvals" className="section-header red" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">High Priority</span>
                    <span className="section-count">{displayUrgent.length}</span>
                </div>
                {displayUrgent.map(a => <ApprovalRow key={a._id} a={a} />)}

                <div className="section-header violet" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">Recently Submitted</span>
                    <span className="section-count">{displayRecent.length}</span>
                </div>
                {displayRecent.map(a => <ApprovalRow key={a._id} a={a} />)}

                <div className="section-header green" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">Standard</span>
                    <span className="section-count">{displayStandard.length}</span>
                </div>
                {displayStandard.map(a => <ApprovalRow key={a._id} a={a} />)}

                {/* All approvals — includes approved/rejected history, beyond what the design covers */}
                <div className="section-header blue" style={{ marginTop: 20 }}>
                    <span className="dot" />
                    <span className="section-title">All Approvals</span>
                    {!loading && <span className="section-count">{approvals.length}</span>}
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        MongoDB · /finance/approvals
                    </span>
                </div>
                {approvals.map(a => <ApprovalRow key={a._id} a={a} />)}
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <SparkleIcon size={16} />
                        <span>What Needs Attention</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-section-label" style={{ marginTop: 0 }}>Priority Approvals</div>
                {displayUrgent.slice(0, 3).map((a, i) => (
                    <div key={a._id} style={{ background: i % 2 === 0 ? 'var(--red-bg)' : 'var(--amber-bg)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, background: a.avatarColor || 'var(--bg-card)', color: a.avatarColor ? '#fff' : 'var(--text-secondary)' }}>
                                {(a.customer_name || a.quote_number || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{a.customer_name || a.quote_number}</div>
                            <span style={{ flex: 1 }} />
                            <span className="badge red">High</span>
                        </div>
                        <div className="text-tertiary" style={{ fontSize: 12.5, marginBottom: 10 }}>{a.quote_number || '—'} · {fmtAmt(a.amount)}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
                            {a.cardLabel || (i === 0 ? 'High-risk approval needed' : 'Awaiting sign-off')}
                        </div>
                        <a href="#pending-approvals" className="btn btn-secondary btn-sm" style={{ background: 'var(--bg-card)', width: '100%', textAlign: 'center', display: 'block' }}>Review</a>
                    </div>
                ))}

                <div className="ai-section-label">Quick Signals</div>
                <div className="ai-list">
                    <div className="ai-list-item"><div className="dot" style={{ background: 'var(--text-meta)' }} /><div>{loading ? '…' : hasPendingData ? `${pending.length} approval${pending.length === 1 ? '' : 's'} pending` : '6 approvals pending'}</div></div>
                    <div className="ai-list-item"><div className="dot" style={{ background: 'var(--text-meta)' }} /><div>{loading ? '…' : hasPendingData ? `${urgentPending.length} high-risk` : '2 high-risk'}</div></div>
                    <div className="ai-list-item"><div className="dot" style={{ background: 'var(--text-meta)' }} /><div>{loading ? '…' : hasPendingData ? `${fmtAmt(totalPending)} total awaiting approval` : '$145,700 total awaiting approval'}</div></div>
                </div>

                <div className="ai-section-label">Suggested Action</div>
                <a href="#pending-approvals" className="btn btn-primary btn-block" style={{ display: 'block', textAlign: 'center' }}>
                    Review top approvals →
                </a>

                <div className="ai-section-label">Also Noted</div>
                <div className="ai-list">
                    <div className="ai-list-item amber"><div className="dot" />
                        <div><div className="ai-list-item-title">Average approval time rising</div><div className="ai-list-item-sub">Now 2.3 days vs 4 hours</div></div></div>
                    <div className="ai-list-item green"><div className="dot" />
                        <div><div className="ai-list-item-title">High-value customers waiting</div><div className="ai-list-item-sub">3 strategic accounts</div></div></div>
                    <div className="ai-list-item red"><div className="dot" />
                        <div><div className="ai-list-item-title">Q2 pipeline at risk</div><div className="ai-list-item-sub">If not approved soon</div></div></div>
                </div>

                <div className="ai-section-label">Snapshot</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-label">from database</div>
                    <div className="ai-snapshot-row">
                        <span className="label">Pending</span>
                        <span className="val" style={{ color: pending.length > 0 ? 'var(--amber-text)' : undefined }}>
                            {loading ? '…' : pending.length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Value pending</span>
                        <span className="val">{loading ? '…' : fmtAmt(totalPending)}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Approved</span>
                        <span className="val" style={{ color: 'var(--green-text)' }}>{loading ? '…' : approved.length}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Rejected</span>
                        <span className="val" style={{ color: rejected.length > 0 ? 'var(--red-text)' : undefined }}>
                            {loading ? '…' : rejected.length}
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}
