import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiFileText, FiActivity, FiCreditCard, FiSettings, FiMail } from 'react-icons/fi';

const TOPICS = [
    { Icon: FiFileText, title: 'Creating a quote', body: 'Pick a customer with a card on file, enter the total, and it auto-charges on save.', href: '/connect/finance/quotes' },
    { Icon: FiUsers, title: 'Adding a customer card', body: 'Add a new card, or import an existing CardPointe profile by profile/account ID.', href: '/connect/finance/accounts' },
    { Icon: FiActivity, title: 'Tracking activity', body: 'Approvals, overdue invoices, and recent payments all surface on the Activity page.', href: '/connect/finance/activity' },
    { Icon: FiCreditCard, title: 'Your payment profile', body: 'Add or update your own card from the avatar menu → Payment profile.', href: '/connect/finance/home' },
    { Icon: FiSettings, title: 'Commission rate', body: 'The revenue-split percentage taken per charge is configurable in Settings.', href: '/connect/finance/settings' },
];

export default function HelpMenu({ onClose }) {
    const navigate = useNavigate();
    const menuRef = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    const goTo = (href) => { onClose(); navigate(href); };

    return (
        <div
            ref={menuRef}
            className='absolute right-0 top-[calc(100%+8px)] z-[500] w-80 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.15),0_8px_10px_-6px_rgb(0_0_0_/_0.1)] overflow-hidden'
        >
            <div className='px-4 py-3 border-b border-[var(--border)] font-semibold text-sm'>Help &amp; tips</div>
            <div className='max-h-96 overflow-y-auto p-1.5'>
                {TOPICS.map((t) => (
                    <button
                        key={t.title}
                        type='button'
                        onClick={() => goTo(t.href)}
                        className='flex w-full items-start gap-2.5 px-3 py-2.5 text-left rounded-lg hover:bg-[var(--bg-hover)] transition-colors'
                    >
                        <span className='flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-[var(--primary-tint-strong)] text-[var(--primary-hover)]'>
                            <t.Icon size={14} />
                        </span>
                        <span className='min-w-0 flex-1'>
                            <span className='block text-[13px] font-medium'>{t.title}</span>
                            <span className='block text-xs text-[var(--text-tertiary)]'>{t.body}</span>
                        </span>
                    </button>
                ))}
            </div>
            <a
                href='mailto:support@omnipay.app'
                className='flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-[13px] font-medium text-[var(--primary)] border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors'
            >
                <FiMail size={14} /> Contact support
            </a>
        </div>
    );
}
