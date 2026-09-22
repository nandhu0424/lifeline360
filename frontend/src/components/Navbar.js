import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, clearAuthData } from '../utils/auth';
import axios from 'axios';
import '../styles/App.css';

const Navbar = () => {
  const user = getUser();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  const handleLogout = () => {
    clearAuthData();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Hospitals', path: '/hospitals' },
    { name: 'Attendance', path: '/attendance' },
    { name: 'Leave Approvals', path: '/leave-management' },
    { name: 'Stocks', path: '/stocks' },
    { name: 'Assign Program', path: '/work-assignments' },
  ];

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setNotifLoading(false);
    }
  };

  // Fetch notifications on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getStatusBadge = (status) => {
    const map = {
      'Completed': { bg: '#dcfce7', color: '#16a34a' },
      'Under Review': { bg: '#eff6ff', color: '#3b82f6' },
      'Action Required': { bg: '#fef2f2', color: '#ef4444' },
      'Pending': { bg: '#fef3c7', color: '#d97706' },
      'Reassigned': { bg: '#fff7ed', color: '#ea580c' },
      'pending': { bg: '#fef3c7', color: '#d97706' },
      'sent': { bg: '#eff6ff', color: '#3b82f6' },
      'resolved': { bg: '#dcfce7', color: '#16a34a' },
    };
    return map[status] || { bg: '#f1f5f9', color: '#64748b' };
  };

  return (
    <nav className="navbar glass-panel animate-slide-down" style={{
      margin: '0',
      padding: '0 40px',
      height: '76px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: '0',
      zIndex: 1000,
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      width: '100%'
    }}>
      {/* Logo Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px', height: '40px', background: 'var(--primary)',
          borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span className="material-symbols-rounded" style={{ color: 'white', fontSize: '1.6rem' }}>ecg</span>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--primary)', margin: 0 }}>Lifeline360</h2>
      </div>

      {/* Desktop Navigation */}
      <div className="desktop-nav" style={{ display: 'flex', gap: '30px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="nav-link"
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '0.95rem',
              fontWeight: 600,
            })}
          >
            {item.name}
          </NavLink>
        ))}
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} className="desktop-nav" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
            style={{
              background: showNotifications ? 'rgba(59,130,246,0.08)' : 'none',
              border: 'none', cursor: 'pointer',
              color: showNotifications ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
              padding: '8px', borderRadius: '10px',
              transition: 'all 0.2s'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.4rem' }}>notifications</span>
          </button>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.6rem',
              padding: '2px 5px',
              borderRadius: '50%',
              fontWeight: 'bold',
              minWidth: '16px',
              textAlign: 'center',
              lineHeight: '12px',
              border: '2px solid white',
              pointerEvents: 'none'
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              right: '-20px',
              width: '440px',
              maxHeight: '560px',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 60px -15px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'notifSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Header */}
              <div style={{
                padding: '18px 22px 14px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '1.3rem' }}>notifications_active</span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#ef4444', color: 'white', fontSize: '0.7rem',
                      padding: '2px 8px', borderRadius: '10px', fontWeight: 700
                    }}>{unreadCount} new</span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '0.9rem' }}>close</span>
                </button>
              </div>

              {/* Notification List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
                {notifLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    <p style={{ margin: '10px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: '#cbd5e1' }}>notifications_off</span>
                    <p style={{ margin: '10px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n, idx) => {
                    const badge = getStatusBadge(n.status);
                    return (
                      <div
                        key={n.id || idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          background: n.unread ? 'rgba(59,130,246,0.04)' : 'transparent',
                          borderLeft: n.unread ? '3px solid #3b82f6' : '3px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseOut={e => { e.currentTarget.style.background = n.unread ? 'rgba(59,130,246,0.04)' : 'transparent'; }}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          {/* Icon */}
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '12px',
                            background: n.bg, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0
                          }}>
                            <span className="material-symbols-rounded" style={{ color: n.color, fontSize: '1.15rem' }}>{n.icon}</span>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <p style={{
                                margin: 0, fontSize: '0.83rem', fontWeight: 750,
                                color: '#0f172a', lineHeight: '1.3',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                              }}>{n.title}</p>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {formatTimeAgo(n.timestamp)}
                              </span>
                            </div>
                            <p style={{
                              margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b',
                              lineHeight: '1.45',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                            }}>{n.message}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 700,
                                padding: '2px 8px', borderRadius: '6px',
                                background: badge.bg, color: badge.color,
                                textTransform: 'capitalize'
                              }}>{n.status}</span>
                              {n.hospital_name && n.hospital_name !== 'All PHCs' && (
                                <span style={{
                                  fontSize: '0.68rem', fontWeight: 600,
                                  color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px'
                                }}>
                                  <span className="material-symbols-rounded" style={{ fontSize: '0.75rem' }}>location_on</span>
                                  {n.hospital_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{
                  padding: '12px 22px',
                  borderTop: '1px solid #e2e8f0',
                  textAlign: 'center',
                  background: '#f8fafc'
                }}>
                  <button
                    onClick={() => { navigate('/alerts'); setShowNotifications(false); }}
                    style={{
                      background: 'none', border: 'none', color: '#3b82f6',
                      fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      margin: '0 auto'
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>open_in_new</span>
                    View All Alerts
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: '30px', width: '1px', background: 'var(--glass-border)' }} className="desktop-nav"></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }} className="desktop-nav">
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{user?.username}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--primary)', margin: 0 }}>{user?.district} District</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              padding: '8px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>logout</span>
            Logout
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="mobile-toggle"
          onClick={() => setIsMobileMenuOpen(true)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: '1.8rem',
            color: 'var(--text-main)',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-rounded">menu</span>
        </button>
      </div>

      {/* Right Side Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000
          }}
        >
          <div
            className="mobile-drawer animate-slide-in-right"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 0, right: 0,
              width: '280px',
              height: '100%',
              background: 'var(--bg-dark)',
              borderLeft: '1px solid var(--glass-border)',
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '30px',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="nav-link"
                  style={({ isActive }) => ({
                    textDecoration: 'none',
                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    padding: '10px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(0, 128, 0, 0.05)' : 'transparent'
                  })}
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{user?.username}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', margin: 0 }}>{user?.district} District</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  borderColor: '#ef4444',
                  color: '#ef4444'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
