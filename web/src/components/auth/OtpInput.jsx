import { useRef } from 'react';

// Controlled 6-digit OTP input. `value` / `onChange` deal in a plain string of digits.
export default function OtpInput({ length = 6, value, onChange, error, autoFocus }) {
    const inputRefs = useRef([]);
    const digits = Array.from({ length }, (_, i) => value[i] || '');

    const setDigitAt = (index, digit) => {
        const next = digits.slice();
        next[index] = digit;
        onChange(next.join(''));
    };

    const onDigitChange = (index, e) => {
        const raw = e.target.value;
        const digit = raw.replace(/\D/g, '').slice(-1);
        setDigitAt(index, digit);
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const onKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const onPaste = (e) => {
        const pasted = e.clipboardData.getData('Text').replace(/\D/g, '').slice(0, length);
        if (!pasted) return;
        e.preventDefault();
        onChange(pasted.padEnd(length, '').slice(0, length).trimEnd());
        inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
    };

    const boxBase = 'h-12 w-full sm:h-14 rounded-xl border bg-white text-center text-xl sm:text-2xl font-semibold text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
    const boxNormal = 'border-slate-200 hover:border-slate-300';
    const boxFilled = 'border-brand-500 bg-brand-50/40';
    const boxError = 'border-red-500 bg-red-50/40 focus:ring-red-500';

    return (
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
            {digits.map((digit, i) => (
                <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => onDigitChange(i, e)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onPaste={onPaste}
                    autoFocus={autoFocus && i === 0}
                    className={`${boxBase} min-w-0 ${error ? boxError : digit ? boxFilled : boxNormal}`}
                    aria-label={`Digit ${i + 1}`}
                />
            ))}
        </div>
    );
}
