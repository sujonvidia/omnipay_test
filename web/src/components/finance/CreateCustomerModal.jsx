import { useState, useRef } from 'react';
import { LuX, LuChevronRight } from 'react-icons/lu';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Ireland', 'Netherlands'];
const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD'];
const PAYMENT_TERMS = [
    { value: 'due_on_receipt', label: 'Due on receipt' },
    { value: 'net15', label: 'Net 15' },
    { value: 'net30', label: 'Net 30' },
    { value: 'net45', label: 'Net 45' },
    { value: 'net60', label: 'Net 60' },
];

function Collapsible({ title, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ marginTop: 22 }}>
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: open ? 14 : 0 }}
                onClick={() => setOpen(v => !v)}
            >
                <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
                <span style={{ display: 'inline-flex', transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', color: 'var(--text-tertiary)' }}>
                    <LuChevronRight size={14} />
                </span>
            </div>
            {open && children}
        </div>
    );
}

export default function CreateCustomerModal({ onClose, onCreated }) {
    const overlayRef = useRef(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [language, setLanguage] = useState('English (United States)');
    const [moreOpen, setMoreOpen] = useState(false);
    const [contactName, setContactName] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('net30');
    const [creditLimit, setCreditLimit] = useState('');
    const [notes, setNotes] = useState('');

    const [billingSameAsCustomer, setBillingSameAsCustomer] = useState(true);
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [currency, setCurrency] = useState('');

    const [timezone, setTimezone] = useState('');
    const [taxStatus, setTaxStatus] = useState('Taxable');
    const [taxIdType, setTaxIdType] = useState('ID type');
    const [taxId, setTaxId] = useState('');
    const [shipSameAsBilling, setShipSameAsBilling] = useState(true);
    const [template, setTemplate] = useState('');
    const [prefix, setPrefix] = useState('');
    const [nextSeq, setNextSeq] = useState(1);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function handleOverlayClick(e) {
        if (e.target === overlayRef.current) onClose();
    }

    async function handleSubmit() {
        if (!name.trim() || saving) return;
        setSaving(true);
        setError('');
        try {
            const r = await fetch(`${BASE}/v1/finance/customers`, {
                method: 'POST',
                credentials: 'include',
                headers: { ...authH(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email,
                    phone,
                    address: country ? { country } : undefined,
                    currency: currency || undefined,
                    contact_name: contactName || undefined,
                    payment_terms: paymentTerms,
                    credit_limit: creditLimit ? parseFloat(creditLimit) : undefined,
                    notes: notes || undefined,
                }),
            });
            const j = await r.json();
            if (!j.status) { setError(j.error || 'Failed to create customer'); return; }
            onCreated && onCreated(j.data);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    }

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            onKeyDown={handleKeyDown}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 21, 0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, width: 480, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Create customer</div>
                        <button className="topbar-icon" style={{ width: 32, height: 32 }} onClick={onClose}>
                            <LuX size={14} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: 24 }}>
                    {error && (
                        <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 12.5, borderRadius: 8 }}>{error}</div>
                    )}

                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Customer information</div>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Name</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Customer display name; appears on invoices.</div>
                        <input className="ed-input" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Email</div>
                        <input className="ed-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Language</div>
                        <select className="ed-select" value={language} onChange={e => setLanguage(e.target.value)}>
                            {['English (United States)', 'English (United Kingdom)', 'French (Canada)', 'German', 'Spanish', 'Dutch'].map(l => (
                                <option key={l}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div
                        style={{ color: 'var(--primary)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setMoreOpen(v => !v)}
                    >
                        More options
                        <span style={{ display: 'inline-flex', transform: moreOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}>
                            <LuChevronRight size={12} />
                        </span>
                    </div>

                    {moreOpen && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Contact name</div>
                                <input className="ed-input" value={contactName} onChange={e => setContactName(e.target.value)} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Payment terms</div>
                                <select className="ed-select" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                                    {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Credit limit</div>
                                <input className="ed-input" type="number" min="0" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Notes</div>
                                <textarea className="ed-input" style={{ minHeight: 56 }} value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <Collapsible title="Billing information">
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Billing email</div>
                            <label className="ed-check" style={{ marginBottom: 0 }}>
                                <input type="checkbox" checked={billingSameAsCustomer} onChange={e => setBillingSameAsCustomer(e.target.checked)} />
                                Same as customer email
                            </label>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Billing details</div>
                            <select className="ed-select" value={country} onChange={e => setCountry(e.target.value)}>
                                <option value="">Choose a country…</option>
                                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <input className="ed-input" placeholder="+1 (506) 234-5678" value={phone} onChange={e => setPhone(e.target.value)} style={{ marginTop: 8 }} />
                        </div>
                    </Collapsible>

                    <div style={{ marginTop: 22 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Currency</div>
                        <select className="ed-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                            <option value="">Choose a currency…</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c} - {c === 'USD' ? 'US Dollar' : c === 'CAD' ? 'Canadian Dollar' : c === 'EUR' ? 'Euro' : c === 'GBP' ? 'British Pound' : 'Australian Dollar'}</option>)}
                        </select>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Time zone</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Used for invoice dates and times</div>
                        <select className="ed-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                            <option value="">Choose a time zone…</option>
                            {['(GMT-08:00) Pacific Time', '(GMT-07:00) Mountain Time', '(GMT-06:00) Central Time', '(GMT-05:00) Eastern Time', '(GMT+00:00) UTC', '(GMT+01:00) Central European Time'].map(t => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <Collapsible title="Tax information">
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Tax status</div>
                            <select className="ed-select" value={taxStatus} onChange={e => setTaxStatus(e.target.value)}>
                                {['Taxable', 'Reverse charge', 'Exempt', 'Tax exempt (non-profit)'].map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Tax ID</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select className="ed-select" style={{ width: 130 }} value={taxIdType} onChange={e => setTaxIdType(e.target.value)}>
                                    {['ID type', 'US EIN', 'CA BN', 'EU VAT', 'GB VAT', 'AU ABN'].map(t => <option key={t}>{t}</option>)}
                                </select>
                                <input className="ed-input" value={taxId} onChange={e => setTaxId(e.target.value)} style={{ flex: 1 }} />
                            </div>
                        </div>
                    </Collapsible>

                    <Collapsible title="Shipping information">
                        <label className="ed-check" style={{ marginBottom: 0 }}>
                            <input type="checkbox" checked={shipSameAsBilling} onChange={e => setShipSameAsBilling(e.target.checked)} />
                            Same as billing details
                        </label>
                    </Collapsible>

                    <Collapsible title="Invoice settings">
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Default invoice template</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Applied to all future invoices sent to this customer.</div>
                            <select className="ed-select" value={template} onChange={e => setTemplate(e.target.value)}>
                                <option value="">Select a template…</option>
                                <option value="Standard Invoice Template">Standard Invoice Template</option>
                                <option value="Milestone Invoice Template">Milestone Invoice Template</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Invoice prefix</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>3–12 letters or numbers, unique per customer.</div>
                            <input className="ed-input" maxLength={12} value={prefix} onChange={e => setPrefix(e.target.value)} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Next invoice sequence</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Your next invoice will end with this number.</div>
                            <input className="ed-input" type="number" min="1" value={nextSeq} onChange={e => setNextSeq(e.target.value)} />
                        </div>
                    </Collapsible>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim() || saving}>
                        {saving ? 'Adding…' : 'Add customer'}
                        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.22)', borderRadius: 4, padding: '1px 6px', fontSize: 11, marginLeft: 4, fontWeight: 600 }}>ctrl</span>
                        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.22)', borderRadius: 4, padding: '1px 6px', fontSize: 11, marginLeft: 4, fontWeight: 600 }}>enter</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
