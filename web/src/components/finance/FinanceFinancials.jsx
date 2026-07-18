import { useState, useEffect } from 'react';
import FinanceMerchantPanel from './FinanceMerchantPanel';
import FinanceFundingPanel from './FinanceFundingPanel';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

function toCardDate(iso) {
    // txnsummary path param format: MMDDYYYY
    const [y, m, d] = iso.split('-');
    return `${m}${d}${y}`;
}

function toFundingDate(iso) {
    // Fiserv funding/settlestat query param format: YYYYMMDD
    return iso.replace(/-/g, '');
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function useTxnSummary(date) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        setLoading(true); setData(null); setError('');
        fetch(`${BASE}/v1/finance/txnsummary?date=${toCardDate(date)}`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => {
                if (j.status) setData(j.data);
                else { const e = j.error; setError(typeof e === 'string' ? e : (e?.error || e?.resptext || e?.message || 'Failed')); }
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [date]);
    return { data, loading, error };
}

function useSurchargeSummary(date) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        setLoading(true); setData(null); setError('');
        fetch(`${BASE}/v1/finance/txnsummary/surcharge?date=${toCardDate(date)}`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => {
                if (j.status) setData(j.data);
                else setError(j.error || 'No surcharge data');
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [date]);
    return { data, loading, error };
}

function useFunding(date) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        setLoading(true); setData(null); setError('');
        // Try with selected date first; if no fundings found, fall back to most recent (no date)
        const fetchFunding = async (withDate) => {
            const url = withDate
                ? `${BASE}/v1/finance/funding?date=${toFundingDate(date)}`
                : `${BASE}/v1/finance/funding`;
            const r = await fetch(url, { headers: authH(), credentials: 'include' });
            return r.json();
        };
        (async () => {
            try {
                const j = await fetchFunding(true);
                if (j.status && j.data && j.data.fundings && j.data.fundings.length > 0) {
                    setData(j.data);
                } else {
                    const j2 = await fetchFunding(false);
                    if (j2.status) setData(j2.data);
                    else setError(j2.error?.resptext || j2.error?.message || String(j2.error || '') || 'No funding data');
                }
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [date]);
    return { data, loading, error };
}

function useSettlement() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch(`${BASE}/v1/finance/settlement`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setData(j.data); else setError(''); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}

function useSurchargeSettlement() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch(`${BASE}/v1/finance/settlement/surcharge`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setData(j.data); else setError(''); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}

function useMerchant() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch(`${BASE}/v1/finance/merchant`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setData(j.data); else setError(j.error || 'Merchant error'); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}

function useGateway() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch(`${BASE}/v1/finance/gateway`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setData(j.data); else setError(j.error || 'Gateway error'); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}

function useTerminals() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch(`${BASE}/v1/finance/terminal/list`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setData(j.data); else setError(j.error || 'No terminal data'); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}

function useTxns() {
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

function deriveSummary(txnData) {
    const txns = txnData?.txns || [];
    const approved = txns.filter(t => t.respstat === 'A');
    const declined = txns.filter(t => t.respstat === 'C');
    const retried = txns.filter(t => t.respstat === 'B');
    const totalApproved = approved.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalDeclined = declined.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    return { txns, approved, declined, retried, totalApproved, totalDeclined };
}

const dateInputStyle = {
    fontSize: 13,
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    outline: 'none',
};

function TxnTable({ txns }) {
    if (!txns || txns.length === 0) return null;
    return (
        <div className="dlist mt-2">
            {txns.map((t, i) => (
                <div className="entity-row flat" key={t.retref || i} style={{ padding: '10px 18px' }}>
                    <div className="avatar" style={{
                        width: 32, height: 32, fontSize: 11,
                        background: t.respstat === 'A' ? 'var(--green-bg)' : t.respstat === 'B' ? 'var(--amber-bg)' : 'var(--red-bg)',
                        color: t.respstat === 'A' ? 'var(--green-text)' : t.respstat === 'B' ? 'var(--amber-text)' : 'var(--red-text)',
                    }}>
                        {t.respstat === 'A' ? '✓' : t.respstat === 'B' ? '↺' : '✗'}
                    </div>
                    <div className="row-body">
                        <div className="row-title" style={{ fontSize: 13 }}>
                            {t.name || 'Unknown'}{t.lastfour ? ` ••••${t.lastfour}` : ''}
                        </div>
                        <div className="row-sub" style={{ fontSize: 12 }}>
                            {t.entrymode || '—'} · {t.retref}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>${parseFloat(t.amount || 0).toFixed(2)}</div>
                        <div style={{
                            fontSize: 11.5,
                            color: t.respstat === 'A' ? 'var(--green-text)' : t.respstat === 'B' ? 'var(--amber-text)' : 'var(--red-text)',
                        }}>
                            {t.respstat === 'A' ? 'Approved' : t.respstat === 'B' ? 'Retry' : 'Declined'}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TxnKpis({ summary, label }) {
    return (
        <div className="kpi-grid kpi-grid-3 mt-2">
            <div className="kpi">
                <div className="kpi-label">Approved</div>
                <div className="kpi-value">{summary.approved.length}</div>
                <div className="kpi-trend green">
                    ${summary.totalApproved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} collected
                </div>
            </div>
            <div className="kpi">
                <div className="kpi-label">Declined</div>
                <div className="kpi-value">{summary.declined.length}</div>
                <div className="kpi-trend red">
                    ${summary.totalDeclined.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} failed
                </div>
            </div>
            <div className="kpi">
                <div className="kpi-label">Total · {label}</div>
                <div className="kpi-value">{summary.txns.length}</div>
                <div className="kpi-trend gray">
                    {summary.retried.length} retry / {summary.declined.length} declined
                </div>
            </div>
        </div>
    );
}

function SettlementCard({ settlement }) {
    if (!settlement || typeof settlement !== 'object') {
        return (
            <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                {typeof settlement === 'string' ? settlement : 'No open batch.'}
            </div>
        );
    }
    return (
        <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '8px 16px',
                fontSize: 13,
            }}>
                {Object.entries(settlement)
                    .filter(([, v]) => v != null && typeof v !== 'object')
                    .map(([k, v]) => (
                        <div key={k}>
                            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontWeight: 500 }}>{String(v) || '—'}</div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default function FinanceFinancials() {
    const [selectedDate, setSelectedDate] = useState(todayISO());

    const { data: txnData, loading: txnLoading, error: txnError } = useTxnSummary(selectedDate);
    const summary = txnData ? deriveSummary(txnData) : null;

    const { data: surchargeData, loading: surchargeLoading, error: surchargeError } = useSurchargeSummary(selectedDate);
    const surchargeSummary = surchargeData ? deriveSummary(surchargeData) : null;

    const { data: settlement, loading: settlLoading, error: settlError } = useSettlement();
    const { data: surchargeSettlement, loading: surchargeSettlLoading, error: surchargeSettlError } = useSurchargeSettlement();
    const { data: funding, loading: fundLoading, error: fundError } = useFunding(selectedDate);
    const { data: merchant, loading: merchantLoading, error: merchantError } = useMerchant();
    const { data: gateway, loading: gatewayLoading, error: gatewayError } = useGateway();
    const { data: terminals, loading: terminalsLoading, error: terminalsError } = useTerminals();
    const { txns: importedTxns, loading: importedLoading } = useTxns();

    const importedApproved = importedTxns.filter(t => t.respstat === 'A');
    const importedDeclined = importedTxns.filter(t => t.respstat === 'C');
    const importedTotal = importedApproved.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const uniqueCards = new Set(importedTxns.map(t => t.card_last_four)).size;

    return (
        <>
            <main className="page-main">
                {/* Hero */}
                <div className="hero">
                    <div className="hero-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="20" x2="12" y2="10" />
                            <line x1="18" y1="20" x2="18" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="16" />
                        </svg>
                    </div>
                    <h1 className="hero-title">Financial Summary</h1>
                    <p className="hero-sub">Live data from CardPointe / Fiserv gateway</p>
                </div>

                {/* AI bar */}
                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                                <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                            </svg>
                            <input placeholder="Ask anything about your financials..." defaultValue="" />
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

                {/* ── Gateway & Merchant Account ── */}
                <div className="section-header blue" style={{ marginTop: 16 }}>
                    <span className="dot" />
                    <span className="section-title">Gateway &amp; Merchant Account</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        CardPointe /inquireMerchant
                    </span>
                </div>
                {(gatewayLoading || merchantLoading) ? (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                ) : gatewayError ? (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13 }}>
                        <span style={{ color: 'var(--red-text)' }}>Gateway error: {gatewayError}</span>
                        <span style={{ marginLeft: 10, color: 'var(--text-tertiary)', fontSize: 12 }}>Check CARDPOINTE_* env vars and backend logs</span>
                    </div>
                ) : (
                    <FinanceMerchantPanel merchant={merchant} gateway={gateway} merchantError={merchantError} />
                )}
                {/* Surcharge MID badge */}
                {gateway?.surchargeMid && (
                    <div style={{ marginTop: 6, padding: '6px 12px', fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                            background: 'var(--amber-bg)', color: 'var(--amber-text)',
                            borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600,
                        }}>SURCHARGE</span>
                        MID {gateway.surchargeMid} · card-not-present surcharge enabled
                    </div>
                )}

                {/* ── Transaction Activity — Standard MID ── */}
                <div className="section-header violet" style={{ marginTop: 28 }}>
                    <span className="dot" />
                    <span className="section-title">Transaction Activity</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                        Standard MID · {gateway?.merchantId || '…'}
                    </span>
                    <input
                        type="date"
                        value={selectedDate}
                        max={todayISO()}
                        onChange={e => setSelectedDate(e.target.value)}
                        style={{ ...dateInputStyle, marginLeft: 'auto' }}
                    />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4, marginBottom: 4 }}>
                    CardPointe /txnsummary · {selectedDate}
                </div>

                {txnLoading && (
                    <div className="card" style={{ padding: '16px 18px', color: 'var(--text-tertiary)', fontSize: 13 }}>
                        Loading transaction data…
                    </div>
                )}
                {!txnLoading && txnError && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        No transactions found for {selectedDate}.
                        {txnError !== 'Not Found' && (
                            <span style={{ marginLeft: 8, color: 'var(--red-text)', fontSize: 12 }}>{txnError}</span>
                        )}
                    </div>
                )}
                {summary && (
                    <>
                        <TxnKpis summary={summary} label="Standard" />
                        {summary.txns.length > 0
                            ? <TxnTable txns={summary.txns} />
                            : <div className="card" style={{ padding: '16px 18px', color: 'var(--text-tertiary)', fontSize: 13 }}>No transactions for {selectedDate}.</div>
                        }
                    </>
                )}

                {/* ── Transaction Activity — Surcharge MID ── */}
                <div className="section-header violet" style={{ marginTop: 20 }}>
                    <span className="dot" style={{ background: 'var(--amber)' }} />
                    <span className="section-title">Transaction Activity</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                        Surcharge MID · {gateway?.surchargeMid || '800000050216'}
                    </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4, marginBottom: 4 }}>
                    CardPointe /txnsummary (surcharge) · {selectedDate}
                </div>
                {surchargeLoading && (
                    <div className="card" style={{ padding: '14px 18px', color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
                )}
                {!surchargeLoading && surchargeError && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        No surcharge transactions for {selectedDate}.
                        {surchargeError !== 'Not Found' && (
                            <span style={{ marginLeft: 8, color: 'var(--red-text)', fontSize: 12 }}>{surchargeError}</span>
                        )}
                    </div>
                )}
                {surchargeSummary && (
                    <>
                        <TxnKpis summary={surchargeSummary} label="Surcharge" />
                        {surchargeSummary.txns.length > 0
                            ? <TxnTable txns={surchargeSummary.txns} />
                            : <div className="card" style={{ padding: '16px 18px', color: 'var(--text-tertiary)', fontSize: 13 }}>No surcharge transactions for {selectedDate}.</div>
                        }
                    </>
                )}

                {/* ── Settlement Status — Both MIDs ── */}
                <div className="section-header green" style={{ marginTop: 28 }}>
                    <span className="dot" />
                    <span className="section-title">Settlement Status</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        CardPointe /settlestat
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                            Standard MID · {gateway?.merchantId || '…'}
                        </div>
                        {settlLoading
                            ? <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                            : !settlement
                                ? <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                                    {settlError ? <span style={{ color: 'var(--red-text)' }}>{settlError}</span> : 'No open batch.'}
                                </div>
                                : <SettlementCard settlement={settlement} />
                        }
                    </div>
                    <div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                            Surcharge MID · {gateway?.surchargeMid || '800000050216'}
                        </div>
                        {surchargeSettlLoading
                            ? <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                            : !surchargeSettlement
                                ? <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                                    {surchargeSettlError || 'No open batch.'}
                                </div>
                                : <SettlementCard settlement={surchargeSettlement} />
                        }
                    </div>
                </div>

                {/* ── Funding Details ── */}
                <div className="section-header amber" style={{ marginTop: 28 }}>
                    <span className="dot" />
                    <span className="section-title">Funding Details</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        CardPointe /funding · {selectedDate}
                    </span>
                </div>
                {fundLoading && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                )}
                {!fundLoading && !funding && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        {fundError || `No funding data for ${selectedDate}.`}
                    </div>
                )}
                {funding && <FinanceFundingPanel data={funding} />}

                {/* ── Bolt Terminals (card-present) ── */}
                <div className="section-header blue" style={{ marginTop: 28 }}>
                    <span className="dot" />
                    <span className="section-title">Bolt Terminals</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        CardPointe Bolt API · card-present
                    </span>
                </div>
                {terminalsLoading && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                )}
                {!terminalsLoading && terminalsError && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: !gateway?.boltConfigured ? 'var(--amber)' : 'var(--red)',
                                flexShrink: 0, display: 'inline-block',
                            }} />
                            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                {!gateway?.boltConfigured
                                    ? 'Bolt terminal not configured — add BOLT_AUTH_KEY to .env'
                                    : `Terminal API error: ${terminalsError}`
                                }
                            </span>
                        </div>
                        {!gateway?.boltConfigured && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)', paddingLeft: 18 }}>
                                Terminal URL: {gateway?.boltBaseUrl || 'https://bolt-uat.cardpointe.com/api/'} · AuthKey from Fiserv onboarding email · HSN assigned per device
                            </div>
                        )}
                    </div>
                )}
                {!terminalsLoading && !terminalsError && terminals && (
                    <div className="card" style={{ padding: '16px 20px' }}>
                        {Array.isArray(terminals) && terminals.length > 0 ? (
                            <div className="dlist">
                                {terminals.map((t, i) => (
                                    <div className="entity-row flat" key={t.hsn || i} style={{ padding: '9px 0' }}>
                                        <div className="row-body">
                                            <div className="row-title" style={{ fontSize: 13 }}>HSN: {t.hsn || '—'}</div>
                                            <div className="row-sub" style={{ fontSize: 12 }}>{t.deviceClass || t.deviceType || '—'}</div>
                                        </div>
                                        <div style={{ fontSize: 12, color: t.connected ? 'var(--green-text)' : 'var(--text-tertiary)' }}>
                                            {t.connected ? 'Online' : 'Offline'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                                No terminals registered yet. HSN will be assigned when device ships (contact Fiserv).
                            </div>
                        )}
                    </div>
                )}

                {/* ── Reporting Portal — blocked by Keycloak config ── */}
                <div className="section-header blue" style={{ marginTop: 28 }}>
                    <span className="dot" />
                    <span className="section-title">Reporting Portal</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        cardpointe-uat.cardconnect.com
                    </span>
                </div>
                <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                    Not available via server-side API. The portal uses Keycloak SSO (
                    <code style={{ fontSize: 12 }}>accountsuat.cardconnect.com</code>
                    ) with the <code style={{ fontSize: 12 }}>cardpointe</code> OAuth2 client — Direct Access Grants are
                    disabled on that client. Ask Fiserv to provide an API-specific OAuth2 client or enable Direct Access Grants.
                </div>

                {/* ── Imported Transactions (MongoDB) ── */}
                <div className="section-header violet" style={{ marginTop: 28 }}>
                    <span className="dot" />
                    <span className="section-title">Imported Transactions</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        MongoDB · via CardPointe /inquire
                    </span>
                </div>
                {importedLoading && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        Loading…
                    </div>
                )}
                {!importedLoading && importedTxns.length === 0 && (
                    <div className="card" style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                        No imported transactions. Go to Receivables → Import retref to add transactions.
                    </div>
                )}
                {importedTxns.length > 0 && (
                    <>
                        <div className="kpi-grid kpi-grid-3 mt-2">
                            <div className="kpi">
                                <div className="kpi-label">Approved</div>
                                <div className="kpi-value">{importedApproved.length}</div>
                                <div className="kpi-trend green">
                                    ${importedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} collected
                                </div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Declined</div>
                                <div className="kpi-value">{importedDeclined.length}</div>
                                <div className="kpi-trend red">
                                    {importedTxns.length > 0 ? ((importedDeclined.length / importedTxns.length) * 100).toFixed(0) : 0}% decline rate
                                </div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Total Imported</div>
                                <div className="kpi-value">{importedTxns.length}</div>
                                <div className="kpi-trend gray">{uniqueCards} unique card(s)</div>
                            </div>
                        </div>
                        <div className="dlist mt-2">
                            {importedTxns.slice(0, 10).map((t, i) => (
                                <div className="entity-row flat" key={t.retref || i} style={{ padding: '10px 18px' }}>
                                    <div className="avatar" style={{
                                        width: 32, height: 32, fontSize: 11,
                                        background: t.respstat === 'A' ? 'var(--green-bg)' : 'var(--red-bg)',
                                        color: t.respstat === 'A' ? 'var(--green-text)' : 'var(--red-text)',
                                    }}>
                                        {t.respstat === 'A' ? '✓' : '✗'}
                                    </div>
                                    <div className="row-body">
                                        <div className="row-title" style={{ fontSize: 13 }}>
                                            {t.cardholder_name || 'Unknown'}{t.card_last_four ? ` ••••${t.card_last_four}` : ''}
                                        </div>
                                        <div className="row-sub" style={{ fontSize: 12 }}>
                                            {t.setlstat || t.resptext || '—'} · {t.authdate ? `${t.authdate.slice(0,4)}-${t.authdate.slice(4,6)}-${t.authdate.slice(6)}` : '—'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>${parseFloat(t.amount || 0).toFixed(2)}</div>
                                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{t.entrymode || '—'}</div>
                                    </div>
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
                        <span>Live Summary</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-section-label">Gateway</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-row">
                        <span className="label">Status</span>
                        <span className="val" style={{ color: gateway?.connected ? 'var(--green-text)' : 'var(--red-text)' }}>
                            {gatewayLoading ? '…' : gatewayError ? 'Error' : gateway?.connected ? 'Connected' : 'Offline'}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Standard MID</span>
                        <span className="val">{gatewayLoading ? '…' : gateway?.merchantId || '—'}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Surcharge MID</span>
                        <span className="val">{gatewayLoading ? '…' : gateway?.surchargeMid || '—'}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Terminal</span>
                        <span className="val" style={{ color: gateway?.boltConfigured ? 'var(--green-text)' : 'var(--amber-text)' }}>
                            {gatewayLoading ? '…' : gateway?.boltConfigured ? 'Configured' : 'Key missing'}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Env</span>
                        <span className="val">{gatewayLoading ? '…' : gateway?.environment || '—'}</span>
                    </div>
                </div>

                <div className="ai-section-label">Transactions · {selectedDate}</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-label">Standard MID</div>
                    <div className="ai-snapshot-row">
                        <span className="label">Approved</span>
                        <span className="val" style={{ color: 'var(--green-text)' }}>
                            {txnLoading ? '…' : summary?.approved.length ?? '—'}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Collected</span>
                        <span className="val">
                            {txnLoading ? '…' : summary ? `$${summary.totalApproved.toFixed(2)}` : '—'}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Declined</span>
                        <span className="val" style={{ color: 'var(--red-text)' }}>
                            {txnLoading ? '…' : summary?.declined.length ?? '—'}
                        </span>
                    </div>
                </div>

                {surchargeSummary && (
                    <div className="ai-snapshot" style={{ marginTop: 6 }}>
                        <div className="ai-snapshot-label">Surcharge MID</div>
                        <div className="ai-snapshot-row">
                            <span className="label">Approved</span>
                            <span className="val" style={{ color: 'var(--green-text)' }}>{surchargeSummary.approved.length}</span>
                        </div>
                        <div className="ai-snapshot-row">
                            <span className="label">Collected</span>
                            <span className="val">${surchargeSummary.totalApproved.toFixed(2)}</span>
                        </div>
                        <div className="ai-snapshot-row">
                            <span className="label">Declined</span>
                            <span className="val" style={{ color: 'var(--red-text)' }}>{surchargeSummary.declined.length}</span>
                        </div>
                    </div>
                )}

                <div className="ai-section-label">Settlement</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-row">
                        <span className="label">Standard batch</span>
                        <span className="val">{settlLoading ? '…' : settlement ? 'Open' : 'None'}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Surcharge batch</span>
                        <span className="val">{surchargeSettlLoading ? '…' : surchargeSettlement ? 'Open' : 'None'}</span>
                    </div>
                    {settlement && (
                        <div className="ai-snapshot-row">
                            <span className="label">Std amount</span>
                            <span className="val">{settlement.setlamount || settlement.amount ? `$${parseFloat(settlement.setlamount || settlement.amount || 0).toFixed(2)}` : '—'}</span>
                        </div>
                    )}
                </div>

                <div className="ai-section-label">Imported (MongoDB)</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-row">
                        <span className="label">Total records</span>
                        <span className="val">{importedLoading ? '…' : importedTxns.length}</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Approved</span>
                        <span className="val" style={{ color: 'var(--green-text)' }}>
                            {importedLoading ? '…' : importedApproved.length}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Collected</span>
                        <span className="val">
                            {importedLoading ? '…' : `$${importedTotal.toFixed(2)}`}
                        </span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Unique cards</span>
                        <span className="val">{importedLoading ? '…' : uniqueCards}</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
