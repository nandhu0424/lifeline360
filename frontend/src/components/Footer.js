import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/App.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  
  const isLandingPage = location.pathname === '/';

  return (
    <footer style={{ 
      padding: '30px 40px', 
      borderTop: isLandingPage ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      background: isLandingPage ? '#0f172a' : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ fontWeight: 700, color: isLandingPage ? 'rgba(255,255,255,0.55)' : '#94a3b8', fontSize: '0.85rem' }}>
        © {currentYear} Lifeline 360 HIS • SECURE GOV PORTAL
      </div>
      <div style={{ display: 'flex', gap: '30px', fontWeight: 800, fontSize: '0.8rem', color: isLandingPage ? 'rgba(255,255,255,0.65)' : '#475569' }}>
        <span style={{ cursor: 'pointer' }}>Privacy</span>
        <span style={{ cursor: 'pointer' }}>Security</span>
        <span style={{ cursor: 'pointer' }}>Support</span>
        <span style={{ color: '#0d9488' }}>Secure Portal</span>
      </div>
    </footer>
  );
};

export default Footer;
