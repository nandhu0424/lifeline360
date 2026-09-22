import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuthData, getUser } from '../utils/auth';
import '../styles/App.css';

const Sidebar = () => {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/dashboard' },
    { name: 'Hospitals', icon: '🏥', path: '/hospitals' },
    { name: 'Attendance', icon: '📋', path: '/attendance' },
    { name: 'Stocks & Reports', icon: '📦', path: '/stocks' },
    { name: 'Alerts', icon: '🔔', path: '/alerts' },
    { name: 'Programs', icon: '📢', path: '/programs' },
  ];

  return (
    <div className="sidebar glass-panel" style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRadius: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderBottom: 'none',
      padding: '30px 20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="sidebar-header" style={{ marginBottom: '40px', position: 'relative' }}>
        <button 
          className="mobile-close"
          onClick={() => document.querySelector('.sidebar').classList.remove('open')}
          style={{
            display: 'none',
            position: 'absolute',
            right: '-10px',
            top: '-10px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'poin r'
          }}
        >
          ✕
        </button>
        <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🏥 Lifeline360
        </h2>
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          background: 'rgba(0, 201, 167, 0.1)',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: 'var(--primary)',
          display: 'inline-block'
        }}>
          DDHS {user?.district}
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px 16px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  borderRadius: '10px',
                  borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'all 0.3s ease'
                })}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ fontWeight: 500 }}>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
        <button
          onClick={handleLogout}
          className="btn btn-outline"
          style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
