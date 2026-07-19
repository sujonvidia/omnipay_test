import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { setUser } from '../store/messageSlice';
import { gql, MUTATIONS } from '../lib/graphqlClient';
import AuthLeftSide from '../components/auth/AuthLeftSide';

const REMEMBER_EMAIL_KEY = 'omnipay_remember_email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cardWrap = 'rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:rounded-3xl sm:p-7 lg:p-9';
const inputBase = 'h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-base sm:text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';
const inputNormal = 'border-slate-200 hover:border-slate-300 focus:ring-brand-500';
const inputError = 'border-red-500 focus:ring-red-500';
const labelBase = 'mb-1.5 block text-sm font-medium text-slate-700';
const primaryBtn = 'group h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-700 to-brand-500 shadow-md shadow-brand-900/20 hover:from-brand-700 hover:to-brand-600 hover:shadow-lg hover:shadow-brand-900/25 transition-all duration-200';
const disabledBtn = 'h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed transition-all duration-200';

export default function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const passwordRef = useRef(null);

    useEffect(() => {
        const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) {
            setForm((f) => ({ ...f, email: savedEmail }));
            setRememberMe(true);
        }
    }, []);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        if (e.target.name === 'email' && form.email.trim() !== '') {
            e.preventDefault();
            passwordRef.current?.focus();
        }
    };

    const emailValid = EMAIL_RE.test(form.email);
    const canSubmit = emailValid && form.password.trim().length > 0;

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (!canSubmit) return;

        setLoading(true);
        try {
            const data = await gql(MUTATIONS.login, { input: form }, 'login');
            const result = data.login;
            if (!result.status) {
                setError(result.message || 'Login failed.');
                return;
            }
            if (rememberMe) {
                localStorage.setItem(REMEMBER_EMAIL_KEY, form.email);
            } else {
                localStorage.removeItem(REMEMBER_EMAIL_KEY);
            }
            localStorage.setItem('token', result.data.token);
            dispatch(setUser(result.data));
            navigate('/connect/finance/home');
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

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
                                    Welcome back
                                </h1>
                                <p className="text-[13px] sm:text-sm text-slate-500">
                                    Sign in to continue to OmniPay.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={onSubmit} noValidate>
                                <div className="w-full">
                                    <label htmlFor="email" className={labelBase}>Email</label>
                                    <div className="relative">
                                        <FiMail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="email"
                                            className={`${inputBase} ${(submitted && (form.email.trim() === '' || !emailValid)) ? inputError : inputNormal}`}
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            placeholder="you@company.com"
                                            onChange={onChange}
                                            onKeyDown={onKeyDown}
                                            autoFocus
                                            autoComplete="email"
                                            required
                                        />
                                    </div>
                                    {submitted && form.email.trim() === '' && (
                                        <p className="mt-1.5 text-xs font-medium text-red-600">Email is required.</p>
                                    )}
                                    {submitted && form.email.trim() !== '' && !emailValid && (
                                        <p className="mt-1.5 text-xs font-medium text-red-600">Invalid email address.</p>
                                    )}
                                </div>

                                <div className="w-full">
                                    <label htmlFor="password" className={labelBase}>Password</label>
                                    <div className="relative">
                                        <FiLock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="password"
                                            ref={passwordRef}
                                            className={`${inputBase} pr-11 ${(submitted && form.password.trim() === '') ? inputError : inputNormal}`}
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={form.password}
                                            placeholder="Your password"
                                            onChange={onChange}
                                            autoComplete="current-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                            onClick={() => setShowPassword((s) => !s)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            tabIndex={form.password === '' ? -1 : 0}
                                        >
                                            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {submitted && form.password.trim() === '' && (
                                        <p className="mt-1.5 text-xs font-medium text-red-600">Password is required.</p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                                    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-0"
                                        />
                                        Remember me
                                    </label>
                                    <Link className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors" to="/forgot-password">
                                        Forgot password?
                                    </Link>
                                </div>

                                {loading ? (
                                    <button type="button" className={disabledBtn} disabled>
                                        <FiLoader className="h-4 w-4 animate-spin" />
                                        Signing in…
                                    </button>
                                ) : (
                                    <button type="submit" className={canSubmit ? primaryBtn : disabledBtn}>
                                        Sign In
                                        {canSubmit && <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                                    </button>
                                )}
                            </form>

                            <div className="mt-7 flex items-center gap-3">
                                <span className="h-px flex-1 bg-slate-200" />
                                <span className="text-xs uppercase tracking-wider text-slate-400">Secure sign-in</span>
                                <span className="h-px flex-1 bg-slate-200" />
                            </div>

                            <p className="mt-5 text-center text-xs text-slate-500">
                                Protected by enterprise-grade encryption. By continuing you agree to our Terms &amp; Privacy.
                            </p>
                        </div>

                        <div className="mt-6 text-center text-sm text-slate-500">
                            {`Don't`} have an account?{' '}
                            <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
