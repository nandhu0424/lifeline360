import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, phcService } from '../../services/api';

const Login = ({ onClose }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState('phc'); // 'phc' or 'ddhs'
  const [view, setView] = useState('login'); // 'login', 'forgot-email', 'forgot-otp', 'forgot-reset'
  const [formData, setFormData] = useState({
    code: '',
    phcName: '',
    address: '',
    username: '',
    password: '',
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetchingName, setFetchingName] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-fetch Hospital Details when ID is entered
  useEffect(() => {
    const fetchHospitalDetails = async () => {
      if (view === 'login' && role === 'phc' && formData.code.length >= 3) {
        setFetchingName(true);
        try {
          const response = await phcService.getNameByCode(formData.code);
          setFormData(prev => ({
            ...prev,
            phcName: response.name,
            address: response.address || 'Address not found'
          }));
          setError('');
        } catch (err) {
          setFormData(prev => ({ ...prev, phcName: '', address: '' }));
        } finally {
          setFetchingName(false);
        }
      }
    };

    const timer = setTimeout(fetchHospitalDetails, 500);
    return () => clearTimeout(timer);
  }, [formData.code, role, view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'phc') {
        const response = await authService.phcLogin({
          hospital_id: formData.code,
          password: formData.password
        });
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        if (onClose) onClose();
        navigate('/phc-dashboard');
      } else {
        const response = await authService.login({
          username: formData.username,
          password: formData.password
        });
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        if (onClose) onClose();
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.forgotPassword({ email: formData.email, role });
      setSuccess('OTP has been sent to your email.');
      setView('forgot-otp');
      setCountdown(30);
      setFormData(prev => ({ ...prev, otp: '' }));
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.verifyOTP({ email: formData.email, otp: formData.otp, role });
      setView('forgot-reset');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP.');
      setFormData(prev => ({ ...prev, otp: '' }));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({
        email: formData.email,
        otp: formData.otp,
        password: formData.newPassword,
        role
      });
      setSuccess('Password reset successful! You can now login.');
      setView('login');
      setFormData({ ...formData, password: '' });
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {role === 'phc' ? (
        <>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Hospital ID / Code</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>domain</span>
              <input
                type="text"
                placeholder="e.g. PHC1024"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                style={{
                  width: '100%', padding: '11px 14px 11px 42px', borderRadius: '11px', border: '1.5px solid #e2e8f0',
                  fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease'
                }}
                className="input-focus"
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Hospital Name</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>location_on</span>
              <input
                type="text"
                readOnly
                placeholder={fetchingName ? 'Fetching...' : 'Auto-filled'}
                value={formData.phcName}
                style={{
                  width: '100%', padding: '11px 14px 11px 42px', borderRadius: '11px', border: '1.5px solid #f1f5f9',
                  background: '#f8fafc', color: '#64748b', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Facility Address</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>map</span>
              <input
                type="text"
                readOnly
                value={formData.address}
                placeholder="Auto-filled address"
                style={{
                  width: '100%', padding: '11px 14px 11px 42px', borderRadius: '11px', border: '1.5px solid #f1f5f9',
                  background: '#f8fafc', color: '#64748b', fontSize: '0.8rem'
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Username / ID</label>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>badge</span>
            <input
              type="text"
              placeholder="Enter officer ID"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={{
                width: '100%', padding: '11px 14px 11px 42px', borderRadius: '11px', border: '1.5px solid #e2e8f0',
                fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease'
              }}
              className="input-focus"
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Password</label>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>lock</span>
          <input
            type="password"
            placeholder="••••••••"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={{
              width: '100%', padding: '11px 14px 11px 42px', borderRadius: '11px', border: '1.5px solid #e2e8f0',
              fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease'
            }}
            className="input-focus"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setView('forgot-email'); setError(''); setSuccess(''); }}
        style={{
          background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700,
          fontSize: '0.8rem', cursor: 'pointer', textAlign: 'right', marginTop: '-5px',
          opacity: 0.8
        }}
      >
        Forgot Password?
      </button>

      {error && <div className="auth-error-msg">{error}</div>}
      {success && <div className="auth-success-msg">{success}</div>}

      <button type="submit" disabled={loading} className="login-btn-primary">
        {loading ? 'Authenticating...' : `Login as ${role === 'phc' ? 'Health Centre' : 'DDHS Officer'}`}
        {!loading && <span className="material-symbols-rounded">arrow_forward</span>}
      </button>
    </form>
  );

  const renderForgotEmail = () => (
    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>Forgot Password</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Enter your registered email to receive a 6-digit OTP.</p>
      </div>
      <div className="form-group">
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Registered Email</label>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>mail</span>
          <input
            type="email"
            placeholder="e.g. user@example.com"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
          />
        </div>
      </div>
      {error && <div className="auth-error-msg">{error}</div>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={() => setView('login')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>{loading ? 'Sending...' : 'Send OTP'}</button>
      </div>
    </form>
  );

  const renderForgotOTP = () => (
    <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>Verify OTP</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>We've sent a 6-digit code to <strong>{formData.email}</strong></p>
      </div>
      <div className="form-group">
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textAlign: 'center' }}>Enter 6-Digit OTP</label>
        <input
          type="text"
          placeholder="000000"
          maxLength="6"
          required
          value={formData.otp}
          onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
          style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '8px' }}
        />
      </div>
      {error && <div className="auth-error-msg">{error}</div>}
      {success && <div className="auth-success-msg">{success}</div>}
      <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>{loading ? 'Verifying...' : 'Verify & Continue'}</button>
      <button
        type="button"
        onClick={handleForgotPassword}
        disabled={countdown > 0 || loading}
        style={{
          background: 'none',
          border: 'none',
          color: countdown > 0 ? '#94a3b8' : 'var(--primary)',
          fontSize: '0.85rem',
          fontWeight: 800,
          cursor: countdown > 0 ? 'not-allowed' : 'pointer'
        }}
      >
        {countdown > 0 ? `Resend OTP in ${countdown}s` : "Didn't receive code? Resend OTP"}
      </button>
      <button type="button" onClick={() => setView('forgot-email')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginTop: '-5px' }}>Change Email Address</button>
    </form>
  );

  const renderForgotReset = () => (
    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>Reset Password</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Create a strong new password for your account.</p>
      </div>
      <div className="form-group">
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>New Password</label>
        <input
          type="password"
          placeholder="••••••••"
          required
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
        />
      </div>
      <div className="form-group">
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Confirm New Password</label>
        <input
          type="password"
          placeholder="••••••••"
          required
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
        />
      </div>
      {error && <div className="auth-error-msg">{error}</div>}
      <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>{loading ? 'Resetting...' : 'Reset Password'}</button>
    </form>
  );

  return (
    <div style={{
      width: '100%', maxWidth: '460px', background: 'white', borderRadius: '28px',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', overflow: 'hidden',
      position: 'relative', animation: 'modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ height: '5px', background: 'linear-gradient(90deg, var(--primary) 0%, #22c55e 100%)', width: '100%' }}></div>

      {onClose && (
        <button onClick={onClose} className="close-hover" style={{ position: 'absolute', right: '18px', top: '18px', background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer', zIndex: 10, width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>close</span>
        </button>
      )}

      <div style={{ padding: '30px 35px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 6px 12px rgba(0, 128, 0, 0.2)' }}>
            <span className="material-symbols-rounded" style={{ color: 'white', fontSize: '1.8rem' }}>ecg</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Lifeline360 Portal</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '5px', fontWeight: 500 }}>Official Healthcare Monitoring System</p>
        </div>

        {view === 'login' && (
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <button onClick={() => { setRole('phc'); setError(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '11px', fontSize: '0.85rem', fontWeight: 700, background: role === 'phc' ? 'white' : 'transparent', color: role === 'phc' ? 'var(--primary)' : '#64748b', boxShadow: role === 'phc' ? '0 6px 10px -2px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }}>Health Centre</button>
            <button onClick={() => { setRole('ddhs'); setError(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '11px', fontSize: '0.85rem', fontWeight: 700, background: role === 'ddhs' ? 'white' : 'transparent', color: role === 'ddhs' ? 'var(--primary)' : '#64748b', boxShadow: role === 'ddhs' ? '0 6px 10px -2px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }}>DDHS Officer</button>
          </div>
        )}

        {view === 'login' && renderLoginForm()}
        {view === 'forgot-email' && renderForgotEmail()}
        {view === 'forgot-otp' && renderForgotOTP()}
        {view === 'forgot-reset' && renderForgotReset()}
      </div>

      {!onClose && (
        <div style={{ padding: '0 30px 22px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
          © {new Date().getFullYear()} Lifeline360. All rights reserved.
        </div>
      )}

      <style>{`
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .input-focus:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(0, 128, 0, 0.08); }
        .login-btn-primary { padding: 14px; border-radius: 12px; fontWeight: 800; fontSize: 0.95rem; display: flex; alignItems: center; justifyContent: center; gap: 8px; marginTop: 5px; background: var(--primary); color: white; border: none; cursor: pointer; boxShadow: 0 6px 12px rgba(0, 128, 0, 0.2); transition: all 0.3s ease; width: 100%; }
        .login-btn-primary:hover { transform: translateY(-1.5px); boxShadow: 0 8px 16px rgba(0, 128, 0, 0.25); filter: brightness(1.05); }
        .auth-error-msg { padding: 10px; background: #fef2f2; border: 1.5px solid #fee2e2; borderRadius: 10px; color: #b91c1c; fontSize: 0.8rem; margin: 10px 0; }
        .auth-success-msg { padding: 10px; background: #ecfdf5; border: 1.5px solid #d1fae5; borderRadius: 10px; color: #059669; fontSize: 0.8rem; margin: 10px 0; }
        .close-hover:hover { background: #f1f5f9 !important; color: #0f172a !important; transform: rotate(90deg); transition: all 0.2s; }
      `}</style>
    </div>
  );
};

export default Login;
