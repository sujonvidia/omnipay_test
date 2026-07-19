import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowLeft, FiCheck, FiLoader } from 'react-icons/fi';
import { setUser } from '../../store/messageSlice';
import { gql, MUTATIONS } from '../../lib/graphqlClient';

export default function FinanceProfile() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((s) => s.message.user);

    const [form, setForm] = useState({ firstname: user?.firstname || '', lastname: user?.lastname || '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const initials = `${(form.firstname || '').charAt(0)}${(form.lastname || '').charAt(0)}`.toUpperCase() || 'U';
    const isChanged = form.firstname !== (user?.firstname || '') || form.lastname !== (user?.lastname || '');

    const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!form.firstname.trim()) { setError('First name is required.'); return; }

        setSaving(true);
        try {
            const data = await gql(MUTATIONS.updateUser, { input: form }, 'update_user');
            const result = data.update_user;
            if (!result.status) { setError(result.message || 'Could not update profile.'); return; }
            dispatch(setUser({ ...user, ...result.data }));
            setSuccess('Profile updated.');
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className='page-main compact'>
            <div className='page-head flex items-center gap-3'>
                <button
                    type='button'
                    onClick={() => navigate(-1)}
                    aria-label='Back'
                    className='flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition shrink-0'
                >
                    <FiArrowLeft size={15} />
                </button>
                <div>
                    <div className='page-head-title'>Edit profile</div>
                    <div className='page-head-sub'>Your personal account details</div>
                </div>
            </div>

            <div className='card' style={{ maxWidth: 480 }}>
                <div className='flex items-center gap-4 mb-6'>
                    <span className='avatar avatar-lg' style={{ background: 'var(--primary)' }}>{initials}</span>
                    <div>
                        <p className='row-title'>{user?.firstname} {user?.lastname}</p>
                        <p className='row-sub'>{user?.role || 'Member'}</p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className='flex flex-col gap-4'>
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <label className='kv-label' htmlFor='firstname'>First name</label>
                            <input
                                id='firstname'
                                name='firstname'
                                value={form.firstname}
                                onChange={onChange}
                                required
                                className='w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition'
                            />
                        </div>
                        <div>
                            <label className='kv-label' htmlFor='lastname'>Last name</label>
                            <input
                                id='lastname'
                                name='lastname'
                                value={form.lastname}
                                onChange={onChange}
                                className='w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition'
                            />
                        </div>
                    </div>

                    <div>
                        <label className='kv-label' htmlFor='email'>Email</label>
                        <input
                            id='email'
                            value={user?.email || ''}
                            readOnly
                            className='w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-sm text-[var(--text-tertiary)] cursor-not-allowed'
                        />
                    </div>

                    {error && <p className='text-xs text-red-500'>{error}</p>}
                    {success && <p className='text-xs text-green-600 flex items-center gap-1'><FiCheck size={12} /> {success}</p>}

                    <button
                        type='submit'
                        disabled={saving || !isChanged}
                        className='btn btn-primary btn-block mt-1'
                    >
                        {saving ? <FiLoader size={14} className='animate-spin' /> : <FiCheck size={14} />}
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </form>
            </div>
        </main>
    );
}
