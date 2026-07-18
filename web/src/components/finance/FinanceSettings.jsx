import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

export default function FinanceSettings() {
    const [gateway, setGateway] = useState(null);
    const [gatewayLoading, setGatewayLoading] = useState(false);
    const [gatewayError, setGatewayError] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [merchant, setMerchant] = useState(null);
    const [merchantLoading, setMerchantLoading] = useState(false);

    useEffect(() => {
        setGatewayLoading(true);
        fetch(`${BASE}/v1/finance/gateway`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setGateway(j.data); else setGatewayError(j.error || 'Failed'); })
            .catch(e => setGatewayError(e.message))
            .finally(() => setGatewayLoading(false));

        setMerchantLoading(true);
        fetch(`${BASE}/v1/finance/merchant`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setMerchant(j.data); })
            .catch(() => {})
            .finally(() => setMerchantLoading(false));
    }, []);

    async function testConnection() {
        setTestLoading(true);
        setTestResult(null);
        try {
            const r = await fetch(`${BASE}/v1/finance/gateway`, { headers: authH(), credentials: 'include' });
            const j = await r.json();
            setTestResult(j.status && j.data?.connected ? 'connected' : 'error');
            if (j.status) setGateway(j.data);
        } catch {
            setTestResult('error');
        } finally {
            setTestLoading(false);
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
                    <h1 className="hero-title">Business Configuration</h1>
                    <p className="hero-sub">Manage your business setup and system configuration</p>
                </div>

                <div className="aibar">
                    <form>
                        <div className="cmd-input">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                                <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                            </svg>
                            <input placeholder="Ask anything about your business setup..." defaultValue="" />
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
                        <div className="chip">
                            <span className="chip-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="4" y="3" width="16" height="18" rx="1" />
                                    <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                                </svg>
                            </span>
                            <div className="chip-body">
                                <div className="chip-title">Set up a new company</div>
                                <div className="chip-cat">Companies</div>
                            </div>
                        </div>
                        <div className="chip">
                            <span className="chip-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </span>
                            <div className="chip-body">
                                <div className="chip-title">Add a currency</div>
                                <div className="chip-cat">Finance</div>
                            </div>
                        </div>
                        <div className="chip">
                            <span className="chip-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </span>
                            <div className="chip-body">
                                <div className="chip-title">Configure approval rules</div>
                                <div className="chip-cat">Governance</div>
                            </div>
                        </div>
                        <div className="chip">
                            <span className="chip-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </span>
                            <div className="chip-body">
                                <div className="chip-title">Review missing setup</div>
                                <div className="chip-cat">Status</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="tabs" style={{ margin: '24px 0px 16px', overflowX: 'auto' }}>
                    <div className="tab active">Business Config</div>
                    <div className="tab">Approval Rules</div>
                    <div className="tab">Pricing &amp; Discounts</div>
                    <div className="tab">Roles &amp; Permissions</div>
                    <div className="tab">Templates</div>
                    <div className="tab">Products &amp; Catalog</div>
                </div>

                <div className="section-header amber">
                    <span className="dot"></span>
                    <span className="section-title">Core Setup</span>
                    <span className="section-meta">Review recommended</span>
                </div>

                <div className="entity-row" style={{ cursor: 'pointer' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="3" width="16" height="18" rx="1" />
                            <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                        </svg>
                    </div>
                    <div className="row-body">
                        <div className="flex items-center gap-2">
                            <div className="row-title">Business Identity</div>
                            <span className="badge green">Complete</span>
                        </div>
                        <div className="row-sub">Legal entity and organization details</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>

                <div className="entity-row" style={{ cursor: 'pointer' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="3" width="16" height="18" rx="1" />
                            <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                        </svg>
                    </div>
                    <div className="row-body">
                        <div className="flex items-center gap-2">
                            <div className="row-title">Companies &amp; Entities</div>
                            <span className="badge green">2 companies configured</span>
                        </div>
                        <div className="row-sub">Manage companies and entity-level settings</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>

                <div className="entity-row" style={{ cursor: 'pointer' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </div>
                    <div className="row-body">
                        <div className="flex items-center gap-2">
                            <div className="row-title">Currency &amp; Finance</div>
                            <span className="badge amber">Exchange rates not configured</span>
                        </div>
                        <div className="row-sub">Base currency set, exchange rates missing</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>

                <div className="section-header red">
                    <span className="dot"></span>
                    <span className="section-title">Financial Setup</span>
                    <span className="section-meta">Needs attention</span>
                </div>

                <div className="entity-row" style={{ cursor: 'pointer' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="row-body">
                        <div className="flex items-center gap-2">
                            <div className="row-title">Tax Configuration</div>
                            <span className="badge red">Incomplete</span>
                        </div>
                        <div className="row-sub">Payments, tax, and pricing configuration</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>

                <div className="section-header amber">
                    <span className="dot"></span>
                    <span className="section-title">Governance</span>
                    <span className="section-meta">Review recommended</span>
                </div>

                <div className="entity-row" style={{ cursor: 'pointer' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </div>
                    <div className="row-body">
                        <div className="flex items-center gap-2">
                            <div className="row-title">Approvals &amp; Access</div>
                            <span className="badge amber">Approval rules need attention</span>
                        </div>
                        <div className="row-sub">Approvals, roles and access management</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>

                <div className="section-header violet">
                    <span className="dot"></span>
                    <span className="section-title">System</span>
                </div>

                <div className="entity-row" style={{ cursor: 'pointer' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </div>
                    <div className="row-body">
                        <div className="flex items-center gap-2">
                            <div className="row-title">Automation &amp; Integrations</div>
                            <span className="badge gray">Automation partially configured</span>
                        </div>
                        <div className="row-sub">Automation, integrations and system behavior</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </div>

                <div className="status-banner blue">
                    <span className="dot"></span>
                    <div>Complete financial setup before processing invoices</div>
                </div>

                <div className="section-header violet" style={{ marginTop: 28 }}>
                    <span className="dot"></span>
                    <span className="section-title">Payment Gateway</span>
                </div>

                <div className="card" style={{ padding: '18px 20px' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                        <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                        </div>
                        <div style={{ flex: '1 1 0%' }}>
                            <div className="flex items-center gap-2">
                                <div style={{ fontWeight: 600 }}>CardPointe by Fiserv</div>
                                {gatewayLoading && <span className="text-tertiary" style={{ fontSize: 12 }}>Loading…</span>}
                                {gateway && (
                                    <span className={`badge ${gateway.connected ? 'green' : 'red'}`}>
                                        {gateway.connected ? 'Connected' : 'Not connected'}
                                    </span>
                                )}
                                {gateway && (
                                    <span className="badge gray" style={{ textTransform: 'capitalize' }}>{gateway.environment}</span>
                                )}
                            </div>
                            <div className="text-tertiary" style={{ fontSize: 13 }}>
                                {gateway ? `Merchant ID: ${gateway.merchantId || '—'}` : 'Fiserv CardPointe payment gateway'}
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={testConnection}
                            disabled={testLoading}
                        >
                            {testLoading ? 'Testing…' : 'Test Connection'}
                        </button>
                    </div>

                    {testResult && (
                        <div style={{
                            fontSize: 13, borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                            background: testResult === 'connected' ? 'var(--green-bg)' : 'var(--red-bg)',
                            color: testResult === 'connected' ? 'var(--green-text)' : 'var(--red-text)',
                        }}>
                            {testResult === 'connected' ? '✓ Connection successful — gateway is reachable.' : '✗ Connection failed — check credentials in .env.'}
                        </div>
                    )}

                    {gateway && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Provider</div>
                                <div style={{ fontWeight: 500 }}>Fiserv / CardConnect</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Merchant ID</div>
                                <div style={{ fontWeight: 500 }}>{gateway.merchantId || '—'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Environment</div>
                                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{gateway.environment}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>API Endpoint</div>
                                <div style={{ fontWeight: 500, fontSize: 12 }}>{gateway.baseUrl}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Credentials</div>
                                <div style={{ fontWeight: 500, color: gateway.configured ? 'var(--green-text)' : 'var(--red-text)' }}>
                                    {gateway.configured ? 'Configured' : 'Missing — add to .env'}
                                </div>
                            </div>
                            {gateway.connected && (
                                <div>
                                    <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Status</div>
                                    <div style={{ fontWeight: 500, color: 'var(--green-text)' }}>Active</div>
                                </div>
                            )}
                        </div>
                    )}

                    {gatewayError && (
                        <div style={{ color: 'var(--red-text)', fontSize: 12.5 }}>{gatewayError}</div>
                    )}
                </div>

                <div className="section-header violet" style={{ marginTop: 28 }}>
                    <span className="dot"></span>
                    <span className="section-title">Merchant Configuration</span>
                    <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Live · CardPointe /inquireMerchant
                    </span>
                </div>

                <div className="card" style={{ padding: '18px 20px' }}>
                    {merchantLoading && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading merchant config…</div>}
                    {!merchantLoading && !merchant && (
                        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Could not load merchant config — check gateway credentials.</div>
                    )}
                    {merchant && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px', fontSize: 13 }}>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Merchant ID</div>
                                <div style={{ fontWeight: 500 }}>{merchant.merchid || '—'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Site</div>
                                <div style={{ fontWeight: 500 }}>{merchant.site || '—'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Card Processor</div>
                                <div style={{ fontWeight: 500 }}>{merchant.cardproc || '—'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>AVS Check</div>
                                <div style={{ fontWeight: 500, color: merchant.avs === 'Y' ? 'var(--green-text)' : 'var(--text-secondary)' }}>
                                    {merchant.avs === 'Y' ? 'Enabled' : 'Disabled'}
                                </div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>CVV Required</div>
                                <div style={{ fontWeight: 500, color: merchant.cvv === 'Y' ? 'var(--green-text)' : 'var(--text-secondary)' }}>
                                    {merchant.cvv === 'Y' ? 'Yes' : 'No'}
                                </div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>eCheck / ACH</div>
                                <div style={{ fontWeight: 500 }}>{merchant.echeck === 'Y' ? 'Enabled' : 'Disabled'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Account Updater</div>
                                <div style={{ fontWeight: 500 }}>{merchant.acctupdater === 'Y' ? 'Enrolled' : 'Not enrolled'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Fee Type</div>
                                <div style={{ fontWeight: 500 }}>{merchant.fee_type || '—'}</div>
                            </div>
                            <div>
                                <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Fee Rate</div>
                                <div style={{ fontWeight: 500 }}>
                                    {merchant.fee_value ? `${merchant.fee_value}${merchant.fee_format === 'percent' ? '%' : ''}` : '—'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <aside className="ai-panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
                            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
                        </svg>
                        <span>Setup Intelligence</span>
                    </div>
                    <span className="ai-live">Live</span>
                </div>

                <div className="ai-alert red">
                    <div className="ai-alert-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <div className="ai-alert-body">
                        <div className="ai-alert-title">Most Important</div>
                        <div className="ai-alert-text">Tax configuration incomplete — invoices may be incorrect</div>
                    </div>
                </div>

                <div className="ai-section-label">Missing Setup</div>
                <div className="ai-list">
                    <div className="ai-list-item red">
                        <div className="dot"></div>
                        <div>
                            <div className="ai-list-item-title">Tax rules not defined for CAD</div>
                        </div>
                    </div>
                    <div className="ai-list-item amber">
                        <div className="dot"></div>
                        <div>
                            <div className="ai-list-item-title">Approval threshold missing above $25k</div>
                        </div>
                    </div>
                    <div className="ai-list-item red">
                        <div className="dot"></div>
                        <div>
                            <div className="ai-list-item-title">Exchange rates not configured</div>
                        </div>
                    </div>
                </div>

                <div className="ai-section-label">Recommendations</div>
                <div className="ai-list">
                    <div className="ai-list-item violet">
                        <div className="dot"></div>
                        <div>
                            <div className="ai-list-item-title">Define approval rules for high-value quotes</div>
                        </div>
                    </div>
                    <div className="ai-list-item violet">
                        <div className="dot"></div>
                        <div>
                            <div className="ai-list-item-title">Complete tax setup before issuing invoices</div>
                        </div>
                    </div>
                </div>

                <div className="ai-section-label">Setup Status</div>
                <div className="ai-snapshot">
                    <div className="ai-snapshot-label">Setup Status</div>
                    <div className="ai-snapshot-row">
                        <span className="label">Complete</span>
                        <span className="val" style={{ color: 'var(--green-text)' }}>3</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Needs attention</span>
                        <span className="val" style={{ color: 'var(--amber-text)' }}>2</span>
                    </div>
                    <div className="ai-snapshot-row">
                        <span className="label">Partial</span>
                        <span className="val" style={{ color: 'var(--text-tertiary)' }}>1</span>
                    </div>
                </div>
            </aside>
        </>
    )
}
