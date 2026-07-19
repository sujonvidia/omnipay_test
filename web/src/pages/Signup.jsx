import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiUser, FiMail, FiBriefcase, FiUsers, FiLock, FiEye, FiEyeOff, FiArrowRight, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { setUser } from '../store/messageSlice';
import { gql, MUTATIONS } from '../lib/graphqlClient';
import AuthLeftSide from '../components/auth/AuthLeftSide';
import OtpInput from '../components/auth/OtpInput';
import ResendTimer from '../components/auth/ResendTimer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
    firstname: '', lastname: '', email: '',
    company_name: '', industry: '', company_size: '',
    code: '', password: '',
};

const cardWrap = 'rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:rounded-3xl sm:p-7 lg:p-9';
const inputBase = 'h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-base sm:text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';
const inputNormal = 'border-slate-200 hover:border-slate-300 focus:ring-brand-500';
const inputError = 'border-red-500 focus:ring-red-500';
const labelBase = 'mb-1.5 block text-sm font-medium text-slate-700';
const primaryBtn = 'group h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-700 to-brand-500 shadow-md shadow-brand-900/20 hover:from-brand-700 hover:to-brand-600 hover:shadow-lg hover:shadow-brand-900/25 transition-all duration-200';
const disabledBtn = 'h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed transition-all duration-200';

