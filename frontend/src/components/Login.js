import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { setAuthData, isAuthenticated } from '../utils/auth';
import '../styles/App.css';

const Login = ({ onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ username, password });
      if (response.success) {
        setAuthData(response.token, response.user);
        navigate('/dashboard');
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-scale-in" style={{
      width: '100%',
      maxWidth: '400px',
      padding: '40px',
      textAlign: 'center',
      position: 'relative',
      background: 'white',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    }}>
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          ✕
        </button>
      )}

      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>ecg</span>
          <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', margin: 0 }}>Lifeline360</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>DDHS District Dashboard Login</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          marginBottom: '20px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'left' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Username / Email</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. ddhs_madurai"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#f8fafc',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            required
          />
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#f8fafc',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '14px',
            marginTop: '10px',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Authenticating...' : 'Login to Dashboard'}
        </button>
      </form>

      <p style={{ marginTop: '30px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Restricted Access. Government of Tamil Nadu.
      </p>
    </div>
  );
};

export default Login;
