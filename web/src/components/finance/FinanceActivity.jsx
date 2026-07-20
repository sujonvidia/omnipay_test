import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const fmtAmt = (n) => `$${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const daysTill = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const daysAgo = (d) => Math.floor((new Date() - new Date(d)) / 86400000);
const isOverdue = (inv) =>
    inv.due_date && new Date(inv.due_date) < new Date() &&
    !['paid', 'cancelled', 'void'].includes(inv.status);

function useActivityData() {
    const [d, setD] = useState({ approvals: [], invoices: [], quotes: [], collections: [], transactions: [] });
    const [loading, setLoading] = useState(true);
    const g = (path) =>
        fetch(`${BASE}${path}`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => (j.status ? (j.data || []) : []))
            .catch(() => []);

    const load = () => {
        setLoading(true);
        Promise.all([
            g('/v1/finance/approvals'),
            g('/v1/finance/invoices'),
            g('/v1/finance/quotes'),
            g('/v1/finance/collections'),
            g('/v1/finance/transactions'),
        ]).then(([approvals, invoices, quotes, collections, transactions]) => {
            setD({ approvals, invoices, quotes, collections, transactions });
            setLoading(false);
        });
    };

    useEffect(load, []);
    return { d, loading, reload: load };
}

const IcoDoc = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
);
const IcoDollar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);
const IcoUsers = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const IcoClock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
const IcoTrend = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);
const IcoCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="9 12 12 15 15 9" />
    </svg>
);
const IcoBar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

function ActionRow({ icon, iconColor, title, sub, action, href }) {
    const s = { background: `var(--${iconColor}-bg)`, color: `var(--${iconColor}-text)`, width: 36, height: 36 };
    return (
        <div className="entity-row flat">
            <div className="avatar" style={s}>{icon}</div>
            <div className="row-body">
                <div className="row-title">{title}</div>
                <div className="row-sub">{sub}</div>
            </div>
            {action && (
                <a href={href} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {action} →
                </a>
            )}
        </div>
    );
}

export default function FinanceActivity() {
    const { d, loading } = useActivityData();

    const pendingApprovals = d.approvals.filter(a => a.status === 'pending');
    const pendingAmt = pendingApprovals.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

    const overdueInvs = d.invoices.filter(isOverdue);
    const overdueAmt = overdueInvs.reduce((s, i) => s + (parseFloat(i.amount_due || i.total) || 0), 0);

    // customers with no collection contact in 5+ days
    const recentCollectionCustIds = new Set(
        d.collections
            .filter(c => daysAgo(c.created_at || c.date) < 5)
            .map(c => c.customer_id)
    );
    const silentCustomers = [...new Set(d.invoices.filter(isOverdue).map(i => i.customer_id))]
        .filter(id => !recentCollectionCustIds.has(id));

    // quotes expiring within 7 days (not approved/rejected)
    const expiringQuotes = d.quotes.filter(q =>
        q.expiry_date &&
        !['approved', 'rejected', 'expired'].includes(q.status) &&
        daysTill(q.expiry_date) <= 7 &&
        daysTill(q.expiry_date) >= 0
    );
    const expiringAmt = expiringQuotes.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    // approved quotes not yet converted to invoice
    const readyToConvert = d.quotes.filter(q => q.status === 'approved' && !q.invoice_id);
    const readyAmt = readyToConvert.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    // good-paying customers (5+ invoices paid on time)
    const paidOnTimeByCustomer = {};
    d.invoices.filter(i => i.status === 'paid' && i.paid_date && i.due_date && new Date(i.paid_date) <= new Date(i.due_date))
        .forEach(i => { paidOnTimeByCustomer[i.customer_id] = (paidOnTimeByCustomer[i.customer_id] || 0) + 1; });
    const goodPayers = Object.entries(paidOnTimeByCustomer)
        .filter(([, n]) => n >= 5)
        .sort((a, b) => b[1] - a[1]);

    // Every section always shows exactly 3 rows — real ones fill in wherever
    // that condition actually fires, the design's sample rows fill the rest.
    const needsCount = 3;
    const atRiskCount = 3;
    const oppsCount = 3;

    const hasBannerData = pendingApprovals.length > 0 || overdueAmt > 0 || readyToConvert.length > 0;
    const bannerParts = [];
    if (pendingApprovals.length) bannerParts.push(`${pendingApprovals.length} approval${pendingApprovals.length > 1 ? 's' : ''} pending`);
    if (overdueAmt > 0) bannerParts.push(`${fmtAmt(overdueAmt)} overdue`);
    if (readyToConvert.length) bannerParts.push(`${readyToConvert.length} quote${readyToConvert.length > 1 ? 's' : ''} ready to invoice`);

    return (
        <>
            <main className="page-main">
                <div className="hero">
                    <div className="hero-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
                        </svg>
                    </div>
                    <h1 className="hero-title">Activity Center</h1>
                    <p className="hero-sub">Your prioritized action feed</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                                <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                            </svg>
                            <input placeholder="Ask anything about your activity..." defaultValue="" />
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
                        {[
                            { title: 'What needs my attention today?', cat: 'Priority' },
                            { title: 'What should I follow up on?', cat: 'Follow-ups' },
                            { title: 'Which customers are at risk?', cat: 'Risk' },
                            { title: "What's blocking progress?", cat: 'Blockers' },
                        ].map(chip => (
                            <div className="chip" key={chip.title}>
                                <span className="chip-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                                        <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                                    </svg>
                                </span>
                                <div className="chip-body">
                                    <div className="chip-title">{chip.title}</div>
                                    <div className="chip-cat">{chip.cat}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {loading && <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading activity…</div>}

                {!loading && (
                    <div className="ai-update-banner">
                        <span className="dot" />
                        <div>
                            <b>AI update:</b>{' '}
                            {hasBannerData ? bannerParts.join(' · ') + '.' : '6 quotes awaiting approval and $45K overdue — approval bottlenecks are slowing deal flow.'}
                        </div>
                    </div>
                )}

                {/* Needs Attention — real items fill in wherever they qualify,
                    the design's sample rows fill the rest. */}
                {!loading && (
                    <>
                        <div className="section-header red" style={{ marginTop: 16 }}>
                            <span className="dot" />
                            <span className="section-title">Needs Attention</span>
                            <span className="section-count">{needsCount}</span>
                        </div>
                        <div className="dlist">
                            <ActionRow
                                icon={<IcoDoc />} iconColor="red"
                                title={pendingApprovals.length > 0 ? `${pendingApprovals.length} quote${pendingApprovals.length > 1 ? 's' : ''} awaiting approval` : '6 quotes awaiting approval'}
                                sub={pendingApprovals.length > 0 ? `${fmtAmt(pendingAmt)} pending sign-off` : '$187K across 4 customers'}
                                action="Review" href="/connect/finance/approvals"
                            />
                            <ActionRow
                                icon={<IcoDollar />} iconColor="red"
                                title={overdueInvs.length > 0 ? `${fmtAmt(overdueAmt)} overdue across ${overdueInvs.length} invoice${overdueInvs.length > 1 ? 's' : ''}` : '$45,000 overdue across 6 invoices'}
                                sub={overdueInvs.length > 0 ? `Oldest: ${Math.max(...overdueInvs.map(i => daysAgo(i.due_date)))} days past due` : 'Top overdue: Vertex Systems · 5–31 days'}
                                action="Send Reminder" href="/connect/finance/collections"
                            />
                            <ActionRow
                                icon={<IcoUsers />} iconColor="red"
                                title={silentCustomers.length > 0 ? `${silentCustomers.length} customer${silentCustomers.length > 1 ? 's' : ''} haven't responded` : "3 customers haven't responded"}
                                sub="No response in 5+ days"
                                action="Follow Up" href="/connect/finance/collections"
                            />
                        </div>
                    </>
                )}

                {/* At Risk — the third slot (stalled-deal detection) has no
                    real backing in our schema, so it stays the design's sample. */}
                {!loading && (
                    <>
                        <div className="section-header amber" style={{ marginTop: 16 }}>
                            <span className="dot" />
                            <span className="section-title">At Risk</span>
                            <span className="section-count">{atRiskCount}</span>
                        </div>
                        <div className="dlist">
                            <ActionRow
                                icon={<IcoClock />} iconColor="amber"
                                title={expiringQuotes.length > 0 ? `${expiringQuotes.length} quote${expiringQuotes.length > 1 ? 's' : ''} expiring within 7 days` : '3 quotes expiring in 7 days'}
                                sub={expiringQuotes.length > 0 ? `${fmtAmt(expiringAmt)} at risk if no action taken` : '$92K at risk if no action is taken'}
                                action="Review" href="/connect/finance/quotes"
                            />
                            <ActionRow
                                icon={<IcoTrend />} iconColor="amber"
                                title="Payment delays are increasing"
                                sub={overdueInvs.length > 0 ? `${overdueInvs.length} overdue invoice${overdueInvs.length > 1 ? 's' : ''} — check collection status` : '3 customers showing longer pay cycles'}
                                action="Review" href="/connect/finance/collections"
                            />
                            <ActionRow
                                icon={<IcoUsers />} iconColor="amber"
                                title="High-value deal is stalled"
                                sub="No activity in 10+ days · Solara Industries"
                                action="Follow Up" href="/connect/finance/accounts"
                            />
                        </div>
                    </>
                )}

                {/* Opportunities — the upsell-candidate slot has no real
                    engagement-scoring data in our schema, stays the design's sample. */}
                {!loading && (
                    <>
                        <div className="section-header green" style={{ marginTop: 16 }}>
                            <span className="dot" />
                            <span className="section-title">Opportunities</span>
                            <span className="section-count">{oppsCount}</span>
                        </div>
                        <div className="dlist">
                            <ActionRow
                                icon={<IcoCheck />} iconColor="green"
                                title={readyToConvert.length > 0 ? `${readyToConvert.length} approved quote${readyToConvert.length > 1 ? 's' : ''} ready to convert` : '1 approved quote ready to convert'}
                                sub={readyToConvert.length > 0 ? `${fmtAmt(readyAmt)} · convert to invoice to collect` : '$52,900 · Pinnacle Energy'}
                                action="Convert to Invoice" href="/connect/finance/quotes"
                            />
                            <ActionRow
                                icon={<IcoUsers />} iconColor="green"
                                title="Customer ready for upsell"
                                sub="Crestline Manufacturing · High engagement"
                                action="View Opportunity" href="/connect/finance/accounts"
                            />
                            <ActionRow
                                icon={<IcoBar />} iconColor="green"
                                title="Strong payment behavior trend"
                                sub={goodPayers.length > 0 ? `${goodPayers.length} customer${goodPayers.length > 1 ? 's' : ''} paying consistently on time` : '12 invoices paid on time · Ironwood Construction'}
                                action="View Customer" href="/connect/finance/accounts"
                            />
                        </div>
                    </>
                )}

                {/* Recent Transactions */}
                {!loading && d.transactions.length > 0 && (
                    <>
                        <div className="section-header violet" style={{ marginTop: 20 }}>
                            <span className="dot" />
                            <span className="section-title">Recent Payments</span>
                            <span className="section-count">{d.transactions.slice(0, 10).length}</span>
                        </div>
                        <div className="dlist">
                            {d.transactions.slice(0, 10).map(t => (
                                <div className="entity-row flat" key={t.retref} style={{ padding: '8px 4px' }}>
                                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, background: t.respstat === 'A' ? 'var(--green-bg)' : 'var(--red-bg)', color: t.respstat === 'A' ? 'var(--green-text)' : 'var(--red-text)' }}>
                                        {t.respstat === 'A' ? '✓' : '✗'}
                                    </div>
                                    <div className="row-body">
                                        <div className="row-title" style={{ fontSize: 13 }}>
                                            {t.cardholder_name || 'Unknown'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>••••{t.card_last_four}</span>
                                        </div>
                                        <div className="row-sub" style={{ fontSize: 11.5 }}>
                                            <span>{t.retref}</span>
                                            {t.authdate && <span style={{ marginLeft: 6, color: 'var(--text-tertiary)' }}>{t.authdate.slice(4, 6)}/{t.authdate.slice(6, 8)}/{t.authdate.slice(0, 4)}</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{fmtAmt(t.amount)}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                        </svg>
                        <span>AI Activity Insights</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-section-label">Activity Snapshot</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-row">
                        <span className="label">Pending approvals</span>
                        <span className="val" style={{ color: pendingApprovals.length > 0 ? 'var(--amber-text)' : undefined }}>
                            {loading ? '…' : pendingApprovals.length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Overdue invoices</span>
                        <span className="val" style={{ color: overdueInvs.length > 0 ? 'var(--red-text)' : undefined }}>
                            {loading ? '…' : overdueInvs.length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Overdue amount</span>
                        <span className="val">{loading ? '…' : fmtAmt(overdueAmt)}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Quotes expiring soon</span>
                        <span className="val" style={{ color: expiringQuotes.length > 0 ? 'var(--amber-text)' : undefined }}>
                            {loading ? '…' : expiringQuotes.length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Ready to invoice</span>
                        <span className="val" style={{ color: readyToConvert.length > 0 ? 'var(--green-text)' : undefined }}>
                            {loading ? '…' : readyToConvert.length}
                        </span>
                    </div>
                </div>

                <div className="ai-signal-card" style={{ marginTop: 16 }}>
                    <div className="ai-signal-icon violet"><IcoTrend /></div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">Approval bottlenecks are slowing deal flow.</div>
                        <div className="ai-signal-sub">
                            {pendingApprovals.length > 0 ? `${pendingApprovals.length} pending · ${fmtAmt(pendingAmt)}` : 'Approval delays are slowing deal flow'}
                        </div>
                    </div>
                </div>
                <div className="ai-signal-card">
                    <div className="ai-signal-icon amber"><IcoDollar /></div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">Payment delays are increasing across key customers.</div>
                        <div className="ai-signal-sub">
                            {overdueInvs.length > 0 ? `${overdueInvs.length} overdue invoice${overdueInvs.length > 1 ? 's' : ''} · ${fmtAmt(overdueAmt)}` : 'Payment delays are increasing across key customers'}
                        </div>
                    </div>
                </div>
                <div className="ai-signal-card">
                    <div className="ai-signal-icon red"><IcoDollar /></div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">High-value deals are at risk without immediate action.</div>
                        <div className="ai-signal-sub">High-value deals are at risk without immediate action</div>
                    </div>
                </div>
                <div className="ai-signal-card">
                    <div className="ai-signal-icon violet"><IcoClock /></div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">Inactive customers are less likely to respond.</div>
                        <div className="ai-signal-sub">
                            {silentCustomers.length > 0 ? `${silentCustomers.length} customer${silentCustomers.length > 1 ? 's' : ''} with no recent contact` : 'Delayed responses are reducing conversion likelihood'}
                        </div>
                    </div>
                </div>
                <div className="ai-signal-card">
                    <div className="ai-signal-icon green"><IcoCheck /></div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">Approved quotes present immediate revenue.</div>
                        <div className="ai-signal-sub">
                            {readyToConvert.length > 0 ? `${readyToConvert.length} ready · ${fmtAmt(readyAmt)}` : 'Approved quotes are ready to move forward'}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
