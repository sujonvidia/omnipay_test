import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiFileText, FiCheckCircle, FiXCircle, FiPercent, FiInbox } from 'react-icons/fi';
import { useRecentEvents } from '../../hooks/useRecentEvents';

const ICON_BY_TYPE = {
    customer_created: { Icon: FiUserPlus, color: 'violet' },
    customer_profile_imported: { Icon: FiUserPlus, color: 'violet' },
    quote_created: { Icon: FiFileText, color: 'amber' },
    payment_charged: { Icon: FiCheckCircle, color: 'green' },
    payment_declined: { Icon: FiXCircle, color: 'red' },
    commission_recorded: { Icon: FiPercent, color: 'violet' },
};

const timeAgo = (iso) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

// Shared dropdown body for the header Notifications + Recent popovers —
// both just read the same activity-log feed at a different depth/title.
export default function ActivityFeedPanel({ title, limit, emptyText, onClose }) {
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const { events, loading } = useRecentEvents(limit);

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
            <div className='px-4 py-3 border-b border-[var(--border)] font-semibold text-sm'>{title}</div>
            <div className='max-h-96 overflow-y-auto p-1.5'>
                {loading && <div className='px-3 py-4 text-xs text-[var(--text-tertiary)]'>Loading…</div>}
                {!loading && events.length === 0 && (
                    <div className='px-3 py-6 text-center text-xs text-[var(--text-tertiary)]'>
                        <FiInbox size={18} className='mx-auto mb-2 opacity-50' />
                        {emptyText}
                    </div>
                )}
                {!loading && events.map((e) => {
                    const { Icon, color } = ICON_BY_TYPE[e.type] || { Icon: FiInbox, color: 'violet' };
                    return (
                        <button
                            key={e.id}
                            type='button'
                            onClick={() => goTo(e.href)}
                            className='flex w-full items-start gap-2.5 px-3 py-2.5 text-left rounded-lg hover:bg-[var(--bg-hover)] transition-colors'
                        >
                            <span
                                className='flex items-center justify-center w-8 h-8 rounded-full shrink-0'
                                style={{ background: `var(--${color}-bg)`, color: `var(--${color}-text)` }}
                            >
                                <Icon size={14} />
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block text-[13px] font-medium truncate'>{e.title}</span>
                                {e.sub && <span className='block text-xs text-[var(--text-tertiary)] truncate'>{e.sub}</span>}
                            </span>
                            <span className='text-[11px] text-[var(--text-tertiary)] shrink-0 pt-0.5'>{timeAgo(e.at)}</span>
                        </button>
                    );
                })}
            </div>
            <button
                type='button'
                onClick={() => goTo('/connect/finance/activity')}
                className='block w-full px-4 py-2.5 text-center text-[13px] font-medium text-[var(--primary)] border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors'
            >
                View all activity
            </button>
        </div>
    );
}
