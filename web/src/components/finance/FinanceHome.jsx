import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiFileText, FiCheckCircle, FiXCircle, FiPercent, FiInbox } from 'react-icons/fi';
import CreateMenu from './CreateMenu';
import DocEditor from './DocEditor';
import CreateCustomerModal from './CreateCustomerModal';
import { useRecentEvents } from '../../hooks/useRecentEvents';

const HISTORY_ICON_BY_TYPE = {
    customer_created: { Icon: FiUserPlus, color: 'violet' },
    customer_profile_imported: { Icon: FiUserPlus, color: 'violet' },
    quote_created: { Icon: FiFileText, color: 'amber' },
    payment_charged: { Icon: FiCheckCircle, color: 'green' },
    payment_declined: { Icon: FiXCircle, color: 'red' },
    commission_recorded: { Icon: FiPercent, color: 'violet' },
};

const historyTimeAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

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

const fmtFull = (n) => `$${Math.round(n || 0).toLocaleString('en-US')}`;
const daysTill = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const isOverdue = (inv) =>
    inv.due_date && new Date(inv.due_date) < new Date() &&
    !['paid', 'cancelled'].includes(inv.status);
const isOutstanding = (inv) => !['paid', 'cancelled'].includes(inv.status);
const openAmount = (inv) => parseFloat(inv.amount_due ?? (parseFloat(inv.total || 0) - parseFloat(inv.amount_paid || 0))) || 0;

function TrendIcon({ size = 12 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    );
}

function AlertCircleIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

function ClockSignalIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function SparkleIcon({ size = 16, fill = 'var(--primary)' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill={fill} />
            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill={fill} />
        </svg>
    );
}

function nowTime() {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
}

