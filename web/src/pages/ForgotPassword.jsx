import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiLoader, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { gql, MUTATIONS } from '../lib/graphqlClient';
import AuthLeftSide from '../components/auth/AuthLeftSide';
import OtpInput from '../components/auth/OtpInput';
import ResendTimer from '../components/auth/ResendTimer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cardWrap = 'rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:rounded-3xl sm:p-7 lg:p-9';
const inputBase = 'h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-base sm:text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';
const inputNormal = 'border-slate-200 hover:border-slate-300 focus:ring-brand-500';
const inputError = 'border-red-500 focus:ring-red-500';
const labelBase = 'mb-1.5 block text-sm font-medium text-slate-700';
const primaryBtn = 'group h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-700 to-brand-500 shadow-md shadow-brand-900/20 hover:from-brand-700 hover:to-brand-600 hover:shadow-lg hover:shadow-brand-900/25 transition-all duration-200';
const disabledBtn = 'h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed transition-all duration-200';

const STEP_COPY = {
    1: { title: 'Forgot password', subtitle: "Enter your email and we'll send you a reset code." },
    2: { title: 'Enter reset code', subtitle: 'Check your inbox for the 6-digit code we sent you.' },
    3: { title: 'Set a new password', subtitle: 'Choose a new password to secure your account.' },
};

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendCount, setSendCount] = useState(0);

    const emailValid = EMAIL_RE.test(email);

    const requestCode = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (!emailValid) return;

        setLoading(true);
        try {
            await gql(MUTATIONS.forgotPassword, { input: { email } }, 'forgot_password');
            setSendCount((c) => c + 1);
            setSubmitted(false);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

    const resendCode = async () => {
        setError('');
        try {
            await gql(MUTATIONS.forgotPassword, { input: { email } }, 'forgot_password');
            setSendCount((c) => c + 1);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        }
    };

    const verifyCode = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (code.length !== 6) return;

        setLoading(true);
        try {
            const data = await gql(MUTATIONS.emailOtpVerify, { input: { email, code } }, 'email_otp_verify');
            if (!data.email_otp_verify.status) {
                setError(data.email_otp_verify.message || 'Invalid code.');
                return;
            }
            setSubmitted(false);
            setStep(3);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (password.trim().length < 8) return;

        setLoading(true);
        try {
            const data = await gql(MUTATIONS.setNewPassword, { input: { email, code, password } }, 'set_new_password');
            if (!data.set_new_password.status) {
                setError(data.set_new_password.message || 'Could not reset password.');
                return;
            }
            navigate('/login');
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

    const { title, subtitle } = STEP_COPY[step];

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden">
            <AuthLeftSide />

            <section className="flex-1 flex flex-col relative px-4 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-12 bg-white">
                <div className="lg:hidden mb-6 text-center">
                    <span className="text-xl font-bold tracking-tight text-brand-600">OmniPay</span>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="w-full max-w-md mx-auto">
                        <div className={cardWrap}>
                            <div className="mb-6 sm:mb-7 space-y-1.5">
                                <h1 className="text-[clamp(1.375rem,5.5vw,1.75rem)] font-bold tracking-tight text-slate-900 leading-tight">
                                    {title}
                                </h1>
                                <p className="text-[13px] sm:text-sm text-slate-500">{subtitle}</p>
                            </div>

                            {error && (
                                <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {step === 1 && (
                                <form className="space-y-5" onSubmit={requestCode} noValidate>
                                    <div>
                                        <label className={labelBase}>Email</label>
                                        <div className="relative">
                                            <FiMail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="email"
                                                className={`${inputBase} ${submitted && !emailValid ? inputError : inputNormal}`}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@company.com"
                                                autoFocus
                                                autoComplete="email"
                                                required
                                            />
                                        </div>
                                        {submitted && !emailValid && (
                                            <p className="mt-1.5 text-xs font-medium text-red-600">Enter a valid email address.</p>
                                        )}
                                    </div>

                                    {loading ? (
                                        <button type="button" className={disabledBtn} disabled>
                                            <FiLoader className="h-4 w-4 animate-spin" />
                                            Sending…
                                        </button>
                                    ) : (
                                        <button type="submit" className={emailValid ? primaryBtn : disabledBtn}>
                                            Send reset code
                                            {emailValid && <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                                        </button>
                                    )}
                                </form>
                            )}

                            {step === 2 && (
                                <form className="space-y-5" onSubmit={verifyCode} noValidate>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Code sent to <span className="font-semibold text-slate-900 break-all">{email}</span>
                                        </label>
                                        <OtpInput
                                            value={code}
                                            onChange={setCode}
                                            error={submitted && code.length !== 6}
                                            autoFocus
                                        />
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
                                            <span className="text-xs text-slate-500 flex-1 min-w-[140px]">
                                                Check your spam folder if it hasn't arrived.
                                            </span>
                                            <ResendTimer resetKey={sendCount} onResend={resendCode} />
                                        </div>
                                    </div>

                                    {loading ? (
                                        <button type="button" className={disabledBtn} disabled>
                                            <FiLoader className="h-4 w-4 animate-spin" />
                                            Verifying…
                                        </button>
                                    ) : (
                                        <button type="submit" className={code.length === 6 ? primaryBtn : disabledBtn}>
                                            Verify code
                                            {code.length === 6 && <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setError(''); setSubmitted(false); }}
                                        className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        Use a different email
                                    </button>
                                </form>
                            )}

                            {step === 3 && (
                                <form className="space-y-5" onSubmit={resetPassword} noValidate>
                                    <div>
                                        <label className={labelBase}>New password</label>
                                        <div className="relative">
                                            <FiLock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className={`${inputBase} pr-11 ${submitted && password.trim().length < 8 ? inputError : inputNormal}`}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="At least 8 characters"
                                                autoComplete="new-password"
                                                autoFocus
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                                onClick={() => setShowPassword((s) => !s)}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {submitted && password.trim().length < 8 && (
                                            <p className="mt-1.5 text-xs font-medium text-red-600">Minimum 8 characters.</p>
                                        )}
                                    </div>

                                    {loading ? (
                                        <button type="button" className={disabledBtn} disabled>
                                            <FiLoader className="h-4 w-4 animate-spin" />
                                            Saving…
                                        </button>
                                    ) : (
                                        <button type="submit" className={password.trim().length >= 8 ? primaryBtn : disabledBtn}>
                                            <FiCheckCircle className="h-4 w-4" />
                                            Set new password
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>

                        <div className="mt-6 text-center text-sm text-slate-500">
                            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
