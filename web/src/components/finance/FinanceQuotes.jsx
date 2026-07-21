import { useState, useEffect } from 'react';
import QuoteDetailModal from './QuoteDetailModal';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function useQuotes() {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`${BASE}/v1/finance/quotes`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setQuotes(j.data || []); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);
    return { quotes, loading, setQuotes };
}

function useCustomers() {
    const [customers, setCustomers] = useState([]);
    useEffect(() => {
        fetch(`${BASE}/v1/finance/customers`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setCustomers(j.data || []); })
            .catch(() => {});
    }, []);
    return customers;
}

const SparkleIcon = ({ size = 16, fill = 'var(--primary)' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill={fill} />
        <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill={fill} />
    </svg>
)

const FileIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
    </svg>
)

const ClockIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
)

const FILTERS = ['All', 'Draft', 'Sent', 'Pending Approval', 'Approved', 'Rejected']
const FILTER_STATUS = { 'All': null, 'Draft': 'draft', 'Sent': 'sent', 'Pending Approval': 'pending_approval', 'Approved': 'approved', 'Rejected': 'rejected' }

const PROMPT_CHIPS = [
    {
        title: 'Which quotes are at risk?',
        cat: 'Risk',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        title: 'Show pending approvals',
        cat: 'Approvals',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ),
    },
    {
        title: 'Show margin risk',
        cat: 'Pricing',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
            </svg>
        ),
    },
    {
        title: 'Which quote should I handle first?',
        cat: 'AI Summary',
        icon: <SparkleIcon fill="currentColor" />,
    },
]