function AIBulletCard({ items }) {
    return (
        <div className="aiconv-card-wrap">
            <div className="aiconv-bullets">
                {items.map((it, i) => (
                    <div key={i} className="aiconv-bullet">
                        <div className={`aiconv-bullet-dot ${it.tone || 'violet'}`} />
                        <div>
                            <span className="aiconv-bullet-title">{it.text}</span>
                            {it.sub && <span className="aiconv-bullet-sub"> — {it.sub}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const has = (query, ...keywords) => keywords.some(k => query.toLowerCase().includes(k.toLowerCase()));

// Scripted demo responses (matches the OmniPay POS design reference's
// homeResponder) — placeholder until a real AI assistant is wired up.
function homeResponder(query, navigate) {
    if (has(query, 'attention', 'today', 'priority', 'first')) {
        return {
            text: "Here are today's highest-priority items. I'd start with the two pending approvals — they unlock $70.7K in pipeline.",
            card: <AIBulletCard items={[
                { tone: 'red', text: '6 quotes awaiting approval', sub: '$187K across 4 customers' },
                { tone: 'red', text: '$45,000 overdue across 6 invoices', sub: 'Vertex, Meridian, BluePeak' },
                { tone: 'amber', text: '3 customers with no response 5+ days', sub: 'Follow-up recommended' },
                { tone: 'green', text: '1 approved quote ready to convert', sub: '$52,900 · Pinnacle Energy' },
            ]} />,
            actions: [
                { label: 'Review approvals', onClick: () => navigate('/connect/finance/approvals') },
                { label: 'View receivables', onClick: () => navigate('/connect/finance/receivables') },
            ],
            followUps: ['Show urgent approvals', 'Show overdue invoices', 'What should I do first?', "Summarize today's risk"],
        };
    }
    if (has(query, 'urgent approval', 'show urgent')) {
        return {
            text: 'Two approvals are time-sensitive. Vertex Systems is on extended payment terms, and Pacific Corp is above the standard discount threshold.',
            card: <AIBulletCard items={[
                { tone: 'red', text: 'Q-2846 · Vertex Systems · $42,500', sub: 'Net 60 terms, 18% discount' },
                { tone: 'amber', text: 'Q-2842 · Pacific Corp · $28,200', sub: 'Discount above 15% threshold' },
            ]} />,
            actions: [{ label: 'Open Approvals', onClick: () => navigate('/connect/finance/approvals') }],
            followUps: ['Open approval queue', 'Who can approve high-value?', "Summarize today's risk"],
        };
    }
    if (has(query, 'overdue', 'show overdue')) {
        return {
            text: '$45,000 is overdue across 6 invoices. Vertex Systems and Meridian Industrial together account for 70% of that exposure.',
            card: <AIBulletCard items={[
                { tone: 'red', text: 'Vertex Systems · $18,245', sub: '3 invoices, oldest 21 days late' },
                { tone: 'red', text: 'Meridian Industrial · $12,450', sub: 'INV-1199 · 14 days past due' },
                { tone: 'amber', text: 'BluePeak Logistics · $3,700', sub: '21 days since last payment' },
            ]} />,
            actions: [{ label: 'Open Receivables', onClick: () => navigate('/connect/finance/receivables') }],
            followUps: ['Send reminders', 'Show high-risk accounts', 'Sort by oldest overdue'],
        };
    }
    if (has(query, 'risk', 'summarize')) {
        return {
            text: "Today's risk is concentrated in two areas: approval bottlenecks and overdue receivables from a small number of customers.",
            card: <AIBulletCard items={[
                { tone: 'red', text: 'Approval bottleneck', sub: '6 quotes awaiting approval — avg wait 2.1 days' },
                { tone: 'red', text: 'Concentrated overdue risk', sub: '70% of overdue $ from 2 accounts' },
                { tone: 'amber', text: 'Engagement dip', sub: '3 accounts no response in 5+ days' },
            ]} />,
            followUps: ['Show approval bottlenecks', 'Show high-risk accounts', 'What action should I take first?'],
        };
    }
    return {
        text: 'I can summarize what needs attention today, walk through overdue invoices, or surface urgent approvals. Try one of the suggestions below.',
        followUps: ['What needs my attention today?', 'Show overdue invoices', "Summarize today's risk"],
    };
}

function OperationalHistoryTab() {
    const navigate = useNavigate();
    const { events, loading } = useRecentEvents(30);

    return (
        <div className="summary_body">
            <div className="card" style={{ padding: 0, marginTop: 12, overflow: 'hidden' }}>
                {loading && (
                    <div style={{ padding: '20px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                )}
                {!loading && events.length === 0 && (
                    <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        <FiInbox size={18} style={{ margin: '0 auto 8px', opacity: 0.5, display: 'block' }} />
                        No activity yet — actions across quotes, invoices, and customers will show up here.
                    </div>
                )}
                {!loading && events.map((e, i) => {
                    const { Icon, color } = HISTORY_ICON_BY_TYPE[e.type] || { Icon: FiInbox, color: 'violet' };
                    return (
                        <button
                            key={e.id}
                            type="button"
                            onClick={() => navigate(e.href)}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                                padding: '14px 18px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer',
                                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                            }}
                            onMouseEnter={e2 => e2.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}
                        >
                            <span style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `var(--${color}-bg)`, color: `var(--${color}-text)`,
                            }}>
                                <Icon size={15} />
                            </span>
                            <span style={{ flex: '1 1 0%', minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{e.title}</span>
                                {e.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{e.sub}</span>}
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', flexShrink: 0, paddingTop: 2 }}>{historyTimeAgo(e.at)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    if (h < 22) return 'Good evening';
    return 'Good night';
}

export default function FinanceHome() {
    const user = useSelector(s => s.message.user);
    const navigate = useNavigate();
    const [createFlow, setCreateFlow] = useState(null); // 'invoice' | 'quote' | 'customer' | null
    const [tabState, setTabState] = useState(1);
    const [messages, setMessages] = useState([]);
    const [followUps, setFollowUps] = useState([]);
    const [followUpText, setFollowUpText] = useState('');
    const chipConv = messages.length > 0;
    const aiconvScrollRef = useRef(null);

    const scrollConvToBottom = () => {
        requestAnimationFrame(() => {
            const el = aiconvScrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        });
    };

    const ask = (query) => {
        const q = typeof query === 'string' ? query : (query?.title || '');
        if (!q.trim()) return;
        const r = homeResponder(q, navigate);
        setMessages(prev => [
            ...prev,
            { role: 'user', text: q, time: nowTime() },
            { role: 'ai', text: r.text, card: r.card, actions: r.actions, time: nowTime() },
        ]);
        setFollowUps(r.followUps || []);
        setFollowUpText('');
        scrollConvToBottom();
    };
    const closeConv = () => { setMessages([]); setFollowUps([]); setFollowUpText(''); };
    const [query, setQuery] = useState('');

    const [gateway, setGateway] = useState(null);
    const [txnSummary, setTxnSummary] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [txns, setTxns] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [invoices, setInvoices] = useState([]);
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
            fetch(`${BASE}/v1/finance/invoices`, { headers: authH(), credentials: 'include' }).then(r => r.json()).catch(() => null),
        ]).then(([gw, txnSum, custs, qs, txnList, approvs, invs]) => {
            if (gw?.status) setGateway(gw.data);
            if (txnSum?.status) setTxnSummary(txnSum.data);
            if (custs?.status) setCustomers(custs.data || []);
            if (qs?.status) setQuotes(qs.data || []);
            if (txnList?.status) setTxns(txnList.data || []);
            if (approvs?.status) setApprovals(approvs.data || []);
            if (invs?.status) setInvoices(invs.data || []);
        }).finally(() => setLoading(false));
    }, []);

    const approvedTxns = txns.filter(t => t.respstat === 'A');
    const totalCollected = approvedTxns.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    const pendingQuotes = quotes.filter(q => q.status === 'pending_approval' || q.status === 'sent' || q.status === 'draft');
    const txnCount = txnSummary?.txncount || txnSummary?.txnCnt || null;
    const txnTotal = txnSummary?.totalamt || txnSummary?.totalAmt || null;

    // ── Design-parity computations (Summary tab / "What Needs Attention" aside) ──
    const hasInvoices = invoices.length > 0;
    const now = new Date();
    const todayStr = now.toDateString();

    const outstandingInvoices = invoices.filter(isOutstanding);
    const outstandingAmt = outstandingInvoices.reduce((s, i) => s + openAmount(i), 0);
    const overdueInvoices = outstandingInvoices.filter(isOverdue);
    const overdueAmt = overdueInvoices.reduce((s, i) => s + openAmount(i), 0);
    const overdueCustomerCount = new Set(overdueInvoices.map(i => String(i.customer_id))).size;

    const collectedThisMonth = invoices
        .filter(i => i.paid_date && new Date(i.paid_date).getMonth() === now.getMonth() && new Date(i.paid_date).getFullYear() === now.getFullYear())
        .reduce((s, i) => s + (parseFloat(i.amount_paid) || parseFloat(i.total) || 0), 0);

    const pipelineQuotes = quotes.filter(q => ['draft', 'sent', 'pending_approval', 'approved'].includes(q.status));
    const pipelineTotal = pipelineQuotes.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    const totalInvoicedAll = invoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const paidAmtAll = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const overdueAmtAll = invoices.filter(isOverdue).reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const pendingAmtAll = Math.max(totalInvoicedAll - paidAmtAll - overdueAmtAll, 0);
    const pctOf = (amt) => totalInvoicedAll > 0 ? Math.round((amt / totalInvoicedAll) * 100) : 0;
    const invoiceStatusPct = hasInvoices
        ? { paid: pctOf(paidAmtAll), pending: pctOf(pendingAmtAll), overdue: pctOf(overdueAmtAll) }
        : { paid: 62, pending: 24, overdue: 14 };

    const outstandingByCustomer = {};
    outstandingInvoices.forEach(i => {
        const key = String(i.customer_id);
        if (!outstandingByCustomer[key]) outstandingByCustomer[key] = { name: i.customer_name, amt: 0, overdue: false, minDays: Infinity };
        outstandingByCustomer[key].amt += openAmount(i);
        if (isOverdue(i)) outstandingByCustomer[key].overdue = true;
        const dt = i.due_date ? daysTill(i.due_date) : Infinity;
        if (dt < outstandingByCustomer[key].minDays) outstandingByCustomer[key].minDays = dt;
    });
    const topOutstanding = Object.values(outstandingByCustomer).sort((a, b) => b.amt - a.amt).slice(0, 4);

    const decidedApprovals = approvals.filter(a => a.status === 'approved' && a.decided_at);
    const avgApprovalDays = decidedApprovals.length
        ? decidedApprovals.reduce((s, a) => s + ((new Date(a.decided_at) - new Date(a.createdAt || a.submitted_at)) / 86400000), 0) / decidedApprovals.length
        : null;

    const quotesThisMonth = quotes.filter(q => {
        const d = new Date(q.created_at || q.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const quotesThisMonthTotal = quotesThisMonth.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    const collectedAll = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.amount_paid) || parseFloat(i.total) || 0), 0);
    const collectionRate = totalInvoicedAll > 0 ? Math.round((collectedAll / totalInvoicedAll) * 100) : null;

    const invoicesSentToday = invoices.filter(i => i.issued_date && new Date(i.issued_date).toDateString() === todayStr);
    const invoicesSentTodayAmt = invoicesSentToday.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const paymentsToday = approvedTxns.filter(t => t.authdate && `${t.authdate.slice(0, 4)}-${t.authdate.slice(4, 6)}-${t.authdate.slice(6, 8)}` === now.toISOString().slice(0, 10));
    const paymentsTodayAmt = paymentsToday.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const quotesToday = quotes.filter(q => new Date(q.created_at || q.createdAt).toDateString() === todayStr);
    const quotesTodayAmt = quotesToday.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    // Action Required — real qualifying items only; fall back to the design's
    // placeholder set when nothing in any collection qualifies (no data yet).
    const worstOverdueInvoice = overdueInvoices.slice().sort((a, b) => daysTill(a.due_date) - daysTill(b.due_date))[0];
    const expiringQuotes = quotes
        .filter(q => ['sent', 'pending_approval', 'approved'].includes(q.status) && q.valid_until && daysTill(q.valid_until) >= 0 && daysTill(q.valid_until) <= 3)
        .sort((a, b) => daysTill(a.valid_until) - daysTill(b.valid_until));
    const dueTomorrowInvoices = outstandingInvoices.filter(i => !isOverdue(i) && i.due_date && daysTill(i.due_date) === 1);
    const hasRealActionItems = pendingApprovals.length > 0 || !!worstOverdueInvoice || expiringQuotes.length > 0 || dueTomorrowInvoices.length > 0;

    return (
        <>
            <main className="page-main">
                <div className="page-actions">
                    <CreateMenu onPick={setCreateFlow} />
                </div>

                <div className="hero">
                    <div className="hero-icon"><SparkleIcon size={22} /></div>
                    <h1 className="hero-title">{greeting()}, {user?.firstname || 'there'}</h1>
                    <p className="hero-sub">What can I help you with today?</p>
                </div>

                <div className="aibar">
                    <form onSubmit={(e) => { e.preventDefault(); ask(query); }}>
                        <div className="cmd-input">
                            <SparkleIcon size={16} />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask anything about your business..."
                            />
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
                                { title: 'Show overdue invoices', cat: 'Receivables' },
                                { title: 'Show urgent approvals', cat: 'Approvals' },
                                { title: "Summarize today's risk", cat: 'AI Summary' },
                            ].map(chip => (
                                <div className="chip" key={chip.title} onClick={() => ask(chip.title)}>
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
                                    <span>AI Conversation</span>
                                </div>
                                <button className="aiconv-close" onClick={closeConv} title="Close conversation">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <div className="aiconv-scroll" ref={aiconvScrollRef}>
                                {messages.map((m, i) => m.role === 'user' ? (
                                    <div key={i} className="aiconv-msg aiconv-msg-user">
                                        <div className="aiconv-bubble-wrap aiconv-bubble-wrap-user">
                                            <div className="aiconv-meta aiconv-meta-user">
                                                <span className="aiconv-meta-name">You</span>
                                                <span className="aiconv-meta-dot">·</span>
                                                <span className="aiconv-meta-time">{m.time}</span>
                                            </div>
                                            <div className="aiconv-bubble-user">{m.text}</div>
                                        </div>
                                        <div className="aiconv-avatar aiconv-avatar-user">
                                            {(user?.firstname?.charAt(0) || '') + (user?.lastname?.charAt(0) || '') || 'U'}
                                        </div>
                                    </div>
                                ) : (
                                    <div key={i} className="aiconv-msg aiconv-msg-ai">
                                        <div className="aiconv-avatar aiconv-avatar-ai"><SparkleIcon size={14} fill="white" /></div>
                                        <div className="aiconv-bubble-wrap">
                                            <div className="aiconv-meta">
                                                <span className="aiconv-meta-name">AI Assistant</span>
                                                <span className="aiconv-meta-dot">·</span>
                                                <span className="aiconv-meta-time">{m.time}</span>
                                            </div>
                                            <div className="aiconv-text">{m.text}</div>
                                            {m.card}
                                            {m.actions && m.actions.length > 0 && (
                                                <div className="aiconv-actions">
                                                    {m.actions.map((a, ai) => (
                                                        <button key={ai} className={`btn ${ai === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={a.onClick}>
                                                            {a.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="aiconv-feedback">
                                                <button title="Helpful">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                                    </svg>
                                                </button>
                                                <button title="Not helpful">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                                                    </svg>
                                                </button>
                                                <button title="Copy">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {followUps.length > 0 && (
                                <div className="aiconv-followups">
                                    {followUps.map((f, i) => (
                                        <button key={i} className="aiconv-followup" onClick={() => ask(f)}>
                                            <span className="aiconv-followup-icon"><SparkleIcon size={12} /></span>
                                            <span>{f}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="aiconv-input-wrap">
                                <form onSubmit={(e) => { e.preventDefault(); ask(followUpText); }} className="cmd-input aiconv-input">
                                    <SparkleIcon size={14} />
                                    <input
                                        value={followUpText}
                                        onChange={(e) => setFollowUpText(e.target.value)}
                                        placeholder="Ask a follow-up..."
                                    />
                                    <button type="submit" className="cmd-input-btn">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="19" x2="12" y2="5" />
                                            <polyline points="5 12 12 5 19 12" />
                                        </svg>
                                    </button>
                                </form>
                                <div className="aiconv-disclaimer">
                                    AI responses may include insights from across your data. Verify important decisions.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="tabs">
                    <div onClick={() => setTabState(1)} className={`tab ${tabState === 1 ? 'active' : ''}`}>Summary</div>
                    <div onClick={() => setTabState(2)} className={`tab ${tabState === 2 ? 'active' : ''}`}>Operational History</div>
                    <div onClick={() => setTabState(3)} className={`tab ${tabState === 3 ? 'active' : ''}`}>Gateway</div>
                </div>

                {tabState === 1 && (
                    <div className="summary_body">
                        {/* KPI row — Pipeline / Outstanding / Collected / Overdue */}
                        <div className="kpi-grid">
                            <div className="kpi">
                                <div className="kpi-label">Pipeline</div>
                                <div className="kpi-value">{loading ? '…' : fmt(pipelineQuotes.length > 0 ? pipelineTotal : 145000)}</div>
                                <div className="kpi-trend green"><TrendIcon /> {pipelineQuotes.length > 0 ? `${pipelineQuotes.length} open quote${pipelineQuotes.length === 1 ? '' : 's'}` : '↑ 12% from last week'}</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Outstanding</div>
                                <div className="kpi-value">{loading ? '…' : fmtFull(hasInvoices ? outstandingAmt : 84250)}</div>
                                <div className="kpi-trend red"><TrendIcon /> {hasInvoices ? `${outstandingInvoices.length} open invoice${outstandingInvoices.length === 1 ? '' : 's'}` : 'Rising risk'}</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Collected MTD</div>
                                <div className="kpi-value">{loading ? '…' : fmtFull(hasInvoices ? collectedThisMonth : 48700)}</div>
                                <div className="kpi-trend green"><TrendIcon /> On track</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Overdue</div>
                                <div className="kpi-value">{loading ? '…' : fmtFull(hasInvoices ? overdueAmt : 18245)}</div>
                                <div className="kpi-trend red"><TrendIcon /> {hasInvoices ? `${overdueCustomerCount} account${overdueCustomerCount === 1 ? '' : 's'}` : '3 accounts'}</div>
                            </div>
                        </div>

                        {/* Receivables trend + invoice status breakdown */}
                        <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="card">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>Receivables Trend</div>
                                        <div className="text-meta">7-week rolling view</div>
                                    </div>
                                    <span className="badge green">+18%</span>
                                </div>
                                <svg viewBox="0 0 320 110" style={{ width: '100%', height: 120 }}>
                                    <polyline points="8,57.3 58.7,63.5 109.3,52.4 160,59.8 210.7,47.5 261.3,54.9 312,42.5" fill="none" stroke="var(--primary)" strokeWidth="2" />
                                    <text x="2" y="14" fontSize="10" fill="#9CA3AF">100</text>
                                    <text x="2" y="56" fontSize="10" fill="#9CA3AF">50</text>
                                    <text x="2" y="98" fontSize="10" fill="#9CA3AF">0</text>
                                    {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'].map((w, i) => (
                                        <text key={w} x={8 + i * 50.67} y="108" fontSize="10" fill="#9CA3AF" textAnchor="middle">{w}</text>
                                    ))}
                                </svg>
                            </div>
                            <div className="card">
                                <div className="mb-4">
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>Invoice Status</div>
                                    <div className="text-meta">Current period breakdown</div>
                                </div>
                                {[
                                    { label: 'Paid', pct: invoiceStatusPct.paid, color: 'var(--green)' },
                                    { label: 'Pending', pct: invoiceStatusPct.pending, color: 'var(--violet)' },
                                    { label: 'Overdue', pct: invoiceStatusPct.overdue, color: 'var(--red)' },
                                ].map(row => (
                                    <div key={row.label} style={{ marginBottom: 12 }}>
                                        <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 6 }}>
                                            <span>{row.label}</span>
                                            <span>{row.pct}%</span>
                                        </div>
                                        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${row.pct}%`, background: row.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pipeline movement */}
                        <div className="card mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>Pipeline Movement</div>
                                    <div className="text-meta">Deal volume over 7 weeks</div>
                                </div>
                                <div style={{ color: 'var(--green-text)', fontSize: 13, fontWeight: 500 }}>Steady growth</div>
                            </div>
                            <svg viewBox="0 0 760 120" style={{ width: '100%', height: 130 }}>
                                <polyline points="8,83.6 132,75.2 256,66.8 380,58.4 504,45 628,28.2 752,11.4" fill="none" stroke="var(--green)" strokeWidth="2" />
                                <text x="2" y="14" fontSize="10" fill="#9CA3AF">160</text>
                                <text x="2" y="56" fontSize="10" fill="#9CA3AF">135</text>
                                <text x="2" y="98" fontSize="10" fill="#9CA3AF">115</text>
                                {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'].map((w, i) => (
                                    <text key={w} x={8 + i * 124} y="118" fontSize="10" fill="#9CA3AF" textAnchor="middle">{w}</text>
                                ))}
                            </svg>
                        </div>

                        {/* Top outstanding accounts */}
                        <div className="section-header red" style={{ marginTop: 24 }}>
                            <span className="dot" />
                            <span className="section-title">Top Outstanding Accounts</span>
                        </div>
                        <div className="dlist">
                            {(topOutstanding.length > 0 ? topOutstanding : [
                                { name: 'Vertex Systems', amt: 34500, overdue: true, minDays: -5 },
                                { name: 'Pinnacle Energy', amt: 52900, overdue: false, minDays: 20 },
                                { name: 'Crestline Manufacturing', amt: 28400, overdue: false, minDays: 20 },
                                { name: 'Ironwood Construction', amt: 18200, overdue: false, minDays: 5 },
                            ]).map((acc, i) => {
                                const initials = (acc.name || '?').charAt(0).toUpperCase();
                                const badge = acc.overdue ? { text: 'Overdue', cls: 'red' } : (acc.minDays <= 7 ? { text: 'Due soon', cls: 'amber' } : { text: 'Pending', cls: 'violet' });
                                const avatarColors = ['#1F2937', '#10B981', '#8B5CF6', '#06B6D4'];
                                return (
                                    <div key={acc.name + i} className="entity-row flat">
                                        <div className="avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{initials}</div>
                                        <div className="row-body">
                                            <div className="row-title">{acc.name}</div>
                                        </div>
                                        <span className={`badge ${badge.cls}`}>{badge.text}</span>
                                        <div><div className="row-amount">{fmtFull(acc.amt)}</div></div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Approval time / quotes / collection rate */}
                        <div className="kpi-grid kpi-grid-3 mt-6">
                            <div className="kpi">
                                <div className="kpi-label">Avg Approval Time</div>
                                <div className="kpi-value">{avgApprovalDays != null ? `${avgApprovalDays.toFixed(1)} days` : '1.8 days'}</div>
                                <div className="kpi-trend green"><TrendIcon /> ↓ Down from 2.4 days</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Quotes This Month</div>
                                <div className="kpi-value">{quotes.length > 0 ? quotesThisMonth.length : 14}</div>
                                <div className="kpi-trend gray">{quotes.length > 0 ? fmtFull(quotesThisMonthTotal) : '$284K'} total value</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Collection Rate</div>
                                <div className="kpi-value">{hasInvoices && collectionRate != null ? `${collectionRate}%` : '78%'}</div>
                                <div className="kpi-trend green"><TrendIcon /> ↑ Up 6% this week</div>
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

                {tabState === 2 && <OperationalHistoryTab />}

                {tabState === 3 && (
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
                        <span>What Needs Attention</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-section-label">Action Required</div>
                {loading ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '12px 16px' }}>Loading…</div>
                ) : hasRealActionItems ? (
                    <div className="ai-list">
                        {pendingApprovals.length > 0 && (
                            <div className="ai-list-item red">
                                <div className="dot" />
                                <div>
                                    <div className="ai-list-item-title">{pendingApprovals.length} pending approval{pendingApprovals.length === 1 ? '' : 's'}</div>
                                    <div className="ai-list-item-sub">
                                        {[...new Set(pendingApprovals.map(a => a.customer_name))].slice(0, 2).join(', ')} · {fmt(pendingApprovals.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {worstOverdueInvoice && (
                            <div className="ai-list-item red">
                                <div className="dot" />
                                <div>
                                    <div className="ai-list-item-title">Overdue invoice</div>
                                    <div className="ai-list-item-sub">{worstOverdueInvoice.customer_name} · {Math.abs(daysTill(worstOverdueInvoice.due_date))} days · {fmt(openAmount(worstOverdueInvoice))}</div>
                                </div>
                            </div>
                        )}
                        {expiringQuotes.length > 0 && (
                            <div className="ai-list-item red">
                                <div className="dot" />
                                <div>
                                    <div className="ai-list-item-title">Quote expiring in {daysTill(expiringQuotes[0].valid_until)} day{daysTill(expiringQuotes[0].valid_until) === 1 ? '' : 's'}</div>
                                    <div className="ai-list-item-sub">{expiringQuotes[0].customer_name} · {fmt(expiringQuotes[0].total)}</div>
                                </div>
                            </div>
                        )}
                        {dueTomorrowInvoices.length > 0 && (
                            <div className="ai-list-item amber">
                                <div className="dot" />
                                <div>
                                    <div className="ai-list-item-title">Payment due tomorrow</div>
                                    <div className="ai-list-item-sub">{dueTomorrowInvoices[0].customer_name} · {fmt(openAmount(dueTomorrowInvoices[0]))}</div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="ai-list">
                        <div className="ai-list-item red"><div className="dot" /><div>
                            <div className="ai-list-item-title">2 pending approvals</div>
                            <div className="ai-list-item-sub">Vertex Systems, Pacific Corp · $70,700</div>
                        </div></div>
                        <div className="ai-list-item red"><div className="dot" /><div>
                            <div className="ai-list-item-title">Overdue invoice</div>
                            <div className="ai-list-item-sub">Meridian Industrial · 12 days · $34,500</div>
                        </div></div>
                        <div className="ai-list-item red"><div className="dot" /><div>
                            <div className="ai-list-item-title">Quote expiring in 3 days</div>
                            <div className="ai-list-item-sub">TechCore Industries · $18,200</div>
                        </div></div>
                        <div className="ai-list-item amber"><div className="dot" /><div>
                            <div className="ai-list-item-title">Payment due tomorrow</div>
                            <div className="ai-list-item-sub">Nova Manufacturing · $12,400</div>
                        </div></div>
                        <div className="ai-list-item violet"><div className="dot" /><div>
                            <div className="ai-list-item-title">Contract renewal</div>
                            <div className="ai-list-item-sub">Cascade Solutions · Expires Apr 25</div>
                        </div></div>
                    </div>
                )}

                <div className="ai-section-label" style={{ marginTop: 16 }}>Quick Signals</div>
                <div>
                    <div className="ai-signal-card">
                        <div className={`ai-signal-icon ${overdueInvoices.length > 0 ? 'red' : 'green'}`}><AlertCircleIcon /></div>
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-signal-title">{overdueInvoices.length} overdue invoice{overdueInvoices.length === 1 ? '' : 's'}</div>
                            <div className="ai-signal-sub">{fmt(overdueAmt)} at risk</div>
                        </div>
                    </div>
                    <div className="ai-signal-card">
                        <div className={`ai-signal-icon ${pendingApprovals.length > 0 ? 'amber' : 'green'}`}><ClockSignalIcon /></div>
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-signal-title">{pendingApprovals.length} approval{pendingApprovals.length === 1 ? '' : 's'} pending</div>
                            <div className="ai-signal-sub">Action needed today</div>
                        </div>
                    </div>
                    <div className="ai-signal-card">
                        <div className="ai-signal-icon green"><TrendIcon size={16} /></div>
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="ai-signal-title">{fmt(pipelineTotal)} in pipeline</div>
                            <div className="ai-signal-sub">{pipelineQuotes.length} open quote{pipelineQuotes.length === 1 ? '' : 's'}</div>
                        </div>
                    </div>
                </div>

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
                        <span className="label">{invoicesSentToday.length} invoice{invoicesSentToday.length === 1 ? '' : 's'} sent</span>
                        <span className="val">{loading ? '…' : fmt(invoicesSentTodayAmt)}</span>
                    </div>
                    <div className="ai-snapshot-row" style={{ padding: '8px 0' }}>
                        <span className="label">{paymentsToday.length} payment{paymentsToday.length === 1 ? '' : 's'} received</span>
                        <span className="val">{loading ? '…' : fmt(paymentsTodayAmt)}</span>
                    </div>
                    <div className="ai-snapshot-row" style={{ padding: '8px 0' }}>
                        <span className="label">{quotesToday.length} quote{quotesToday.length === 1 ? '' : 's'} created</span>
                        <span className="val">{loading ? '…' : fmt(quotesTodayAmt)}</span>
                    </div>
                </div>
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
                    onCreated={() => navigate('/connect/finance/accounts')}
                />
            )}
        </>
    );
}