export default function Signup() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(emptyForm);
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendCount, setSendCount] = useState(0);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const onCodeChange = (code) => setForm({ ...form, code });

    const emailValid = EMAIL_RE.test(form.email);
    const step1Valid = form.firstname.trim() && emailValid && form.company_name.trim()
        && form.industry.trim() && form.company_size.trim();
    const step2Valid = form.code.length === 6 && form.password.trim().length >= 8;

    const sendCode = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (!step1Valid) return;

        setLoading(true);
        try {
            const data = await gql(MUTATIONS.signupOtpSend, {
                input: { email: form.email, firstname: form.firstname, lastname: form.lastname },
            }, 'signup_otp_send');
            const result = data.signup_otp_send;
            if (!result.status) {
                setError(result.message || 'Could not send code.');
                return;
            }
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
            const data = await gql(MUTATIONS.signupOtpSend, {
                input: { email: form.email, firstname: form.firstname, lastname: form.lastname },
            }, 'signup_otp_send');
            if (!data.signup_otp_send.status) {
                setError(data.signup_otp_send.message || 'Could not resend code.');
                return;
            }
            setSendCount((c) => c + 1);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        }
    };

    const completeSignup = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (!step2Valid) return;

        setLoading(true);
        try {
            const data = await gql(MUTATIONS.signup, { input: form }, 'signup');
            const result = data.signup;
            if (!result.status) {
                setError(result.message || 'Signup failed.');
                return;
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
                            {error && (
                                <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {step === 1 && (
                                <>
                                    <div className="mb-6 sm:mb-7 space-y-1.5">
                                        <h1 className="text-[clamp(1.375rem,5.5vw,1.75rem)] font-bold tracking-tight text-slate-900 leading-tight">
                                            Create your account
                                        </h1>
                                        <p className="text-[13px] sm:text-sm text-slate-500">
                                            Tell us about you and your company to get started with OmniPay.
                                        </p>
                                    </div>

                                    <form className="space-y-5" onSubmit={sendCode} noValidate>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelBase}>First name</label>
                                                <div className="relative">
                                                    <FiUser aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        name="firstname"
                                                        className={`${inputBase} ${submitted && !form.firstname.trim() ? inputError : inputNormal}`}
                                                        value={form.firstname}
                                                        onChange={onChange}
                                                        placeholder="Jane"
                                                        autoFocus
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelBase}>Last name</label>
                                                <div className="relative">
                                                    <FiUser aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        name="lastname"
                                                        className={`${inputBase} ${inputNormal}`}
                                                        value={form.lastname}
                                                        onChange={onChange}
                                                        placeholder="Doe"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelBase}>Email</label>
                                            <div className="relative">
                                                <FiMail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    className={`${inputBase} ${submitted && !emailValid ? inputError : inputNormal}`}
                                                    value={form.email}
                                                    onChange={onChange}
                                                    placeholder="you@company.com"
                                                    autoComplete="email"
                                                    required
                                                />
                                            </div>
                                            {submitted && !emailValid && (
                                                <p className="mt-1.5 text-xs font-medium text-red-600">Enter a valid email address.</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className={labelBase}>Company name</label>
                                            <div className="relative">
                                                <FiBriefcase aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    name="company_name"
                                                    className={`${inputBase} ${submitted && !form.company_name.trim() ? inputError : inputNormal}`}
                                                    value={form.company_name}
                                                    onChange={onChange}
                                                    placeholder="Acme Inc."
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelBase}>Industry</label>
                                                <input
                                                    name="industry"
                                                    className={`h-12 w-full rounded-xl border bg-white px-3 text-base sm:text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 ${submitted && !form.industry.trim() ? inputError : inputNormal}`}
                                                    value={form.industry}
                                                    onChange={onChange}
                                                    placeholder="Retail"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className={labelBase}>Company size</label>
                                                <div className="relative">
                                                    <FiUsers aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        name="company_size"
                                                        className={`${inputBase} ${submitted && !form.company_size.trim() ? inputError : inputNormal}`}
                                                        value={form.company_size}
                                                        onChange={onChange}
                                                        placeholder="1-10"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {loading ? (
                                            <button type="button" className={disabledBtn} disabled>
                                                <FiLoader className="h-4 w-4 animate-spin" />
                                                Sending code…
                                            </button>
                                        ) : (
                                            <button type="submit" className={step1Valid ? primaryBtn : disabledBtn}>
                                                Send verification code
                                                {step1Valid && <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                                            </button>
                                        )}
                                    </form>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <div className="mb-6 flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100">
                                            <FiMail className="h-5 w-5 text-brand-600" aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <h1 className="text-[clamp(1.25rem,5vw,1.5rem)] font-bold leading-tight tracking-tight text-slate-900">
                                                Verify your email
                                            </h1>
                                            <p className="text-sm text-slate-500">
                                                We sent a 6-digit code to{' '}
                                                <span className="font-semibold text-slate-900 break-all">{form.email}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <form className="space-y-5" onSubmit={completeSignup} noValidate>
                                        <div className="space-y-3">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Enter verification code
                                            </label>
                                            <OtpInput
                                                value={form.code}
                                                onChange={onCodeChange}
                                                error={submitted && form.code.length !== 6}
                                                autoFocus
                                            />
                                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
                                                <span className="text-xs text-slate-500 flex-1 min-w-[140px]">
                                                    Check your spam folder if it hasn't arrived.
                                                </span>
                                                <ResendTimer resetKey={sendCount} onResend={resendCode} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelBase}>Password</label>
                                            <div className="relative">
                                                <FiLock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    className={`${inputBase} pr-11 ${submitted && form.password.trim().length < 8 ? inputError : inputNormal}`}
                                                    value={form.password}
                                                    onChange={onChange}
                                                    placeholder="At least 8 characters"
                                                    autoComplete="new-password"
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
                                            {submitted && form.password.trim().length < 8 && (
                                                <p className="mt-1.5 text-xs font-medium text-red-600">Minimum 8 characters.</p>
                                            )}
                                        </div>

                                        {loading ? (
                                            <button type="button" className={disabledBtn} disabled>
                                                <FiLoader className="h-4 w-4 animate-spin" />
                                                Creating account…
                                            </button>
                                        ) : (
                                            <button type="submit" className={step2Valid ? primaryBtn : disabledBtn}>
                                                Create account
                                                {step2Valid && <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => { setStep(1); setError(''); setSubmitted(false); }}
                                            className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            Back to details
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>

                        <div className="mt-6 text-center text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
