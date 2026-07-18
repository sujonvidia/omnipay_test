import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gql, MUTATIONS } from '../lib/graphqlClient';
import './auth.css';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const requestCode = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const data = await gql(MUTATIONS.forgotPassword, { input: { email } }, 'forgot_password');
            setInfo(data.forgot_password.message);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const data = await gql(MUTATIONS.emailOtpVerify, { input: { email, code } }, 'email_otp_verify');
            if (!data.email_otp_verify.status) {
                setError(data.email_otp_verify.message || 'Invalid code.');
                return;
            }
            setStep(3);
        } catch (err) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
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

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-title">Reset your password</div>
                <div className="auth-sub">Step {step} of 3</div>
                {error && <div className="auth-error">{error}</div>}
                {info && step === 2 && <div className="auth-success">{info}</div>}

                {step === 1 && (
                    <form onSubmit={requestCode}>
                        <div className="auth-field">
                            <label>Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Sending…' : 'Send reset code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={verifyCode}>
                        <div className="auth-field">
                            <label>Reset code</label>
                            <input required value={code} onChange={(e) => setCode(e.target.value)} />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Verifying…' : 'Verify code'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={resetPassword}>
                        <div className="auth-field">
                            <label>New password</label>
                            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Saving…' : 'Set new password'}
                        </button>
                    </form>
                )}

                <div className="auth-links">
                    <Link to="/login">Back to sign in</Link>
                </div>
            </div>
        </div>
    );
}
