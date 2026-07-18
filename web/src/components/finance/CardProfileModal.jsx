import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { FiX, FiCreditCard, FiTrash2, FiEdit2, FiPlus, FiCheck, FiLoader } from 'react-icons/fi';

const BASE = import.meta.env.VITE_BASE_URL || '';
// Same Bearer JWT every other finance call uses — never ship merchant
// credentials to the browser (the Workfreeli original did this via
// VITE_CARDPOINTE_USERNAME/PASSWORD Basic auth; fixed here).
const authH = () => ({
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    'Content-Type': 'application/json',
});

// Truly empty — the "no profile yet" screen must not look pre-filled with
// someone else's (fake demo) card data as if it were the customer's own.
const EMPTY_FORM = {
    account: '', expiry: '', name: '', email: '', phone: '', postal: '',
    address: '', city: '', region: '', country: '', company: '', currency: 'USD',
};

export default function CardProfileModal({ onClose }) {
    const user = useSelector(s => s.message.user);
    const [profile, setProfile] = useState(null);   // null = loading, false = no profile, object = has profile
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('view');        // 'view' | 'create' | 'update' | 'delete'
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const overlayRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        setLoading(true);
        try {
            const uid = user?.id || '';
            const r = await fetch(`${BASE}/v1/finance/cardpointe/my-profile?user_id=${uid}`, { headers: authH(), credentials: 'include' });
            const d = await r.json();
            if (d.status && d.has_profile) {
                setProfile(d);
                setMode('view');
            } else {
                setProfile(false);
                setMode('create');
            }
        } catch (_) {
            setProfile(false);
            setMode('create');
        } finally {
            setLoading(false);
        }
    }

    function handleOverlayClick(e) {
        if (e.target === overlayRef.current) onClose();
    }

    function handleInput(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!form.account) { setError('Card token / account number required'); return; }
        setSaving(true);
        try {
            const r = await fetch(`${BASE}/v1/finance/cardpointe/my-profile`, {
                method: 'POST',
                headers: authH(),
                credentials: 'include',
                body: JSON.stringify({ ...form, currency: form.currency || 'USD', user_id: user?.id || '' }),
            });
            const d = await r.json();
            if (!d.status) { setError(d.error || 'Failed'); return; }
            const cardNote = d.card_valid ? 'card validated' : `card note: ${d.resptext || 'not validated'}`;
            setSuccess(`Profile ${mode === 'create' ? 'created' : 'updated'} — ID: ${d.profileid} / ${d.acctid} (${cardNote})`);
            await fetchProfile();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setError('');
        setSaving(true);
        try {
            const uid = user?.id || '';
            const r = await fetch(`${BASE}/v1/finance/cardpointe/my-profile?user_id=${uid}`, {
                method: 'DELETE',
                headers: authH(),
                credentials: 'include',
            });
            const d = await r.json();
            if (!d.status) { setError(d.error || 'Delete failed'); return; }
            setProfile(false);
            setMode('create');
            setSuccess('Profile deleted');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function startUpdate() {
        const _raw = profile?.cardpointe_data;
        const cp = Array.isArray(_raw) ? _raw[0] : _raw;
        setForm({
            account:  '',
            expiry:   cp?.expiry   || '',
            name:     cp?.name     || '',
            email:    cp?.email    || '',
            phone:    cp?.phone    || '',
            postal:   cp?.postal   || '',
            address:  cp?.address  || '',
            city:     cp?.city     || '',
            region:   cp?.region   || '',
            country:  cp?.country  || '',
            company:  cp?.company  || '',
            currency: cp?.currency || 'USD',
        });
        setError('');
        setSuccess('');
        setMode('update');
    }

    const _cpRaw = profile?.cardpointe_data;
    const liveData = Array.isArray(_cpRaw) ? _cpRaw[0] : _cpRaw;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className='fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm'
        >
            <div className='relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl bg-white dark:bg-[#1e1e2e] border border-black/10 dark:border-white/10 overflow-hidden'>

                {/* Header */}
                <div className='flex items-center gap-3 px-5 py-4 border-b border-black/8 dark:border-white/8'>
                    <FiCreditCard size={18} className='text-[var(--primary)]' />
                    <span className='font-semibold text-sm'>Payment Profile</span>
                    <div className='flex-1' />
                    <button onClick={onClose} className='flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/8 dark:hover:bg-white/8 transition'>
                        <FiX size={15} />
                    </button>
                </div>

                <div className='px-5 py-4 max-h-[80vh] overflow-y-auto'>
                    {loading && (
                        <div className='flex items-center justify-center py-10 gap-2 text-sm text-gray-400'>
                            <FiLoader size={16} className='animate-spin' /> Loading profile…
                        </div>
                    )}

                    {!loading && mode === 'view' && profile && (
                        <div className='space-y-4'>
                            {/* Card visual */}
                            <div className='rounded-xl bg-gradient-to-br from-[var(--primary)] to-indigo-600 p-4 text-white'>
                                <div className='flex items-center justify-between mb-3'>
                                    <span className='text-xs opacity-60 tracking-widest uppercase'>Stored Card</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${liveData?.defaultacct === 'Y' ? 'bg-white/20' : 'bg-white/10 opacity-60'}`}>
                                        {liveData?.defaultacct === 'Y' ? 'Default' : 'Alt'}
                                    </span>
                                </div>
                                <div className='font-mono text-xl tracking-widest mb-3'>
                                    •••• •••• •••• {liveData?.token?.slice(-4) || '****'}
                                </div>
                                <div className='flex items-end justify-between text-xs opacity-80'>
                                    <div>
                                        <div className='opacity-60 mb-0.5'>Cardholder</div>
                                        <div className='font-medium'>{liveData?.name || '—'}</div>
                                    </div>
                                    <div className='text-right'>
                                        <div className='opacity-60 mb-0.5'>Expires</div>
                                        <div className='font-medium font-mono'>
                                            {liveData?.expiry ? `${liveData.expiry.slice(0,2)}/${liveData.expiry.slice(2)}` : '—'}
                                        </div>
                                    </div>
                                    {liveData?.company && (
                                        <div className='text-right'>
                                            <div className='opacity-60 mb-0.5'>Company</div>
                                            <div className='font-medium'>{liveData.company}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact info */}
                            {(liveData?.email || liveData?.phone) && (
                                <Section title='Contact'>
                                    {liveData?.email && <InfoRow label='Email' value={liveData.email} />}
                                    {liveData?.phone && <InfoRow label='Phone' value={liveData.phone} />}
                                </Section>
                            )}

                            {/* Billing address */}
                            {(liveData?.address || liveData?.city || liveData?.postal) && (
                                <Section title='Billing Address'>
                                    {liveData?.address && <InfoRow label='Address' value={liveData.address} />}
                                    {(liveData?.city || liveData?.region) && (
                                        <div className='grid grid-cols-2 gap-2'>
                                            <InfoRow label='City'  value={liveData.city} />
                                            <InfoRow label='State' value={liveData.region} />
                                        </div>
                                    )}
                                    {(liveData?.postal || liveData?.country) && (
                                        <div className='grid grid-cols-2 gap-2'>
                                            <InfoRow label='Postal'  value={liveData.postal} />
                                            <InfoRow label='Country' value={liveData.country} />
                                        </div>
                                    )}
                                </Section>
                            )}

                            {/* Card flags — always show when liveData present */}
                            {liveData && (
                                <Section title='Card Settings'>
                                    <div className='flex gap-2 flex-wrap'>
                                        <Flag label='Default Acct'  value={liveData.defaultacct} />
                                        <Flag label='COF Permission' value={liveData.cofpermission} />
                                        <Flag label='GSA Card'       value={liveData.gsacard} />
                                        {liveData.auoptout && <Flag label='AU Opt-out' value={liveData.auoptout} />}
                                    </div>
                                </Section>
                            )}

                            {/* Profile IDs */}
                            <Section title='Profile'>
                                <div className='text-xs space-y-1.5'>
                                    <InfoRow label='Profile ID' value={profile.cardpointe_profile_id} mono />
                                    <InfoRow label='Acct ID'    value={profile.cardpointe_acct_id} mono />
                                    {liveData?.token && <InfoRow label='Token' value={liveData.token} mono />}
                                    {liveData?.accttype && <InfoRow label='Type' value={liveData.accttype} />}
                                    <InfoRow label='Source' value={profile.source} colorClass={profile.source === 'live' ? 'text-green-500' : 'text-amber-500'} />
                                </div>
                            </Section>

                            {/* Actions */}
                            <div className='flex gap-2 pt-1'>
                                <button
                                    onClick={startUpdate}
                                    className='flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)]/8 transition'
                                >
                                    <FiEdit2 size={13} /> Update Card
                                </button>
                                <button
                                    onClick={() => { setMode('delete'); setError(''); setSuccess(''); }}
                                    className='flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition'
                                >
                                    <FiTrash2 size={13} /> Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && mode === 'delete' && (
                        <div className='text-center py-4'>
                            <FiTrash2 size={32} className='mx-auto text-red-400 mb-3' />
                            <p className='text-sm font-medium mb-1'>Delete payment profile?</p>
                            <p className='text-xs text-gray-400 mb-6'>Removes stored card from CardPointe. Cannot be undone.</p>
                            {error && <p className='text-xs text-red-500 mb-3'>{error}</p>}
                            <div className='flex gap-2 justify-center'>
                                <button
                                    onClick={() => setMode('view')}
                                    className='px-4 py-2 rounded-lg border text-sm hover:bg-black/5 transition'
                                >Cancel</button>
                                <button
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className='px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50'
                                >
                                    {saving ? 'Deleting…' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && (mode === 'create' || mode === 'update') && (
                        <form onSubmit={handleSave} className='space-y-3'>
                            <p className='text-xs text-gray-400 mb-2'>
                                {mode === 'create'
                                    ? 'No payment profile yet. Enter card details to create one.'
                                    : 'Enter new card token to update the stored card.'}
                            </p>

                            <Field label='Card Token / Account *' name='account' value={form.account} onChange={handleInput} placeholder='4111111111111111 (UAT test PAN)' />
                            <Field label='Expiry (MMYY) *' name='expiry' value={form.expiry} onChange={handleInput} placeholder='1228' maxLength={4} />

                            <div className='grid grid-cols-2 gap-3'>
                                <Field label='Name' name='name' value={form.name} onChange={handleInput} placeholder='Joe Cardholder' />
                                <Field label='Email' name='email' value={form.email} onChange={handleInput} placeholder='joe@co.com' />
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <Field label='Phone' name='phone' value={form.phone} onChange={handleInput} placeholder='555-000-0000' />
                                <Field label='Postal' name='postal' value={form.postal} onChange={handleInput} placeholder='19355' />
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <Field label='Address' name='address' value={form.address} onChange={handleInput} placeholder='1000 Continental Dr.' />
                                <Field label='Company' name='company' value={form.company} onChange={handleInput} placeholder='Express Services' />
                            </div>
                            <div className='grid grid-cols-3 gap-3'>
                                <Field label='City' name='city' value={form.city} onChange={handleInput} />
                                <Field label='State' name='region' value={form.region} onChange={handleInput} placeholder='PA' />
                                <Field label='Country' name='country' value={form.country} onChange={handleInput} placeholder='US' />
                            </div>
                            <Field label='Currency' name='currency' value={form.currency} onChange={handleInput} placeholder='USD' maxLength={3} />

                            {error   && <p className='text-xs text-red-500'>{error}</p>}
                            {success && <p className='text-xs text-green-500 flex items-center gap-1'><FiCheck size={12} /> {success}</p>}

                            <div className='flex gap-2 pt-1'>
                                {mode === 'update' && (
                                    <button type='button' onClick={() => setMode('view')} className='flex-1 py-2 rounded-lg border text-sm hover:bg-black/5 transition'>
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type='submit'
                                    disabled={saving}
                                    className='flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50'
                                >
                                    {saving ? <FiLoader size={14} className='animate-spin' /> : mode === 'create' ? <FiPlus size={14} /> : <FiCheck size={14} />}
                                    {saving ? 'Saving…' : mode === 'create' ? 'Create Profile' : 'Update Profile'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <div className='text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2'>{title}</div>
            <div className='rounded-lg border border-black/8 dark:border-white/8 px-3 py-2 space-y-1.5'>
                {children}
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono, colorClass }) {
    if (!value && value !== 0) return null;
    return (
        <div className='flex items-center justify-between gap-4 text-xs'>
            <span className='text-gray-400 shrink-0'>{label}</span>
            <span className={`truncate text-right ${mono ? 'font-mono' : ''} ${colorClass || 'text-gray-700 dark:text-gray-200'}`}>{value}</span>
        </div>
    );
}

function Row2({ left, right }) {
    return (
        <div className='grid grid-cols-2 gap-2'>
            <InfoRow label={left[0]}  value={left[1]} />
            <InfoRow label={right[0]} value={right[1]} />
        </div>
    );
}

function Flag({ label, value }) {
    const on = value === 'Y';
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${on ? 'border-green-400/50 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'border-black/10 dark:border-white/10 text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-300'}`} />
            {label}: {value || 'N'}
        </span>
    );
}

function Field({ label, name, value, onChange, placeholder, maxLength }) {
    return (
        <div>
            <label className='block text-xs text-gray-400 mb-1'>{label}</label>
            <input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder || ''}
                maxLength={maxLength}
                className='w-full text-sm px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:border-[var(--primary)] transition'
            />
        </div>
    );
}
