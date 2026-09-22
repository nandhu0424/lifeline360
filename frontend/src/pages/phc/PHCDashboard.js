import React, { useState, useEffect } from 'react';
import { phcService } from '../../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import StaffDetails from './components/StaffDetails';
import PatientRecords from './components/PatientRecords';
import StockReport from './components/StockReport';
import Programs from './components/Programs';
import LeaveManagement from './components/LeaveManagement';

const PHCDashboard = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('phcActiveTab') || 'Dashboard';
  });

  useEffect(() => {
    sessionStorage.setItem('phcActiveTab', activeTab);
  }, [activeTab]);
  const [data, setData] = useState({
    profile: null,
    doctors: [],
    staff: [],
    attendance: { percentage: 0, trend: '0', present: 0 },
    attendanceRecords: [],
    alerts: [],
    opdTrend: [],
    recentActivity: [],
    consultations: 0,
    low_stock: 0
  });
  const [trendRange, setTrendRange] = useState('1W');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Premium Aesthetic Theme - "Soft Mint & Slate"
  const theme = {
    primary: '#008000',
    primaryDark: '#005000',
    primaryLight: '#e8f5e9',
    secondary: '#1e293b',
    accent: '#f59e0b',
    bgMain: '#ffffff',
    bgGradient: 'radial-gradient(at 0% 0%, rgba(0, 128, 0, 0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.03) 0px, transparent 50%)',
    textMain: '#0f172a',
    textMuted: '#475569',
    textLight: '#94a3b8',
    border: 'rgba(226, 232, 240, 0.6)',
    glass: 'rgba(255, 255, 255, 0.7)',
    shadow: '0 10px 30px -5px rgba(0, 0, 0, 0.03), 0 4px 12px -2px rgba(0, 0, 0, 0.02)',
    shadowLg: '0 25px 50px -12px rgba(0, 0, 0, 0.04)'
  };

  const fetchPHCData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, attRes, trendRes, activityRes] = await Promise.allSettled([
        phcService.getStats(),
        phcService.getAttendance(),
        phcService.getOPDTrend(7),
        phcService.getRecentActivity()
      ]);

      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;

      if (statsRes.status === 'rejected') {
        console.error('Stats fetch failed:', statsRes.reason);
        setError(statsRes.reason?.message || 'Failed to connect to server. Please check your connection.');
        return;
      }

      if (!stats?.success || !stats?.data?.profile) {
        setError(stats?.message || 'Could not load hospital profile. Please try logging in again.');
        return;
      }

      setData({
        profile: stats.data.profile,
        attendance: stats.data.attendance || { present: 0, percentage: 0 },
        consultations: stats.data.consultations || 0,
        low_stock: stats.data.low_stock || 0,
        attendanceRecords: (attRes.status === 'fulfilled' ? attRes.value?.data : []) || [],
        opdTrend: (trendRes.status === 'fulfilled' ? trendRes.value?.data : []) || [],
        recentActivity: (activityRes.status === 'fulfilled' ? activityRes.value?.data : []) || [],
        doctors: stats.data.doctors || []
      });
    } catch (err) {
      console.error('Dashboard Init Error:', err);
      setError(err.message || 'Unexpected error loading dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Background refresh of stat counts (every 30 seconds)
  const refreshStats = React.useCallback(async () => {
    try {
      const res = await phcService.getStats();
      if (res?.success && res?.data) {
        setData(prev => ({
          ...prev,
          attendance: res.data.attendance || prev.attendance,
          consultations: res.data.consultations ?? prev.consultations,
          low_stock: res.data.low_stock ?? prev.low_stock,
          doctors: res.data.doctors || prev.doctors,
        }));
      }
    } catch (_) { }
  }, []);

  // Initial full load
  useEffect(() => {
    fetchPHCData();
  }, [fetchPHCData]);

  // Re-fetch stat counts when switching back to Dashboard tab
  useEffect(() => {
    if (activeTab === 'Dashboard') {
      refreshStats();
    }
  }, [activeTab, refreshStats]);

  // Poll stat counts every 30 seconds to stay in sync
  useEffect(() => {
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  useEffect(() => {
    const fetchTrend = async () => {
      const days = trendRange === '1M' ? 30 : trendRange === '3M' ? 90 : trendRange === '1Y' ? 365 : 7;
      try {
        const res = await phcService.getOPDTrend(days);
        setData(prev => ({ ...prev, opdTrend: res.data }));
      } catch (err) {
        console.error(err);
      }
    };
    if (!loading) fetchTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendRange]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: theme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  if (!data?.profile || error) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#fff', flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontSize: '4rem' }} className="material-symbols-rounded">error</div>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Unable to load dashboard data</h2>
      <p style={{ color: theme.textMuted, maxWidth: '400px', margin: 0 }}>{error || 'The hospital profile could not be retrieved. Please ensure you are logged in correctly.'}</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>Retry Refresh</button>
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} style={{ padding: '12px 24px', background: theme.primary, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>Return to Login</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: theme.bgMain, backgroundImage: theme.bgGradient, color: theme.textMain, fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Top Navigation Bar */}
      <div className="animate-slide-down" style={{ padding: '0 40px', position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(255, 255, 255, 0.95)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', backdropFilter: 'blur(16px)' }}>
        <header style={{
          height: '76px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '45px', height: '45px', background: theme.primary,
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="material-symbols-rounded" style={{ color: 'white', fontSize: '1.8rem' }}>ecg</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 850, color: theme.primary, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Lifeline360</h1>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
            {['Dashboard', 'Staff Details', 'Patient Records', 'Stock Report', 'Programs', 'Leave Management', 'Activity Log'].map((name) => (
              <button
                key={name}
                onClick={() => setActiveTab(name)}
                className={`nav-link ${activeTab === name ? 'active' : ''}`}
                style={{
                  padding: '10px 0', borderRadius: '0', border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  color: activeTab === name ? theme.primary : theme.textMuted,
                  fontWeight: 600, fontSize: '0.88rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  outline: 'none'
                }}
              >
                {name}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right', marginRight: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: theme.textMain }}>{data.profile.name}</div>
              <div style={{ fontSize: '0.7rem', color: theme.primary, fontWeight: 800, textTransform: 'uppercase' }}>PHC ADMIN</div>
            </div>
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>logout</span>
              Logout
            </button>
          </div>
        </header>
      </div>

      <main style={{ padding: '20px 40px 60px', maxWidth: '1600px', margin: '0 auto' }}>

        {activeTab === 'Dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Dashboard content stays the same */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '30px' }}>
              <div style={{ position: 'relative', height: '440px', borderRadius: '32px', overflow: 'hidden', boxShadow: theme.shadowLg }}>
                <img
                  src={`/assets/phc/${data.profile.code}.jpg`}
                  alt={`${data.profile.name} preview`}
                  onError={(e) => { e.target.onerror = null; e.target.src = '/assets/phc_building_english.png'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)' }}></div>

                {data.profile.announcements?.length > 0 && (
                  <div style={{ position: 'absolute', top: '30px', left: '30px', right: '30px', padding: '16px 24px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: 'white', animation: 'slideUp 0.6s ease' }}>
                    <span className="material-symbols-rounded" style={{ color: theme.accent }}>notifications_active</span>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>{data.profile.announcements[0].text}</p>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>NOW</span>
                  </div>
                )}

                <div style={{ position: 'absolute', bottom: '40px', left: '40px', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                    <span style={{ background: theme.primary, padding: '5px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>{data.profile.type}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>ID: {data.profile.code}</span>
                  </div>
                  <h1 style={{ fontSize: '3.6rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-2px', lineHeight: 1 }}>{data.profile.name}</h1>
                  <p style={{ margin: '15px 0 0 0', opacity: 0.7, fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.5px' }}>{data.profile.district} DISTRICT • PRIMARY HEALTHCARE NETWORK</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'Total Staff Present', val: data.attendance.present, icon: 'groups', col: '#008000', bg: '#e8f5e9' },
                  { label: 'OPD Consultations', val: data.consultations, icon: 'medical_information', col: '#3b82f6', bg: '#eff6ff' },
                  { label: 'Stock Alerts', val: data.low_stock, icon: 'inventory_2', col: '#f59e0b', bg: '#fffbeb' }
                ].map((stat, i) => (
                  <div key={i} style={{
                    flex: 1, background: 'white', padding: '30px', borderRadius: '28px', border: `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', gap: '25px', boxShadow: theme.shadow
                  }}>
                    <div style={{ width: '64px', height: '64px', background: stat.bg, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-rounded" style={{ color: stat.col, fontSize: '2.2rem' }}>{stat.icon}</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, color: theme.textMuted, fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                      <h3 style={{ margin: '5px 0 0 0', fontSize: '2.4rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif" }}>{stat.val}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
              <div style={{ background: 'white', padding: '35px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>OPD Performance Trend</h3>
                    <p style={{ margin: '5px 0 0 0', color: theme.textMuted, fontSize: '0.9rem', fontWeight: 600 }}>Tracking patient consultations over time</p>
                  </div>
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: '5px', borderRadius: '15px', gap: '4px' }}>
                    {['1W', '1M', '3M', '1Y'].map(t => (
                      <button key={t} onClick={() => setTrendRange(t)} style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: trendRange === t ? 'white' : 'transparent', color: trendRange === t ? theme.primary : theme.textMuted, fontWeight: 700, fontSize: '0.8rem', boxShadow: trendRange === t ? '0 2px 6px rgba(0,0,0,0.05)' : 'none' }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ height: '380px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.opdTrend}>
                      <defs>
                        <linearGradient id="opdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.primary} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: theme.textLight, fontSize: 12, fontWeight: 700 }} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.textLight, fontSize: 12, fontWeight: 700 }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '15px' }} />
                      <Area type="monotone" dataKey="count" stroke={theme.primary} strokeWidth={4} fillOpacity={1} fill="url(#opdGrad)" animationDuration={2000} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', padding: '35px', borderRadius: '32px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', height: '536px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '25px', fontFamily: "'Outfit', sans-serif" }}>Real-time Feed</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '10px' }}>
                  {data.recentActivity.map((activity, i) => (
                    <div key={i} style={{ display: 'flex', gap: '15px', background: 'white', padding: '16px', borderRadius: '20px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: activity.type === 'alert' ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: activity.type === 'alert' ? '#ef4444' : theme.primary }}>{activity.icon}</span>
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: theme.textMain, lineHeight: 1.4 }}>{activity.title}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: theme.textLight, fontWeight: 800 }}>{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('Activity Log')}
                  style={{ marginTop: '20px', width: '100%', padding: '15px', background: '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: '16px', color: theme.textMuted, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.target.style.background = 'white'}
                  onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                >
                  View All Activity
                </button>
              </div>
            </div>

            <div style={{ background: 'white', padding: '35px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Medical Team Status</h3>
                <button style={{ padding: '8px 20px', background: theme.primaryLight, color: theme.primary, borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Manage Staff</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {data.doctors.map((doc, i) => (
                  <div key={i} style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
                        <span className="material-symbols-rounded" style={{ color: theme.textLight }}>person</span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{doc.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: theme.textMuted, fontWeight: 600 }}>{doc.special}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: doc.color, background: 'white', padding: '5px 12px', borderRadius: '10px', border: `1px solid ${doc.color}20` }}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'Staff Details' ? (
          <StaffDetails theme={theme} />
        ) : activeTab === 'Patient Records' ? (
          <PatientRecords theme={theme} />
        ) : activeTab === 'Stock Report' ? (
          <StockReport theme={theme} />
        ) : activeTab === 'Programs' ? (
          <Programs theme={theme} />
        ) : activeTab === 'Leave Management' ? (
          <LeaveManagement theme={theme} />
        ) : activeTab === 'Activity Log' ? (
          <div style={{ background: 'white', padding: '40px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowLg }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '35px', color: theme.textMain, fontFamily: "'Outfit', sans-serif", letterSpacing: '-1px' }}>Comprehensive System Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {data.recentActivity.map((activity, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '25px', background: '#f8fafc', padding: '25px', borderRadius: '24px', border: `1px solid ${theme.border}`, transition: 'transform 0.2s' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: activity.type === 'alert' ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '1.6rem', color: activity.type === 'alert' ? '#ef4444' : theme.primary }}>{activity.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: theme.textMain }}>{activity.title}</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: theme.textMuted, fontWeight: 600 }}>Recorded at {activity.time} • Secure Audit Log</p>
                  </div>
                  <span style={{ padding: '10px 20px', background: 'white', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, border: `1px solid ${theme.border}`, textTransform: 'uppercase' }}>{activity.type}</span>
                </div>
              ))}
              {data.recentActivity.length === 0 && (
                <div style={{ padding: '80px', textAlign: 'center', color: theme.textLight }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '4rem', opacity: 0.3 }}>history_toggle_off</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '20px' }}>No activity records found for this period.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'Staff Attendance' ? (
          <div style={{ background: 'white', padding: '40px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowLg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif", letterSpacing: '-1px', margin: 0 }}>Digital Attendance Register</h2>
                <p style={{ margin: '5px 0 0 0', color: theme.textMuted, fontSize: '1rem', fontWeight: 600 }}>Real-time staff check-in/out verification</p>
              </div>
              <button style={{ padding: '12px 28px', background: theme.primary, color: 'white', borderRadius: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 128, 0, 0.2)' }}>Export Report</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '15px 25px', color: theme.textLight, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Employee Profile</th>
                    <th style={{ padding: '15px 25px', color: theme.textLight, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Shift Details</th>
                    <th style={{ padding: '15px 25px', color: theme.textLight, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attendanceRecords.map((record, i) => (
                    <tr key={i} style={{ background: '#f8fafc', borderRadius: '20px' }}>
                      <td style={{ padding: '20px 25px', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
                        <div style={{ fontWeight: 800, color: theme.textMain, fontSize: '1.1rem' }}>{record.staff_name}</div>
                        <div style={{ fontSize: '0.85rem', color: theme.primary, fontWeight: 700 }}>{record.staff_role}</div>
                      </td>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: theme.textLight, display: 'block' }}>IN</span>
                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{record.check_in_time || '--:--'}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: theme.textLight, display: 'block' }}>OUT</span>
                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{record.check_out_time || '--:--'}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 25px', textAlign: 'center', borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
                        <span style={{
                          padding: '10px 24px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800,
                          background: record.status === 'present' ? '#f0fdf4' : '#fef2f2',
                          color: record.status === 'present' ? theme.primary : '#ef4444',
                          border: `1px solid ${record.status === 'present' ? '#dcfce7' : '#fee2e2'}`
                        }}>{record.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: '100px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', borderRadius: '40px', border: `2px dashed ${theme.border}`, boxShadow: theme.shadow }}>
            <div style={{ width: '80px', height: '80px', background: theme.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: theme.primary }}>construction</span>
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif" }}>{activeTab} Module</h2>
            <p style={{ color: theme.textMuted, fontSize: '1.2rem', maxWidth: '500px', margin: '15px auto 0' }}>We are currently building advanced analytical tools for this section.</p>
          </div>
        )}

      </main>

      <footer style={{ padding: '40px 80px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
        <div style={{ fontWeight: 700, color: theme.textLight, fontSize: '0.9rem' }}>© 2026 Lifeline 360 HIS • SECURE ACCESS</div>
        <div style={{ display: 'flex', gap: '30px', fontWeight: 800, fontSize: '0.85rem', color: theme.textMuted }}>
          <span>Privacy</span>
          <span>Security</span>
          <span>Support</span>
        </div>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        * { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default PHCDashboard;
