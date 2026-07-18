import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/messageSlice';
import { gql, MUTATIONS } from '../lib/graphqlClient';
import './auth.css';

export default function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await gql(MUTATIONS.login, { input: form }, 'login');
            const result = data.login;
            if (!result.status) {
                setError(result.message || 'Login failed.');
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
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-title">Sign in to OmniPay</div>
                <div className="auth-sub">Manage payments, invoices and collections.</div>
                {error && <div className="auth-error">{error}</div>}
                <form onSubmit={onSubmit}>
                    <div className="auth-field">
                        <label>Email</label>
                        <input type="email" name="email" required value={form.email} onChange={onChange} />
                    </div>
                    <div className="auth-field">
                        <label>Password</label>
                        <input type="password" name="password" required value={form.password} onChange={onChange} />
                    </div>
                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <div className="auth-links">
                    <Link to="/forgot-password">Forgot password?</Link>
                    <Link to="/signup">Create account</Link>
                </div>
            </div>
        </div>
    );
}
