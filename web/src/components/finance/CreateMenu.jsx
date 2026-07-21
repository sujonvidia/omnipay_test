import { useState, useEffect, useRef } from 'react';
import { LuPlus, LuChevronRight, LuFileText, LuReceipt, LuUserPlus } from 'react-icons/lu';

const CREATE_OPTIONS = [
    { key: 'invoice', icon: LuReceipt, title: 'New invoice', sub: 'Request payment from a customer' },
    { key: 'quote', icon: LuFileText, title: 'New quote', sub: 'Send an estimate for acceptance' },
    { key: 'customer', icon: LuUserPlus, title: 'New customer', sub: 'Add a new customer' },
];

export default function CreateMenu({ onPick }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const pick = (key) => { setOpen(false); onPick(key); };

    return (
        <div className="create-menu" ref={ref}>
            <button type="button" className="create-btn" onClick={() => setOpen(v => !v)}>
                <LuPlus size={15} /> Create
                <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                    <LuChevronRight size={12} />
                </span>
            </button>
            {open && (
                <div className="create-menu-pop">
                    {CREATE_OPTIONS.map(opt => (
                        <button key={opt.key} type="button" className="create-opt" onClick={() => pick(opt.key)}>
                            <span className="create-opt-icon"><opt.icon size={16} /></span>
                            <div>
                                <div className="create-opt-title">{opt.title}</div>
                                <div className="create-opt-sub">{opt.sub}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
