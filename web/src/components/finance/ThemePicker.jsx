import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiX } from 'react-icons/fi';
import { THEMES } from './themes';

// Centered dialog over a backdrop — simpler than anchoring to a trigger,
// and works the same on every viewport since it's opened from a menu item
// rather than a fixed toolbar position.
export default function ThemePicker({ value, onChange, open, onClose }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className='fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm'
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className='w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xl overflow-hidden'>
                <div className='flex items-center gap-2 px-5 py-4 border-b border-[var(--border)]'>
                    <span className='font-semibold text-sm flex-1'>Theme</span>
                    <button
                        type='button'
                        onClick={onClose}
                        aria-label='Close'
                        className='flex items-center justify-center w-7 h-7 rounded-full hover:bg-[var(--bg-hover)] transition'
                    >
                        <FiX size={15} />
                    </button>
                </div>

                <div className='p-4 grid grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto'>
                    {THEMES.map((t) => {
                        const active = value === t.key;
                        return (
                            <button
                                key={t.key}
                                type='button'
                                onClick={() => onChange(t.key)}
                                aria-pressed={active}
                                title={t.label}
                                className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition ${active ? 'border-[var(--primary)] ring-2 ring-[var(--primary-tint-strong)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}
                            >
                                <span
                                    className='relative flex w-full h-12 rounded-lg overflow-hidden'
                                    style={{ background: t.swatchBg }}
                                >
                                    <span className='absolute left-1.5 top-1.5 w-6 h-8 rounded' style={{ background: t.swatchCard }} />
                                    <span className='absolute right-1.5 bottom-1.5 w-4 h-4 rounded-full' style={{ background: t.swatchAccent }} />
                                    {active && (
                                        <span className='absolute inset-0 flex items-center justify-center bg-black/20'>
                                            <FiCheck className='text-white drop-shadow' size={16} />
                                        </span>
                                    )}
                                </span>
                                <span className='text-[11.5px] font-medium text-[var(--text-secondary)]'>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}