const styles = {
    searchInputWrap: { flex: '1 1 0%', padding: '8px 14px', boxShadow: 'none' },
    searchInput: { fontSize: '13px' },
    filterGroup: { background: 'var(--bg-subtle)', borderRadius: '8px', padding: '3px' },
    filterActive: { padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', background: 'white', color: 'var(--text-primary)', fontWeight: 500, boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px' },
    filterIdle: { padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', background: 'transparent', color: 'var(--text-tertiary)', fontWeight: 400, boxShadow: 'none' },
    row: { padding: '16px 18px' },
    avatar: { background: 'var(--primary-tint)', color: 'var(--primary)' },
    rowMain: { flex: '1 1 0%', minWidth: '0px' },
    meta12: { fontSize: '12px' },
    rowSub: { fontSize: '13px', marginTop: '2px' },
    bold: { fontWeight: 600 },
    noteText: { fontSize: '12.5px' },
    viewLink: { color: 'var(--primary)', fontSize: '13px', cursor: 'pointer' },
}

const STATUS_BADGE = { draft: 'gray', sent: 'violet', pending_approval: 'amber', approved: 'green', rejected: 'red', expired: 'red', converted: 'green' };

export default function FinanceQuotes() {
    const { quotes, loading, setQuotes } = useQuotes();
    const customers = useCustomers();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ customer_id: '', total: '', notes: '', test_mode: false });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [chargeResult, setChargeResult] = useState(null);
    const [viewQuoteId, setViewQuoteId] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [search, setSearch] = useState('');

    const filteredQuotes = quotes
        .filter(q => activeFilter === 'All' || q.status === FILTER_STATUS[activeFilter])
        .filter(q => {
            const term = search.trim().toLowerCase();
            if (!term) return true;
            return (q.quote_number || '').toLowerCase().includes(term) || (q.customer_name || '').toLowerCase().includes(term);
        });

    // ── AI Insights aside — real signals, falling back to the design's
    // mock content per-item when nothing real qualifies yet. ──
    const now = new Date();
    const pendingQuotes = quotes.filter(q => q.status === 'pending_approval');
    const stuckQuote = pendingQuotes.slice().sort((a, b) => new Date(a.createdAt || a.created_at) - new Date(b.createdAt || b.created_at))[0];
    const daysPending = stuckQuote ? Math.floor((now - new Date(stuckQuote.createdAt || stuckQuote.created_at)) / 86400000) : null;

    const likelyToConvert = quotes.filter(q => q.status === 'approved');
    const likelyToConvertTotal = likelyToConvert.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);
    const draftQuotes = quotes.filter(q => q.status === 'draft');
    const oldestDraft = draftQuotes[0];
    const fmtQ = (n) => `$${Math.round(n || 0).toLocaleString('en-US')}`;
    const fmtQK = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : fmtQ(n);
    const pipelineFromPending = pendingQuotes.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    async function createQuote(e) {
        e.preventDefault();
        if (!form.customer_id || !form.total) return;
        setSaving(true);
        setSaveError('');
        setChargeResult(null);
        try {
            const r = await fetch(`${BASE}/v1/finance/quotes`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: form.customer_id, total: parseFloat(form.total), notes: form.notes, test_mode: form.test_mode }),
            });
            const j = await r.json();
            if (j.status) {
                setQuotes(prev => [j.data, ...prev]);
                setChargeResult({ quote: j.data, transaction: j.transaction, commission: j.commission, test_mode: form.test_mode });
                setForm({ customer_id: '', total: '', notes: '', test_mode: false });
                setShowForm(false);
            } else {
                setSaveError(j.error || 'Failed to create quote');
            }
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <main className="page-main wide">
                <div className="hero">
                    <div className="hero-icon">
                        <SparkleIcon size={22} />
                    </div>
                    <h1 className="hero-title">Quotes</h1>
                    <p className="hero-sub">Create, manage, and track your quotes</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <SparkleIcon />
                            <input placeholder="Ask anything about your quotes..." defaultValue="" />
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
                        {PROMPT_CHIPS.map((chip) => (
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

                <div className="flex flex-wrap items-center gap-3 mt-4 mb-4">
                    <div className="cmd-input" style={{ ...styles.searchInputWrap, minWidth: 160 }}>
                        <SparkleIcon size={12} fill="var(--text-meta)" />
                        <input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
                    </div>
                    <div className="flex flex-wrap gap-1" style={styles.filterGroup}>
                        {FILTERS.map((filter) => (
                            <div
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                style={filter === activeFilter ? styles.filterActive : styles.filterIdle}
                            >
                                {filter}
                            </div>
                        ))}
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => setShowForm(s => !s)}
                    >
                        {showForm ? 'Cancel' : '+ New Quote'}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={createQuote} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 220px' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Customer *</div>
                            <select
                                className="cmd-input"
                                style={{ padding: '7px 10px', fontSize: 13, width: '100%' }}
                                value={form.customer_id}
                                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                                required
                            >
                                <option value="" disabled>Select a customer…</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id} disabled={!c.cardpointe_profile_id}>
                                        {c.name}{!c.cardpointe_profile_id ? ' — no card on file' : ''}
                                    </option>
                                ))}
                            </select>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                                Only customers with a stored card can be charged — add one in Accounts first.
                            </div>
                        </div>
                        <div style={{ flex: '0 1 120px' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total ($) *</div>
                            <input
                                className="cmd-input"
                                style={{ padding: '7px 10px', fontSize: 13, width: '100%' }}
                                placeholder="e.g. 12500"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.total}
                                onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 160px' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Notes</div>
                            <input
                                className="cmd-input"
                                style={{ padding: '7px 10px', fontSize: 13, width: '100%' }}
                                placeholder="Optional"
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                            <input
                                type="checkbox"
                                checked={form.test_mode}
                                onChange={e => setForm(f => ({ ...f, test_mode: e.target.checked }))}
                            />
                            Test mode — skip the real CardPointe charge, just verify the commission math
                        </label>
                        <button className="btn btn-primary btn-sm" type="submit" disabled={saving} style={{ height: 36 }}>
                            {saving ? 'Charging…' : form.test_mode ? 'Create (test)' : 'Create & Charge'}
                        </button>
                        <div style={{ width: '100%', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                            Creating a quote immediately charges the customer's card on file for the full amount, unless test mode is checked.
                        </div>
                        {saveError && <div style={{ width: '100%', color: 'var(--red-text)', fontSize: 12 }}>{saveError}</div>}
                    </form>
                )}

                {chargeResult && (
                    <div style={{ background: chargeResult.test_mode ? 'var(--amber-bg)' : 'var(--green-bg)', border: `1px solid ${chargeResult.test_mode ? 'var(--amber)' : 'var(--green)'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: chargeResult.test_mode ? 'var(--amber-text)' : 'var(--green-text)', marginBottom: 6 }}>
                            {chargeResult.test_mode ? 'TEST — no real charge · ' : 'Charged '}
                            {chargeResult.quote.customer_name} · ${chargeResult.quote.total.toFixed(2)} · ref {chargeResult.transaction?.retref}
                        </div>
                        {chargeResult.commission && (
                            <div style={{ color: 'var(--text-secondary)' }}>
                                Commission ({chargeResult.commission.commission_rate}%): ${chargeResult.commission.commission_amount.toFixed(2)}
                                {' · '}Net to omnipay: ${chargeResult.commission.net_amount.toFixed(2)}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setChargeResult(null)}
                            style={{ marginTop: 8, background: 'none', border: 'none', color: chargeResult.test_mode ? 'var(--amber-text)' : 'var(--green-text)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="dlist">
                    {loading && (
                        <div style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading quotes…</div>
                    )}
                    {!loading && quotes.length === 0 && (
                        <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                            No quotes yet. Click &ldquo;+ New Quote&rdquo; to create one.
                        </div>
                    )}
                    {!loading && quotes.length > 0 && filteredQuotes.length === 0 && (
                        <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                            No quotes match {search.trim() ? `"${search.trim()}"` : `"${activeFilter}"`}.
                        </div>
                    )}
                    {filteredQuotes.map((q) => (
                        <div className="entity-row flat quote-row" style={styles.row} key={q._id}>
                            <div className="avatar" style={styles.avatar}>
                                <FileIcon />
                            </div>
                            <div style={styles.rowMain}>
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <div style={styles.bold}>{q.quote_number}</div>
                                    <span className="text-meta" style={styles.meta12}>
                                        {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 truncate" style={styles.rowSub}>
                                    <span className="truncate">{q.customer_name}</span>
                                </div>
                            </div>
                            <div className="quote-row-meta">
                                <div className="q-status-col">
                                    <span className={`badge ${STATUS_BADGE[q.status] || 'gray'}`}>{q.status}</span>
                                </div>
                                <div className="q-amount-col">
                                    <div style={styles.bold}>
                                        ${parseFloat(q.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {q.valid_until && (
                                        <div className="text-meta" style={styles.meta12}>
                                            Until {new Date(q.valid_until).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                <div className="q-activity-col">
                                    <div className="text-meta" style={styles.meta12}>
                                        {q.updatedAt ? new Date(q.updatedAt).toLocaleDateString() : '—'}
                                    </div>
                                    <div className="text-tertiary" style={styles.noteText}>{q.notes || ''}</div>
                                </div>
                                <div className="q-action-col">
                                    {q.status === 'draft' ? (
                                        <button className="btn btn-primary btn-sm" onClick={() => setViewQuoteId(q._id)}>Review</button>
                                    ) : (
                                        <a style={styles.viewLink} onClick={() => setViewQuoteId(q._id)}>View →</a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <SparkleIcon />
                        <span>Quotes Summary</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-alert amber">
                    <div className="ai-alert-icon">
                        <ClockIcon size={18} />
                    </div>
                    <div className="ai-alert-body">
                        <div className="ai-alert-title">Quote approval stuck</div>
                        <div className="ai-alert-sub">Action recommended</div>
                        <div className="ai-alert-text">
                            {stuckQuote
                                ? `${stuckQuote.quote_number} pending ${daysPending} day${daysPending === 1 ? '' : 's'} with ${stuckQuote.customer_name}. Typical approval: 4 hours.`
                                : 'QUT-2831 pending 2 days with Vertex Systems. Typical approval: 4 hours.'}
                        </div>
                        <a className="ai-alert-link" href="/connect/finance/approvals">Send follow-up →</a>
                    </div>
                </div>

                <div className="ai-section-label">Also Noted</div>
                <div className="ai-list">
                    <div className="ai-list-item green">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">{likelyToConvert.length > 0 ? `${likelyToConvert.length} quote${likelyToConvert.length === 1 ? '' : 's'} likely to convert` : '3 quotes likely to convert'}</div>
                            <div className="ai-list-item-sub">Est. ~{likelyToConvert.length > 0 ? fmtQK(likelyToConvertTotal) : '$156K'} revenue</div>
                        </div>
                    </div>
                    <div className="ai-list-item violet">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">{pendingQuotes.length > 0 ? `${pendingQuotes.length} quote${pendingQuotes.length === 1 ? '' : 's'} in review` : '3 quotes in review'}</div>
                            <div className="ai-list-item-sub">Awaiting decision</div>
                        </div>
                    </div>
                    <div className="ai-list-item green">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">Upsell: extended warranty</div>
                            <div className="ai-list-item-sub">Add to QUT-2846</div>
                        </div>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">Seasonal demand rising</div>
                            <div className="ai-list-item-sub">Q2 pattern</div>
                        </div>
                    </div>
                    <div className="ai-list-item green">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">Renewal quotes performing well</div>
                            <div className="ai-list-item-sub">85% conversion</div>
                        </div>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot" />
                        <div>
                            <div className="ai-list-item-title">Draft: finish &amp; send</div>
                            <div className="ai-list-item-sub">{oldestDraft ? `${oldestDraft.quote_number} ready` : 'QUT-2847 ready'}</div>
                        </div>
                    </div>
                </div>

                <div className="ai-suggested">
                    <div className="ai-suggested-title">
                        <SparkleIcon size={14} />
                        <span>High conversion likely</span>
                    </div>
                    <div className="ai-suggested-text">
                        {pendingQuotes.length > 0 ? `${pendingQuotes.length} approval${pendingQuotes.length === 1 ? '' : 's'} → ~${fmtQK(pipelineFromPending)} pipeline` : '3 approvals → ~$93K pipeline'}
                    </div>
                </div>

                <div className="ai-section-label">Snapshot</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-label">from database</div>
                    <div className="ai-snapshot-row">
                        <span className="label">Total</span>
                        <span className="val">{loading ? '…' : quotes.length}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Draft</span>
                        <span className="val">{loading ? '…' : quotes.filter(q => q.status === 'draft').length}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Pending approval</span>
                        <span className="val" style={{ color: quotes.filter(q => q.status === 'pending_approval').length > 0 ? 'var(--amber-text)' : undefined }}>
                            {loading ? '…' : quotes.filter(q => q.status === 'pending_approval').length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Approved</span>
                        <span className="val" style={{ color: 'var(--green-text)' }}>
                            {loading ? '…' : quotes.filter(q => q.status === 'approved').length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Rejected</span>
                        <span className="val" style={{ color: quotes.filter(q => q.status === 'rejected').length > 0 ? 'var(--red-text)' : undefined }}>
                            {loading ? '…' : quotes.filter(q => q.status === 'rejected').length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Total value</span>
                        <span className="val">
                            {loading ? '…' : `$${quotes.reduce((s, q) => s + (q.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </span>
                    </div>
                </div>

            </aside>

            {viewQuoteId && <QuoteDetailModal id={viewQuoteId} onClose={() => setViewQuoteId(null)} />}
        </>
    )
}
