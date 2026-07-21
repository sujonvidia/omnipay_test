import { useState, useEffect, useMemo } from 'react';
import { LuX, LuPlus, LuSettings } from 'react-icons/lu';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const CURRENCIES = [
    { code: 'USD', label: 'USD - US Dollar', symbol: '$' },
    { code: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'CA$' },
    { code: 'EUR', label: 'EUR - Euro', symbol: '€' },
    { code: 'GBP', label: 'GBP - British Pound', symbol: '£' },
    { code: 'AUD', label: 'AUD - Australian Dollar', symbol: 'AU$' },
];

const TERMS = [
    { label: 'Due on receipt', days: 0 },
    { label: 'Net 7', days: 7 },
    { label: 'Net 14', days: 14 },
    { label: 'Net 30', days: 30 },
    { label: 'Net 45', days: 45 },
    { label: 'Net 60', days: 60 },
];

const emptyItem = () => ({ description: '', quantity: 1, unit_price: 0 });

const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };

export default function DocEditor({ mode, onClose, onCreated }) {
    const isInvoice = mode === 'invoice';
    const [customers, setCustomers] = useState([]);
    const [customerId, setCustomerId] = useState('');
    const [email, setEmail] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [items, setItems] = useState([emptyItem()]);
    const [notes, setNotes] = useState('');
    const [footer, setFooter] = useState('Thank you for your business!');
    const [testMode, setTestMode] = useState(false);

    // Invoice-only (payment collection)
    const [termsIdx, setTermsIdx] = useState(0);
    const [collectionMode, setCollectionMode] = useState('request');

    // Quote-only
    const [validUntil, setValidUntil] = useState(addDays(new Date(), 30).toISOString().slice(0, 10));
    const [terms, setTerms] = useState('');
    const [letChat, setLetChat] = useState(true);
    const [billInStages, setBillInStages] = useState(false);

    const [showPreview, setShowPreview] = useState(true);
    const [previewTab, setPreviewTab] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`${BASE}/v1/finance/customers`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setCustomers(j.data || []); })
            .catch(() => {});
    }, []);

    const customer = useMemo(() => customers.find(c => c._id === customerId), [customers, customerId]);

    useEffect(() => {
        if (customer) setEmail(customer.email || '');
    }, [customer]);

    const cur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    const money = (n) => `${cur.symbol}${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const setItem = (i, patch) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeItem = (i) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const addItem = () => setItems(prev => [...prev, emptyItem()]);

    const lineItems = items.map(it => ({
        description: it.description,
        quantity: parseFloat(it.quantity) || 0,
        unit_price: parseFloat(it.unit_price) || 0,
        amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
    }));
    const subtotal = lineItems.reduce((s, it) => s + it.amount, 0);
    const total = subtotal;

    const issueDate = new Date();
    const dueOrValidDate = isInvoice ? addDays(issueDate, TERMS[termsIdx].days) : new Date(validUntil);

    const canSubmit = !!customerId && lineItems.some(it => it.description.trim() && it.amount > 0);

    async function handleSubmit() {
        if (!canSubmit || saving) return;
        setSaving(true);
        setError('');
        try {
            const path = isInvoice ? '/v1/finance/invoices' : '/v1/finance/quotes';
            const body = isInvoice
                ? {
                    customer_id: customerId,
                    line_items: lineItems,
                    total,
                    due_date: dueOrValidDate.toISOString(),
                    notes,
                }
                : {
                    customer_id: customerId,
                    line_items: lineItems,
                    total,
                    valid_until: dueOrValidDate.toISOString(),
                    notes,
                    test_mode: testMode,
                };
            const r = await fetch(`${BASE}${path}`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!j.status) { setError(j.error || `Failed to create ${mode}`); return; }
            onCreated && onCreated(j);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const chargeableCustomers = isInvoice ? customers : customers.filter(c => true);

    return (
        <div className="editor">
            <div className="editor-top">
                <button type="button" className="editor-close" title="Close" onClick={onClose}>
                    <LuX size={16} />
                </button>
                <div className="editor-top-sep" />
                <div className="editor-top-title">{isInvoice ? 'Create invoice' : 'Create quote'}</div>
                <div className="editor-top-right">
                    <span className="editor-saved">Draft saved · {fmtDate(issueDate)}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(v => !v)}>
                        {showPreview ? 'Hide preview' : 'Show preview'}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || saving}>
                        {saving ? 'Saving…' : isInvoice ? 'Review invoice' : 'Save quote'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 20px', background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 13 }}>{error}</div>
            )}

            <div className="editor-body">
                <div className="editor-form">
                    <div className="editor-form-inner">
                        <div className="ed-section">
                            <div className="ed-section-title">Customer</div>
                            <div className="ed-label">Bill to</div>
                            <select className="ed-select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                                <option value="" disabled>Select a customer…</option>
                                {chargeableCustomers.map(c => (
                                    <option key={c._id} value={c._id} disabled={!isInvoice && !c.cardpointe_profile_id}>
                                        {c.name}{!isInvoice && !c.cardpointe_profile_id ? ' — no card on file' : ''}
                                    </option>
                                ))}
                            </select>
                            {!isInvoice && (
                                <div className="ed-hint">Only customers with a stored card can be charged — add one in Accounts first.</div>
                            )}
                            <div style={{ marginTop: 10 }}>
                                <div className="ed-label">Email</div>
                                <input className="ed-input" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                        </div>

                        <div className="ed-section">
                            <div className="ed-section-title">Currency</div>
                            <select className="ed-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                            <div className="ed-hint">Selecting a new currency updates all amounts on the {mode}.</div>
                        </div>

                        <div className="ed-section">
                            <div className="ed-section-title">Items</div>
                            <div className="ed-section-sub">Add one-time items to this {mode}.</div>
                            <div className="ed-item ed-item-head">
                                <div>Description</div>
                                <div>Qty</div>
                                <div>Unit price</div>
                                <div className="amt">Amount</div>
                                <div />
                            </div>
                            {items.map((it, i) => (
                                <div className="ed-item" key={i}>
                                    <input
                                        className="ed-input"
                                        placeholder="Item description"
                                        value={it.description}
                                        onChange={e => setItem(i, { description: e.target.value })}
                                    />
                                    <input
                                        className="ed-input"
                                        type="number" min="0"
                                        value={it.quantity}
                                        onChange={e => setItem(i, { quantity: e.target.value })}
                                    />
                                    <input
                                        className="ed-input"
                                        type="number" min="0"
                                        value={it.unit_price}
                                        onChange={e => setItem(i, { unit_price: e.target.value })}
                                    />
                                    <div className="amt">{money(lineItems[i].amount)}</div>
                                    <button type="button" className="ed-item-x" title="Remove" onClick={() => removeItem(i)}>
                                        <LuX size={13} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" className="tpl-add-btn" onClick={addItem}>
                                <LuPlus size={14} /> Add item
                            </button>
                            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                <div className="ed-totrow"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                                <div className="ed-totrow"><span className="text-tertiary">Tax</span><span className="text-tertiary">—</span></div>
                                <div className="ed-totrow total"><span>Total</span><span>{money(total)}</span></div>
                            </div>
                        </div>

                        {isInvoice ? (
                            <div className="ed-section">
                                <div className="ed-section-title">Payment collection</div>
                                <div className={`ed-radio ${collectionMode === 'request' ? 'active' : ''}`} onClick={() => setCollectionMode('request')}>
                                    <div className="ed-radio-dot" />
                                    <div>
                                        <div className="ed-radio-title">Request payment</div>
                                        <div className="ed-radio-sub">Create an invoice requesting payment on a specific date</div>
                                        {collectionMode === 'request' && (
                                            <div style={{ marginTop: 10, maxWidth: 220 }}>
                                                <select className="ed-select" value={termsIdx} onChange={e => setTermsIdx(Number(e.target.value))}>
                                                    {TERMS.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`ed-radio ${collectionMode === 'multiple' ? 'active' : ''}`} onClick={() => setCollectionMode('multiple')}>
                                    <div className="ed-radio-dot" />
                                    <div>
                                        <div className="ed-radio-title">Request in multiple payments</div>
                                        <div className="ed-radio-sub">Set up a payment plan for your customer to pay over time</div>
                                    </div>
                                </div>
                                <div className={`ed-radio ${collectionMode === 'autocharge' ? 'active' : ''}`} onClick={() => setCollectionMode('autocharge')}>
                                    <div className="ed-radio-dot" />
                                    <div>
                                        <div className="ed-radio-title">Autocharge customer</div>
                                        <div className="ed-radio-sub">Automatically charge a payment method on file</div>
                                    </div>
                                </div>
                                <div className="flex gap-1" style={{ marginTop: 12 }}>
                                    <span className="badge gray">Card</span>
                                    <span className="badge gray">ACH</span>
                                    <span className="badge gray">Link</span>
                                    <span className="badge gray">Klarna</span>
                                </div>
                            </div>
                        ) : (
                            <div className="ed-section">
                                <div className="ed-section-title">Quote settings</div>
                                <div className="ed-label">Valid until</div>
                                <input className="ed-input" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                                <div style={{ marginTop: 12 }}>
                                    <div className="ed-label">Terms &amp; conditions</div>
                                    <textarea
                                        className="ed-input"
                                        placeholder="Payment terms, validity, warranties…"
                                        style={{ minHeight: 64 }}
                                        value={terms}
                                        onChange={e => setTerms(e.target.value)}
                                    />
                                </div>
                                <label className="ed-check" style={{ marginTop: 10 }}>
                                    <input type="checkbox" checked={letChat} onChange={e => setLetChat(e.target.checked)} />
                                    Let the customer chat with us before accepting
                                </label>
                                <label className="ed-check">
                                    <input type="checkbox" checked={testMode} onChange={e => setTestMode(e.target.checked)} />
                                    Test mode — skip the real CardPointe charge
                                </label>
                                <div className="ed-hint">Customers accept by signing on the acceptance page. No payment is collected on a quote — converting an approved quote charges the card on file.</div>
                            </div>
                        )}

                        {isInvoice ? (
                            <div className="ed-section">
                                <div className="ed-section-title">Additional options</div>
                                <div className="ed-section-sub">Customize your invoice with extra fields.</div>
                                <div className="ed-label">Memo</div>
                                <textarea className="ed-input" placeholder="Add a note for your customer…" style={{ minHeight: 56 }} value={notes} onChange={e => setNotes(e.target.value)} />
                                <div style={{ marginTop: 10 }}>
                                    <div className="ed-label">Footer</div>
                                    <input className="ed-input" value={footer} onChange={e => setFooter(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div className="ed-section">
                                <div className="ed-section-title">Payment schedule</div>
                                <div className="ed-section-sub">Break the scope into stages, phases, or deposits. Each stage becomes a future invoice issued when its condition is met.</div>
                                <label className="ed-check">
                                    <input type="checkbox" checked={billInStages} onChange={e => setBillInStages(e.target.checked)} />
                                    Bill this quote in stages
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {showPreview && (
                    <div className="editor-preview">
                        <div className="pv-head">
                            <span className="pv-title">Preview</span>
                            <LuSettings size={14} />
                        </div>
                        <div className="text-tertiary" style={{ fontSize: 12.5 }}>
                            This is how your {mode} will look to the customer.
                        </div>
                        <div className="pv-tabs">
                            {[isInvoice ? 'Invoice PDF' : 'Quote PDF', 'Email', isInvoice ? 'Payment page' : 'Acceptance page'].map((t, i) => (
                                <div key={t} className={`pv-tab ${previewTab === i ? 'active' : ''}`} onClick={() => setPreviewTab(i)}>{t}</div>
                            ))}
                        </div>

                        {previewTab !== 0 ? (
                            <div style={{ padding: '32px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                                {previewTab === 1 ? 'Email preview coming soon.' : 'Customer-facing page preview coming soon.'}
                            </div>
                        ) : (
                            <div className="paper">
                                <div className="paper-top">
                                    <div className="paper-doctype">{isInvoice ? 'Invoice' : 'Quote'}</div>
                                    <div className="paper-brand">Northstar<span>Industrial</span></div>
                                </div>
                                <div className="paper-meta">
                                    <div className="k">{isInvoice ? 'Invoice number' : 'Quote number'}</div>
                                    <div>{isInvoice ? 'INV-DRAFT' : 'Q-DRAFT'}</div>
                                    <div className="k">Date of issue</div>
                                    <div>{fmtDate(issueDate)}</div>
                                    <div className="k">{isInvoice ? 'Date due' : 'Valid until'}</div>
                                    <div>{fmtDate(dueOrValidDate)}</div>
                                </div>
                                <div className="paper-parties">
                                    <div>
                                        <div className="lbl">Northstar Industrial</div>
                                        <div className="ln">68 Tycos Drive, Unit 1</div>
                                        <div className="ln">North York, Ontario M6B 1V9</div>
                                        <div className="ln">Canada</div>
                                        <div className="ln">billing@northstar-ind.com</div>
                                    </div>
                                    <div>
                                        <div className="lbl">Bill to</div>
                                        <div className="ln">{customer?.name || 'Select a customer'}</div>
                                        <div className="ln">{email || '—'}</div>
                                    </div>
                                </div>
                                <div className="paper-due">
                                    {money(total)} {isInvoice ? `due ${fmtDate(dueOrValidDate)}` : `· valid until ${fmtDate(dueOrValidDate)}`}
                                </div>
                                <table className="paper-table">
                                    <thead>
                                        <tr><th>Description</th><th className="r">Qty</th><th className="r">Unit price</th><th className="r">Amount</th></tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.filter(it => it.description.trim()).map((it, i) => (
                                            <tr key={i}>
                                                <td>{it.description}</td>
                                                <td className="r">{it.quantity}</td>
                                                <td className="r">{money(it.unit_price)}</td>
                                                <td className="r">{money(it.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="paper-sum">
                                    <div className="paper-sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                                    <div className="paper-sum-row"><span>Total</span><span>{money(total)}</span></div>
                                    <div className="paper-sum-row total">
                                        <span>{isInvoice ? 'Amount due' : 'Quote total'}</span><span>{money(total)}</span>
                                    </div>
                                </div>
                                <div className="paper-foot">{footer}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
