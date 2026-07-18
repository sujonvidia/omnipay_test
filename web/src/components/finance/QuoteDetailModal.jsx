import { useState, useEffect, useRef } from 'react';
import { FiX, FiFileText, FiLoader } from 'react-icons/fi';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const STATUS_BADGE = { draft: 'gray', sent: 'violet', pending_approval: 'amber', approved: 'green', rejected: 'red', expired: 'red', converted: 'green' };

function money(n, currency = 'USD') {
    const num = parseFloat(n);
    if (isNaN(num)) return '—';
    return num.toLocaleString('en-US', { style: 'currency', currency });
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
}

export default function QuoteDetailModal({ id, onClose }) {
    const [data, setData] = useState(null);
    const [transaction, setTransaction] = useState(null);
    const [commission, setCommission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const overlayRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        fetch(`${BASE}/v1/finance/quotes/${id}`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => {
                if (cancelled) return;
                if (j.status) {
                    setData(j.data);
                    setTransaction(j.transaction);
                    setCommission(j.commission);
                } else {
                    setError(j.error || 'Failed to load quote');
                }
            })
            .catch(err => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    function handleOverlayClick(e) {
        if (e.target === overlayRef.current) onClose();
    }

    const currency = data?.currency || 'USD';

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
            <div className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl bg-white dark:bg-[#1e1e2e] border border-black/10 dark:border-white/10 overflow-hidden">

                <div className="flex items-center gap-3 px-5 py-4 border-b border-black/8 dark:border-white/8">
                    <FiFileText size={18} className="text-[var(--primary)]" />
                    <span className="font-semibold text-sm">{data?.quote_number || 'Quote'}</span>
                    {data?.status && <span className={`badge ${STATUS_BADGE[data.status] || 'gray'}`}>{data.status}</span>}
                    <div className="flex-1" />
                    <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/8 dark:hover:bg-white/8 transition">
                        <FiX size={15} />
                    </button>
                </div>

                <div className="px-5 py-4 max-h-[80vh] overflow-y-auto space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-400">
                            <FiLoader size={16} className="animate-spin" /> Loading quote…
                        </div>
                    )}

                    {!loading && error && (
                        <p className="text-xs text-red-500">{error}</p>
                    )}

                    {!loading && !error && data && (
                        <>
                            <div className="detail-card" style={{ padding: 16, marginBottom: 0 }}>
                                <div className="kv-grid">
                                    <div>
                                        <div className="kv-label">Customer</div>
                                        <div className="kv-value">{data.customer_name}</div>
                                    </div>
                                    <div>
                                        <div className="kv-label">Priority</div>
                                        <div className="kv-value">{data.priority}</div>
                                    </div>
                                    <div>
                                        <div className="kv-label">Created</div>
                                        <div className="kv-value">{fmtDate(data.createdAt)}</div>
                                    </div>
                                    <div>
                                        <div className="kv-label">Updated</div>
                                        <div className="kv-value">{fmtDate(data.updatedAt)}</div>
                                    </div>
                                    {data.valid_until && (
                                        <div>
                                            <div className="kv-label">Valid until</div>
                                            <div className="kv-value">{fmtDate(data.valid_until)}</div>
                                        </div>
                                    )}
                                    {data.approved_at && (
                                        <div>
                                            <div className="kv-label">Approved at</div>
                                            <div className="kv-value">{fmtDate(data.approved_at)}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="kv-label">Created by</div>
                                        <div className="kv-value">{data.created_by || '—'}</div>
                                    </div>
                                    {data.notes && (
                                        <div>
                                            <div className="kv-label">Notes</div>
                                            <div className="kv-value">{data.notes}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {data.line_items?.length > 0 && (
                                <div>
                                    <div className="ai-section-label" style={{ margin: '0 0 8px' }}>Line items</div>
                                    {data.line_items.map((li, i) => (
                                        <div className="line-item" key={i}>
                                            <div>
                                                <div className="line-item-title">{li.description}</div>
                                                <div className="line-item-qty">{li.quantity} × {money(li.unit_price, currency)}</div>
                                            </div>
                                            <div className="line-item-price">{money(li.amount, currency)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <div className="ai-section-label" style={{ margin: '0 0 8px' }}>Totals</div>
                                <div className="aiconv-kv">
                                    <div className="aiconv-kv-row"><span className="aiconv-kv-label">Subtotal</span><span className="aiconv-kv-val">{money(data.subtotal, currency)}</span></div>
                                    {data.discount > 0 && (
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Discount</span><span className="aiconv-kv-val">-{money(data.discount, currency)}</span></div>
                                    )}
                                    {data.tax_rate > 0 && (
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Tax ({data.tax_rate}%)</span><span className="aiconv-kv-val">{money(data.tax_amount, currency)}</span></div>
                                    )}
                                </div>
                                <div className="total-row large" style={{ marginTop: 8 }}>
                                    <span className="label">Total</span>
                                    <span className="val">{money(data.total, currency)}</span>
                                </div>
                            </div>

                            {transaction && (
                                <div>
                                    <div className="ai-section-label" style={{ margin: '0 0 8px' }}>Payment</div>
                                    <div className="aiconv-kv">
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Reference</span><span className="aiconv-kv-val">{transaction.retref}</span></div>
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Status</span><span className="aiconv-kv-val">{transaction.respstat === 'A' ? 'Approved' : transaction.resptext}</span></div>
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Card</span><span className="aiconv-kv-val">•••• {transaction.card_last_four}</span></div>
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Auth code</span><span className="aiconv-kv-val">{transaction.authcode}</span></div>
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Entry mode</span><span className="aiconv-kv-val">{transaction.entrymode}</span></div>
                                    </div>
                                </div>
                            )}

                            {commission && (
                                <div>
                                    <div className="ai-section-label" style={{ margin: '0 0 8px' }}>Commission</div>
                                    <div className="aiconv-kv">
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Gross</span><span className="aiconv-kv-val">{money(commission.gross_amount, currency)}</span></div>
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Commission ({commission.commission_rate}%)</span><span className="aiconv-kv-val">{money(commission.commission_amount, currency)}</span></div>
                                        <div className="aiconv-kv-row"><span className="aiconv-kv-label">Net to omnipay</span><span className="aiconv-kv-val">{money(commission.net_amount, currency)}</span></div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
