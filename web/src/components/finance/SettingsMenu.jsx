import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiUser, FiCreditCard, FiLogOut } from 'react-icons/fi';
import { LuPalette } from 'react-icons/lu';
import { clearUser } from '../../store/messageSlice';
import { gql, MUTATIONS } from '../../lib/graphqlClient';
import { applyTheme, getStoredTheme } from '../../lib/theme';
import ThemePicker from './ThemePicker';

const rowCls = 'flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer transition-colors';
const iconCls = 'text-[var(--text-tertiary)] shrink-0';

export default function SettingsMenu({ user, onClose, onOpenPaymentProfile }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const menuRef = useRef(null);
    const [themePickerOpen, setThemePickerOpen] = useState(false);
    const [theme, setTheme] = useState(getStoredTheme);
    // ThemePicker renders its swatches through a portal to document.body, so
    // a click on one is never "inside" menuRef. Track open state in a ref the
    // outside-click/Escape handlers can read without re-binding, and skip
    // closing while it's open — otherwise the mousedown on a swatch closes
    // (unmounts) this whole menu before the swatch's own click ever fires.
    const themePickerOpenRef = useRef(false);
    themePickerOpenRef.current = themePickerOpen;

    useEffect(() => {
        const onDocClick = (e) => {
            if (themePickerOpenRef.current) return;
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        const onKeyDown = (e) => {
            if (themePickerOpenRef.current) return;
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    const initials = user
        ? `${(user.firstname || '').charAt(0)}${(user.lastname || '').charAt(0)}`.toUpperCase() || 'U'
        : 'U';

    const goEditProfile = () => {
        onClose();
        navigate('/connect/finance/profile');
    };

    const openPaymentProfile = () => {
        onClose();
        onOpenPaymentProfile();
    };

    const openTheme = () => {
        setThemePickerOpen(true);
    };

    const onThemeChange = (key) => {
        setTheme(applyTheme(key));
        setThemePickerOpen(false);
        onClose();
    };

    const signOut = async () => {
        try {
            await gql(MUTATIONS.logout, undefined, 'logout');
        } catch (_) { /* best-effort — clearing local state below is what matters */ }
        localStorage.removeItem('token');
        dispatch(clearUser());
        navigate('/login');
    };

    return (
        <>
            <div
                ref={menuRef}
                className='absolute right-0 top-[calc(100%+8px)] z-[500] w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.15),0_8px_10px_-6px_rgb(0_0_0_/_0.1)] overflow-hidden'
            >
                <div className='flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]'>
                    <span className='flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary-tint-strong)] text-[var(--primary-hover)] text-sm font-semibold shrink-0'>
                        {initials}
                    </span>
                    <div className='min-w-0'>
                        <p className='text-sm font-semibold truncate'>{user?.firstname} {user?.lastname}</p>
                        <p className='text-xs text-[var(--text-tertiary)] truncate'>{user?.email}</p>
                    </div>
                </div>

                <div className='p-1.5'>
                    <button type='button' className={rowCls} onClick={goEditProfile}>
                        <FiUser size={15} className={iconCls} />
                        Edit profile
                    </button>
                    <button type='button' className={rowCls} onClick={openPaymentProfile}>
                        <FiCreditCard size={15} className={iconCls} />
                        Payment profile
                    </button>
                    <button type='button' className={rowCls} onClick={openTheme}>
                        <LuPalette size={15} className={iconCls} />
                        <span className='flex-1 text-left'>Theme</span>
                    </button>

                    <div className='mx-2 my-1.5 h-px bg-[var(--border)]' />

                    <button
                        type='button'
                        onClick={signOut}
                        className='flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors'
                    >
                        <FiLogOut size={15} className='shrink-0' />
                        Sign out
                    </button>
                </div>
            </div>

            <ThemePicker
                value={theme}
                onChange={onThemeChange}
                open={themePickerOpen}
                onClose={() => setThemePickerOpen(false)}
            />
        </>
    );
}
