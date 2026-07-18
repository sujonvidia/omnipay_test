export default function FinanceMerchantPanel({ merchant, gateway, merchantError }) {
    const connected = gateway?.connected;
    const env = gateway?.environment;
    const mid = gateway?.merchantId;

    return (
        <div className="card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: merchant ? 12 : 0, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                        background: connected ? 'var(--green)' : 'var(--red)',
                    }} />
                    <span style={{ fontWeight: 600, color: connected ? 'var(--green-text)' : 'var(--red-text)' }}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                    MID: <strong style={{ color: 'var(--text-primary)' }}>{mid || '—'}</strong>
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                    Env: <strong style={{ color: env === 'production' ? 'var(--red-text)' : 'var(--amber-text)' }}>{env || '—'}</strong>
                </span>
                {!gateway?.configured && (
                    <span style={{ marginLeft: 'auto', color: 'var(--red-text)', fontSize: 12 }}>Credentials not configured in .env</span>
                )}
                {gateway?.connError && (
                    <span style={{ marginLeft: 'auto', color: 'var(--red-text)', fontSize: 12 }}>{gateway.connError}</span>
                )}
            </div>

            {merchantError && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                    Merchant details unavailable in sandbox — <code style={{ fontSize: 11 }}>/inquireMerchant</code> requires additional permissions
                </div>
            )}
            {!merchantError && merchant && Object.keys(merchant).length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                    gap: '8px 16px',
                    fontSize: 13,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 12,
                }}>
                    {Object.entries(merchant)
                        .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
                        .map(([k, v]) => (
                            <div key={k}>
                                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 2 }}>{k}</div>
                                <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>{String(v)}</div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
