import { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

// Counts down from `seconds`, then flips to a clickable "Resend" link.
// `resetKey` bumps whenever the caller wants the countdown to restart.
export default function ResendTimer({ seconds = 300, resetKey, onResend }) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        setRemaining(seconds);
    }, [resetKey, seconds]);

    useEffect(() => {
        if (remaining <= 0) return;
        const id = setInterval(() => setRemaining((r) => r - 1), 1000);
        return () => clearInterval(id);
    }, [remaining]);

    if (remaining <= 0) {
        return (
            <button
                type="button"
                onClick={onResend}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors shrink-0"
            >
                <FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Resend
            </button>
        );
    }

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    return (
        <span className="inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold tabular-nums text-slate-700 shrink-0">
            {mm}:{ss}
        </span>
    );
}
