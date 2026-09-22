import React, { useState, useEffect } from 'react';
import { leaveService, staffService } from '../../../services/api';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Maternity Leave',
  'Emergency Leave',
  'Compensatory Leave',
];

const STATUS_COLORS = {
  Pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  Approved: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Cancelled: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

const PHCLeaveManagement = ({ theme }) => {
  const [leaves, setLeaves] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    staff_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const primaryGreen = '#008000';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [leavesRes, staffRes] = await Promise.all([
        leaveService.getAll(params),
        staffService.getAll(),
      ]);
      setLeaves(leavesRes.data || []);

      const rawStaff = staffRes?.data || staffRes || {};
      const list = Array.isArray(rawStaff)
        ? rawStaff
        : (rawStaff?.all || [...(rawStaff?.medical || []), ...(rawStaff?.cleaning || [])]);
      setStaffList(list || []);
    } catch (e) {
      console.error('Error fetching PHC leave data:', e);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leaveService.apply(form);
      showToast('Leave application submitted successfully!');
      setForm({ staff_id: '', leave_type: '', start_date: '', end_date: '', reason: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      showToast(err?.message || 'Failed to submit leave request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await leaveService.cancel(leaveId);
      showToast('Leave request cancelled.');
      fetchData();
    } catch (err) {
      showToast(err?.message || 'Failed to cancel leave request.', 'error');
    }
  };

  const filteredLeaves = leaves.filter(l => {
    if (filterStatus && filterStatus !== '' && l.status !== filterStatus) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.staff_name?.toLowerCase().includes(q) ||
      l.staff_id?.toLowerCase().includes(q) ||
      l.leave_type?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '10px 0' }}>

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '90px', right: '30px', zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: toast.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          padding: '14px 24px', borderRadius: '14px',
          fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.8px', fontFamily: "'Outfit', sans-serif" }}>
            Leave Management
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
            Apply and track staff leave requests
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: primaryGreen, color: 'white',
            border: 'none', borderRadius: '12px',
            padding: '12px 24px', fontWeight: 800, fontSize: '0.95rem',
            cursor: 'pointer', boxShadow: `0 4px 14px rgba(0, 128, 0, 0.3)`,
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1.5px)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Close Form' : 'Apply Leave'}
        </button>
      </div>

      {/* ── Apply Form Drawer / Modal Section ────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleApply} style={{
          background: 'white', borderRadius: '24px', padding: '32px',
          border: `1px solid rgba(226,232,240,0.8)`,
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              New Staff Leave Application
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
              Submits to DDHS for Approval
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>

            {/* Staff Member */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Staff Member *
              </label>
              <select
                required
                value={form.staff_id}
                onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  border: `1.5px solid rgba(226,232,240,0.9)`,
                  fontSize: '0.95rem', color: '#0f172a',
                  background: '#f8fafc', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="">Select PHC staff member…</option>
                {staffList.map(s => (
                  <option key={s.staff_id} value={s.staff_id}>{s.name} ({s.role}) — {s.staff_id}</option>
                ))}
              </select>
            </div>

            {/* Leave Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Leave Type *
              </label>
              <select
                required
                value={form.leave_type}
                onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  border: `1.5px solid rgba(226,232,240,0.9)`,
                  fontSize: '0.95rem', color: '#0f172a',
                  background: '#f8fafc', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="">Select leave type…</option>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Start Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  border: `1.5px solid rgba(226,232,240,0.9)`,
                  fontSize: '0.95rem', color: '#0f172a',
                  background: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            {/* End Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                End Date *
              </label>
              <input
                type="date"
                required
                min={form.start_date}
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  border: `1.5px solid rgba(226,232,240,0.9)`,
                  fontSize: '0.95rem', color: '#0f172a',
                  background: '#f8fafc', outline: 'none'
                }}
              />
            </div>

            {/* Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Reason *
              </label>
              <textarea
                required
                rows={3}
                placeholder="State reason for the leave application..."
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  border: `1.5px solid rgba(226,232,240,0.9)`,
                  fontSize: '0.95rem', color: '#0f172a',
                  background: '#f8fafc', outline: 'none', resize: 'vertical', fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ staff_id: '', leave_type: '', start_date: '', end_date: '', reason: '' }); }}
              style={{
                padding: '12px 24px', borderRadius: '12px', fontWeight: 700,
                border: `1.5px solid rgba(226,232,240,0.8)`,
                background: 'white', color: '#475569', cursor: 'pointer', fontSize: '0.95rem'
              }}
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 28px', borderRadius: '12px', fontWeight: 800,
                background: submitting ? '#94a3b8' : primaryGreen,
                color: 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: submitting ? 'none' : `0 4px 14px rgba(0, 128, 0, 0.3)`
              }}
            >
              {submitting && <span className="material-symbols-rounded" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }}>refresh</span>}
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '4px 0 10px 0' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Filter:</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'All', value: '' },
            { label: 'Pending', value: 'Pending' },
            { label: 'Approved', value: 'Approved' },
            { label: 'Rejected', value: 'Rejected' },
          ].map(item => {
            const isActive = filterStatus === item.value;
            return (
              <button
                key={item.label}
                onClick={() => setFilterStatus(item.value)}
                style={{
                  padding: '7px 22px', borderRadius: '24px', fontWeight: 700, fontSize: '0.88rem',
                  border: 'none',
                  background: isActive ? primaryGreen : '#f1f5f9',
                  color: isActive ? 'white' : '#475569',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 10px rgba(0, 128, 0, 0.2)' : 'none'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Leave Request Container ────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: '24px',
        border: `1.5px solid rgba(226,232,240,0.7)`,
        boxShadow: '0 4px 25px -5px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        minHeight: '340px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '3rem', opacity: 0.5, animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ marginTop: '16px', fontWeight: 600 }}>Loading leave records…</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            {/* Custom Calendar Icon with X */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              border: '2.5px solid #94a3b8', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', position: 'relative',
              boxSizing: 'border-box'
            }}>
              <div style={{ position: 'absolute', top: '-6px', display: 'flex', gap: '14px' }}>
                <div style={{ width: '6px', height: '8px', background: '#94a3b8', borderRadius: '2px' }}></div>
                <div style={{ width: '6px', height: '8px', background: '#94a3b8', borderRadius: '2px' }}></div>
              </div>
              <div style={{ width: '100%', height: '14px', borderBottom: '2px solid #94a3b8', position: 'absolute', top: 0 }}></div>
              <span className="material-symbols-rounded" style={{ fontSize: '2.2rem', color: '#94a3b8', marginTop: '12px' }}>close</span>
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#475569' }}>No leave requests found.</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1px solid rgba(226,232,240,0.8)` }}>
                  {['Staff Member', 'Leave Type', 'Duration', 'Days', 'Reason', 'Applied On', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((lv, i) => {
                  const sc = STATUS_COLORS[lv.status] || STATUS_COLORS.Cancelled;
                  return (
                    <tr
                      key={lv.leave_id}
                      style={{ borderBottom: `1px solid rgba(226,232,240,0.5)`, background: i % 2 === 0 ? 'white' : '#fafbfc' }}
                    >
                      {/* Staff */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{lv.staff_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{lv.staff_role} · {lv.staff_id}</div>
                      </td>

                      {/* Leave Type */}
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {lv.leave_type}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{lv.start_date ? new Date(lv.start_date).toLocaleDateString('en-GB') : ''}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>to {lv.end_date ? new Date(lv.end_date).toLocaleDateString('en-GB') : ''}</div>
                      </td>

                      {/* Days */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px',
                          background: `rgba(0,128,0,0.1)`, color: primaryGreen,
                          borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem'
                        }}>{lv.total_days}d</span>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '16px 20px', maxWidth: '240px' }}>
                        <div style={{ fontSize: '0.88rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lv.reason}>
                          {lv.reason}
                        </div>
                        {lv.remarks && (
                          <div style={{ fontSize: '0.76rem', color: '#4f46e5', marginTop: '3px', fontWeight: 600 }}>
                            Remark: "{lv.remarks}"
                          </div>
                        )}
                      </td>

                      {/* Applied On */}
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(lv.applied_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '5px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem',
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`
                        }}>
                          {lv.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px 20px' }}>
                        {lv.status === 'Pending' ? (
                          <button
                            onClick={() => handleCancel(lv.leave_id)}
                            style={{
                              padding: '6px 14px', borderRadius: '10px', fontWeight: 700,
                              background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                              fontSize: '0.82rem', whiteSpace: 'nowrap',
                              display: 'inline-flex', alignItems: 'center', gap: '5px'
                            }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>cancel</span>
                            Cancel
                          </button>
                        ) : lv.status === 'Approved' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', borderRadius: '10px', fontWeight: 700,
                            background: 'rgba(0,128,0,0.06)', color: '#008000',
                            border: '1px solid rgba(0,128,0,0.2)',
                            fontSize: '0.78rem', whiteSpace: 'nowrap'
                          }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>lock</span>
                            DDHS Approved
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', borderRadius: '10px', fontWeight: 700,
                            background: lv.status === 'Rejected' ? 'rgba(239,68,68,0.06)' : 'rgba(100,116,139,0.08)',
                            color: lv.status === 'Rejected' ? '#b91c1c' : '#475569',
                            border: lv.status === 'Rejected' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(148,163,184,0.3)',
                            fontSize: '0.78rem', whiteSpace: 'nowrap'
                          }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                              {lv.status === 'Rejected' ? 'thumb_down' : 'event_busy'}
                            </span>
                            {lv.status === 'Rejected' ? 'Rejected' : 'Cancelled'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PHCLeaveManagement;
