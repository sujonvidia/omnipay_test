const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const fmt = v => (v === undefined || v === null || v === '') ? '—' : String(v);

export default function FinanceFundingPanel({ data }) {
    if (!data) return null;

    // Individual txns may be at top level OR nested inside fundings[n].txns
    let txns = [];
    if (Array.isArray(data.txns)) {
        txns = data.txns;
    } else if (Array.isArray(data.fundings)) {
        txns = data.fundings.flatMap(f => Array.isArray(f.txns) ? f.txns : []);
    }

    // Aggregate funding records from fundings[] (netsales, bank routing, etc.)
    const fundingRecords = Array.isArray(data.fundings) ? data.fundings : [];
    const totalNetsales = fundingRecords.reduce((s, f) => s + (parseFloat(f.netsales || 0)), 0);

    const topFields = Object.entries(data)
        .filter(([k, v]) => k !== 'txns' && k !== 'fundings' && v != null && v !== '' && typeof v !== 'object');

    return (
        <div className="card" style={{ padding: '16px 20px' }}>
            {/* Top-level fields: fundingmasterid, merchid, fundingdate */}
            {topFields.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px 16px',
                    fontSize: 13,
                    marginBottom: 14,
                }}>
                    {topFields.map(([k, v]) => (
                        <div key={k}>
                            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontWeight: 500 }}>{fmt(v)}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Funding aggregate records — always shown when present */}
            {fundingRecords.length > 0 && (
                <>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        Funding Records · {fundingRecords.length}
                    </div>
                    <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 10 }}>
                        <div className="kpi">
                            <div className="kpi-label">Net Sales</div>
                            <div className="kpi-value">${totalNetsales.toFixed(2)}</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Funding Date</div>
                            <div className="kpi-value" style={{ fontSize: 14 }}>{data.fundingdate || '—'}</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Batch Status</div>
                            <div className="kpi-value" style={{ fontSize: 14 }}>{data.setlstat || data.fundingstat || '—'}</div>
                        </div>
                    </div>
                    {fundingRecords.map((f, i) => {
                        const fFields = Object.entries(f).filter(([k, v]) => k !== 'txns' && v != null && v !== '' && typeof v !== 'object');
                        return (
                            <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 600 }}>
                                    Record {i + 1} · DDA {f.ddanumber || '—'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px 14px', fontSize: 12 }}>
                                    {fFields.map(([k, v]) => (
                                        <div key={k}>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 1 }}>{k}</div>
                                            <div style={{ fontWeight: 500 }}>{fmt(v)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Individual transaction rows (if API includes txn-level data) */}
            {txns.length > 0 && (
                <>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6, marginBottom: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        Transactions · {txns.length}
                    </div>
                    <div className="dlist">
                        {txns.map((t, i) => (
                            <div className="entity-row flat" key={t.retref || i} style={{ padding: '9px 0' }}>
                                <div className="row-body">
                                    <div className="row-title" style={{ fontSize: 13 }}>
                                        {t.retref || `Txn ${i + 1}`}
                                        {t.lastfour ? ` ••••${t.lastfour}` : ''}
                                    </div>
                                    <div className="row-sub" style={{ fontSize: 12 }}>
                                        {t.setlstat || t.fundingstat || '—'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 13 }}>
                                    <div style={{ fontWeight: 600 }}>${parseFloat(t.fundingamt || t.amount || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {fundingRecords.length === 0 && txns.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', paddingTop: 4 }}>
                    No funding records for this date.
                </div>
            )}
        </div>
    );
}
