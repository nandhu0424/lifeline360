import React, { useState, useEffect } from 'react';
import { alertService } from '../../services/api';
import '../../styles/App.css';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterSeverity]);

  const fetchAlerts = async () => {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterSeverity) params.severity = filterSeverity;

      const res = await alertService.getAll(params);
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await alertService.resolve(id);
      setAlerts(alerts.map(a => a._id === id ? { ...a, status: 'resolved' } : a));
    } catch (err) {
      alert('Failed to resolve alert.');
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <span className="material-symbols-rounded" style={{ color: 'var(--danger)' }}>error</span>;
      case 'medium': return <span className="material-symbols-rounded" style={{ color: 'var(--warning)' }}>warning</span>;
      case 'low': return <span className="material-symbols-rounded" style={{ color: 'var(--primary)' }}>info</span>;
      default: return <span className="material-symbols-rounded">help</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="p-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>District Alert Feed</h3>

          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)' }}
            >
              <option value="">All Types</option>
              <option value="absenteeism">Absenteeism</option>
              <option value="low_stock">Low Stock</option>
              <option value="disease_outbreak">Disease Outbreak</option>
              <option value="low_opd">Low OPD Count</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)' }}
            >
              <option value="">All Severities</option>
              <option value="high">High (Critical)</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Monitoring system events...</div>
          ) : alerts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No active alerts matched your filters.</p>
            </div>
          ) : alerts.map(alert => (
            <div
              key={alert._id}
              className={`glass-panel animate-fade-in ${alert.status === 'resolved' ? 'resolved-alert' : ''}`}
              style={{
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '50px 1fr 120px',
                alignItems: 'center',
                borderLeft: `5px solid ${alert.severity === 'high' ? 'var(--danger)' :
                    alert.severity === 'medium' ? 'var(--warning)' :
                      'var(--primary)'
                  }`,
                opacity: alert.status === 'resolved' ? 0.6 : 1
              }}
            >
              <div style={{
                width: '40px', height: '40px',
                background: `${alert.severity === 'high' ? 'var(--danger)' :
                    alert.severity === 'medium' ? 'var(--warning)' :
                      'var(--primary)'
                  }15`,
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem'
              }}>{getSeverityIcon(alert.severity)}</div>

              <div>
                <div className="flex items-center gap-3">
                  <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{alert.type.replace(/_/g, ' ').toUpperCase()}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.9rem', marginTop: '5px', color: alert.status === 'resolved' ? 'var(--text-muted)' : 'var(--text-main)' }}>{alert.message}</p>
                <p style={{ fontSize: '0.75rem', marginTop: '5px', color: 'var(--primary)', fontWeight: 600 }}>{alert.hospital_name || alert.hospital_id}</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                {alert.status === 'resolved' ? (
                  <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700 }}>✅ RESOLVED</span>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    onClick={() => handleResolve(alert._id)}
                  >
                    Resolve
                  </button>
                )}
                <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {alert.email_sent ? '📧 Email Sent' : '⏳ Email Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
