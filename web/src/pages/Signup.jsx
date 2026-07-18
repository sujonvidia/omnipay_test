import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/messageSlice';
import { gql, MUTATIONS } from '../lib/graphqlClient';
import './auth.css';

const emptyForm = {
    firstname: '', lastname: '', email: '',
    company_name: '', industry: '', company_size: '',
    code: '', password: '',
};

export default function Signup() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const sendCode = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setLoading(true);
        try {
            const data = await gql(MUTATIONS.signupOtpSend, {
                input: { email: form.email, firstname: form.firstname, lastname: form.lastname },
            }, 'signup_otp_send');
            const result = data.signup_otp_send;
            if (!result.status) { setError(result.message || 'Could not send code.'); return; }
            setInfo('Verification code sent — check your email.');
            setStep(2);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

    const completeSignup = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const data = await gql(MUTATIONS.signup, { input: form }, 'signup');
            const result = data.signup;
            if (!result.status) { setError(result.message || 'Signup failed.'); return; }
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
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-title">Create your OmniPay account</div>
                <div className="auth-sub">Step {step} of 2</div>
                {error && <div className="auth-error">{error}</div>}
                {info && <div className="auth-success">{info}</div>}

                {step === 1 && (
                    <form onSubmit={sendCode}>
                        <div className="auth-field">
                            <label>First name</label>
                            <input name="firstname" required value={form.firstname} onChange={onChange} />
                        </div>
                        <div className="auth-field">
                            <label>Last name</label>
                            <input name="lastname" value={form.lastname} onChange={onChange} />
                        </div>
                        <div className="auth-field">
                            <label>Email</label>
                            <input type="email" name="email" required value={form.email} onChange={onChange} />
                        </div>
                        <div className="auth-field">
                            <label>Company name</label>
                            <input name="company_name" required value={form.company_name} onChange={onChange} />
                        </div>
                        <div className="auth-field">
                            <label>Industry</label>
                            <input name="industry" required value={form.industry} onChange={onChange} />
                        </div>
                        <div className="auth-field">
                            <label>Company size</label>
                            <input name="company_size" required placeholder="1-10" value={form.company_size} onChange={onChange} />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Sending code…' : 'Send verification code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={completeSignup}>
                        <div className="auth-field">
                            <label>Verification code</label>
                            <input name="code" required value={form.code} onChange={onChange} />
                        </div>
                        <div className="auth-field">
                            <label>Password</label>
                            <input type="password" name="password" required minLength={8} value={form.password} onChange={onChange} />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>
                )}

                <div className="auth-links">
                    <Link to="/login">Already have an account?</Link>
                </div>
            </div>
        </div>
    );
}
