import React, { useState, useEffect, useCallback } from 'react';
import { leaveService, staffService, hospitalService } from '../../services/api';
import '../../styles/App.css';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Maternity Leave',
  'Emergency Leave',
  'Compensatory Leave',
];

const STATUS_CONFIG = {
  Pending: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'hourglass_top' },
  Approved: { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: 'check_circle' },
  Rejected: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: 'cancel' },
  Cancelled: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', icon: 'block' },
};

const TYPE_COLORS = {
  'Casual Leave': '#8b5cf6',
  'Sick Leave': '#ef4444',
  'Earned Leave': '#10b981',
  'Maternity Leave': '#ec4899',
  'Emergency Leave': '#f97316',
  'Compensatory Leave': '#3b82f6',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, subtitle }) => (
  <div className="glass-card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px',
      borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center',
      justifyContent: 'center'
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: '2rem', color }}>{icon}</span>
    </div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 4px' }}>
      {value}
    </div>
    {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: '0.85rem' }}>{cfg.icon}</span>
      {status}
    </span>
  );
};

// ─── Apply Leave Modal ────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const ApplyLeaveModal = ({ onClose, onSuccess, staffList }) => {
  const [form, setForm] = useState({
    staff_id: '', leave_type: '', start_date: '', end_date: '', reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await leaveService.apply(form);
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Failed to apply leave.');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="glass-panel animate-scale-in" style={{ width: '520px', maxHeight: '90vh', overflow: 'auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Apply for Leave</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Submit a new leave request on behalf of staff</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#ef4444', fontSize: '0.82rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Staff Selection */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Staff Member *
            </label>
            <select
              required
              value={form.staff_id}
              onChange={e => field('staff_id', e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select Staff —</option>
              {staffList.map(s => (
                <option key={s.staff_id} value={s.staff_id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Leave Type *
            </label>
            <select
              required
              value={form.leave_type}
              onChange={e => field('leave_type', e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select Leave Type —</option>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Date Range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Start Date *</label>
              <input type="date" required value={form.start_date} onChange={e => field('start_date', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>End Date *</label>
              <input type="date" required value={form.end_date} min={form.start_date} onChange={e => field('end_date', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Reason *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={e => field('reason', e.target.value)}
              placeholder="Provide a brief reason for the leave..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Review Modal ─────────────────────────────────────────────────────────────
const ReviewModal = ({ leave, onClose, onSuccess }) => {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (status) => {
    setLoading(true);
    try {
      await leaveService.review(leave.leave_id, { status, remarks });
      onSuccess();
    } catch (err) {
      alert(err?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="glass-panel animate-scale-in" style={{ width: '480px', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Review Leave Request</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{leave.leave_id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>✕</button>
        </div>

        {/* Leave details */}
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InfoRow label="Staff" value={leave.staff_name} />
            <InfoRow label="Role" value={leave.staff_role} />
            <InfoRow label="Hospital" value={leave.hospital_name || leave.hospital_id} />
            <InfoRow label="Leave Type" value={leave.leave_type} />
            <InfoRow label="Start Date" value={leave.start_date ? new Date(leave.start_date).toLocaleDateString('en-GB') : ''} />
            <InfoRow label="End Date" value={leave.end_date ? new Date(leave.end_date).toLocaleDateString('en-GB') : ''} />
            <InfoRow label="Total Days" value={`${leave.total_days} working day(s)`} />
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Reason</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{leave.reason}</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Remarks (optional)
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Add a note for the staff member..."
            style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
          <button
            onClick={() => handleAction('Rejected')} disabled={loading}
            style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, background: '#fef2f2', color: '#ef4444', transition: 'all 0.2s' }}
          >Reject</button>
          <button
            onClick={() => handleAction('Approved')} disabled={loading}
            className="btn btn-primary" style={{ flex: 1 }}
          >{loading ? '…' : 'Approve'}</button>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{value || '—'}</div>
  </div>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.1)', background: 'white',
  color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none',
  boxSizing: 'border-box'
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [staffList, setStaffList] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  // eslint-disable-next-line no-unused-vars
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (hospitalFilter) params.hospital_id = hospitalFilter;
      if (typeFilter) params.leave_type = typeFilter;

      const [leavesRes, summaryRes] = await Promise.all([
        leaveService.getAll(params),
        leaveService.getSummary(),
      ]);
      setLeaves(leavesRes.data || []);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch leave data:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, hospitalFilter, typeFilter]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      fetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    staffService.getAll().then(r => {
      const staffData = r.data;
      const list = Array.isArray(staffData)
        ? staffData
        : (staffData?.all || [...(staffData?.medical || []), ...(staffData?.cleaning || [])]);
      setStaffList(list || []);
    }).catch(() => { });
    hospitalService.getAll().then(r => setHospitals(r.data || [])).catch(() => { });
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleApplySuccess = () => {
    setShowApplyModal(false);
    fetchAll();
  };

  const handleReviewSuccess = () => {
    setReviewTarget(null);
    setStatusFilter(''); // Reset to "All Status" so approved/rejected record is visible
    fetchAll();
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await leaveService.cancel(leaveId);
      fetchAll();
    } catch (err) {
      alert(err?.message || 'Failed to cancel.');
    }
  };

  const filteredLeaves = leaves.filter(l => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.staff_name?.toLowerCase().includes(q) ||
      l.staff_id?.toLowerCase().includes(q) ||
      l.hospital_name?.toLowerCase().includes(q) ||
      l.leave_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.8rem' }}>task_alt</span>
              Leave Approvals
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Review and approve staff leave requests submitted from all PHCs in your district
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '12px', background: 'rgba(0, 128, 0, 0.08)',
            border: '1px solid rgba(0, 128, 0, 0.2)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>gavel</span>
            District Approval Authority
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <StatCard icon="pending" label="Pending Review" value={summary?.pending ?? '—'} color="#f59e0b" subtitle="Awaiting DDHS action" />
          <StatCard icon="check_circle" label="Approved" value={summary?.approved ?? '—'} color="#10b981" subtitle="This month" />
          <StatCard icon="cancel" label="Rejected" value={summary?.rejected ?? '—'} color="#ef4444" subtitle="This month" />
          <StatCard icon="event_note" label="Total Requests" value={summary?.totalThisMonth ?? '—'} color="#8b5cf6" subtitle="This calendar month" />
        </div>

        {/* ── Leave Type Breakdown ── */}
        {summary?.typeBreakdown?.length > 0 && (
          <div className="glass-panel p-4" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>donut_small</span>
              Leave Type Distribution (This Month)
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {summary.typeBreakdown.map(t => (
                <div key={t._id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
                  background: `${TYPE_COLORS[t._id] || '#64748b'}15`,
                  border: `1px solid ${TYPE_COLORS[t._id] || '#64748b'}30`,
                  color: TYPE_COLORS[t._id] || '#64748b'
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{t.count}</span>
                  {t._id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filters + Table ── */}
        <div className="glass-panel p-4">
          {/* Filter row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.1rem' }}>search</span>
              <input
                type="text"
                placeholder="Search by name, ID, hospital…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '38px' }}
              />
            </div>

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '140px' }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Leave type filter */}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: '180px' }}>
              <option value="">All Leave Types</option>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Hospital filter */}
            <select value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)} style={{ ...inputStyle, width: '200px' }}>
              <option value="">All Health Centres</option>
              {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
            </select>

            <button onClick={fetchAll} className="btn btn-outline" style={{ whiteSpace: 'nowrap', padding: '10px 16px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>refresh</span>
            </button>
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Staff Member</th>
                  <th>Hospital</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                        Loading leave requests…
                      </div>
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '50px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '3rem' }}>event_busy</span>
                        <span style={{ fontWeight: 600 }}>No leave requests found</span>
                        <span style={{ fontSize: '0.8rem' }}>Try adjusting your filters or apply a new request</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeaves.map(leave => (
                  <tr key={leave.leave_id}>
                    {/* Leave ID */}
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                        {leave.leave_id}
                      </span>
                    </td>

                    {/* Staff */}
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{leave.staff_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{leave.staff_role} · {leave.staff_id}</div>
                    </td>

                    {/* Hospital */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{leave.hospital_name || leave.hospital_id}</div>
                    </td>

                    {/* Leave Type */}
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                        background: `${TYPE_COLORS[leave.leave_type] || '#64748b'}18`,
                        color: TYPE_COLORS[leave.leave_type] || '#64748b',
                        border: `1px solid ${TYPE_COLORS[leave.leave_type] || '#64748b'}30`
                      }}>
                        {leave.leave_type}
                      </span>
                    </td>

                    {/* Duration */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{leave.start_date ? new Date(leave.start_date).toLocaleDateString('en-GB') : ''} → {leave.end_date ? new Date(leave.end_date).toLocaleDateString('en-GB') : ''}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{leave.total_days} working day(s)</div>
                    </td>

                    {/* Applied On */}
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(leave.applied_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Status */}
                    <td><StatusBadge status={leave.status} /></td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {leave.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => setReviewTarget(leave)}
                              style={{
                                padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 700, background: 'rgba(0,128,0,0.1)',
                                color: 'var(--primary)', transition: 'all 0.2s'
                              }}
                            >Review</button>
                            <button
                              onClick={() => handleCancel(leave.leave_id)}
                              style={{
                                padding: '5px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 700, background: 'rgba(0,0,0,0.04)',
                                color: 'var(--text-muted)', transition: 'all 0.2s'
                              }}
                            >Cancel</button>
                          </>
                        )}
                        {leave.status !== 'Pending' && leave.remarks && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.remarks}>
                            "{leave.remarks}"
                          </span>
                        )}
                        {leave.status !== 'Pending' && !leave.remarks && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Result count */}
          {!loading && (
            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              Showing {filteredLeaves.length} of {leaves.length} request(s)
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {reviewTarget && (
        <ReviewModal
          leave={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select, input, textarea { transition: border-color 0.2s; }
        select:focus, input:focus, textarea:focus { border-color: var(--primary) !important; }
        tr:hover td { background: rgba(0,128,0,0.02) !important; }
      `}</style>
    </div>
  );
};

export default LeaveManagement;
