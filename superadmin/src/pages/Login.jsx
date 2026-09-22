import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await login(email, password);
        if (!res.success) {
            setError(res.message || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
                <ShieldCheck size={48} color="var(--primary-blue)" style={{ marginBottom: '16px' }} />
                <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Super Admin Portal</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Sign in to manage Lifeline360</p>

                {error && <div style={{ background: 'rgba(255, 51, 102, 0.1)', color: 'var(--danger-red)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            className="glass-input"
                            placeholder="admin@lifeline360.gov.in"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '32px' }}>
                        <label>Password</label>
                        <input
                            type="password"
                            className="glass-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="glass-btn primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={loading}>
                        {loading ? 'Authenticating...' : 'Secure Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
