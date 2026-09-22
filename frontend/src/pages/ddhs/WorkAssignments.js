import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DDHSWorkAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // For viewing report
  const [previewFile, setPreviewFile] = useState(null); // For viewing evidence images/docs
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClinic, setFilterClinic] = useState('All');

  const [formData, setFormData] = useState({
    title: '',
    category: 'Others',
    assigned_to: '',
    due_date: '',
    priority: 'Medium',
    description: ''
  });

  const openInNewTab = (file) => {
    if (!file || !file.url) return;
    if (file.url.includes('placeholder.com')) {
      alert('This is an old test report with no real file.');
      return;
    }

    if (file.url.startsWith('data:')) {
      try {
        const parts = file.url.split(';base64,');
        const contentType = parts[0].split(':')[1] || 'image/png';
        const byteCharacters = atob(parts[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (e) {
        console.error(e);
        const win = window.open('');
        if (win) {
          win.document.write(`<html><head><title>${file.filename || 'Preview'}</title></head><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${file.url}" alt="File Preview" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`);
        }
      }
    } else {
      window.open(file.url, '_blank');
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/work', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAssignments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    }
  };

  const fetchClinics = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/hospitals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setClinics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch clinics', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchAssignments(), fetchClinics()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleAssignWork = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/work', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setShowModal(false);
        setFormData({ title: '', category: 'Others', assigned_to: '', due_date: '', priority: 'Medium', description: '' });
        fetchAssignments();
        alert('Work assigned successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign work');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--primary)' }}>Loading assignments...</div>;

  const getStatusColor = (status) => {
    if (status === 'Completed') return { bg: '#dcfce7', text: '#16a34a' };
    if (status === 'Under Review') return { bg: '#eff6ff', text: '#3b82f6' };
    if (status === 'Action Required') return { bg: '#fef2f2', text: '#ef4444' };
    if (status === 'In Progress') return { bg: '#e0e7ff', text: '#4f46e5' };
    return { bg: '#fef3c7', text: '#d97706' }; // Pending
  };

  const handleVerify = async (taskId, decision, feedback) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/work/${taskId}/verify`, {
        status: decision === 'approve' ? 'Completed' : 'Action Required',
        feedback: feedback
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert(decision === 'approve' ? 'Report approved and task completed!' : 'Feedback sent to PHC.');
        setSelectedTask(null);
        fetchAssignments();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Verification failed';
      alert(`Verification Error: ${errorMsg}`);
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return '#ef4444';
    if (priority === 'Medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 5px 0' }}>Work Assignments</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Assign and track tasks across your district's health centres.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '5px 15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>filter_alt</span>
            <select
              value={filterClinic}
              onChange={e => setFilterClinic(e.target.value)}
              style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', background: 'transparent', cursor: 'pointer' }}
            >
              <option value="All">All Health Centres</option>
              {clinics.map(c => <option key={c.hospital_id} value={c.hospital_id}>{c.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 700 }}
          >
            <span className="material-symbols-rounded">add_task</span>
            Assign New Work
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', marginBottom: '30px' }}>
        {[
          { label: 'Total Tasks', value: assignments.length, icon: 'assignment', color: '#3b82f6', bg: '#eff6ff', status: 'All' },
          { label: 'Awaiting Review', value: assignments.filter(a => a.status === 'Under Review').length, icon: 'rate_review', color: '#3b82f6', bg: '#eff6ff', status: 'Under Review' },
          { label: 'Pending', value: assignments.filter(a => a.status === 'Pending').length, icon: 'pending_actions', color: '#f59e0b', bg: '#fffbeb', status: 'Pending' },
          { label: 'Action Required', value: assignments.filter(a => a.status === 'Action Required').length, icon: 'error_outline', color: '#ef4444', bg: '#fef2f2', status: 'Action Required' },
          { label: 'Auto-Reassigned', value: assignments.filter(a => a.is_reassigned).length, icon: 'replay', color: '#d97706', bg: '#fff7ed', status: 'Reassigned' },
          { label: 'Completed', value: assignments.filter(a => a.status === 'Completed').length, icon: 'task_alt', color: '#10b981', bg: '#ecfdf5', status: 'Completed' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => setFilterStatus(stat.status)}
            className="glass-card"
            style={{
              padding: '15px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              border: filterStatus === stat.status ? `2px solid ${stat.color}` : '2px solid transparent',
              transition: 'all 0.2s',
              transform: filterStatus === stat.status ? 'translateY(-5px)' : 'none',
              boxShadow: filterStatus === stat.status ? `0 10px 20px ${stat.color}20` : 'none'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ color: stat.color, fontSize: '1.3rem' }}>{stat.icon}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{stat.label}</p>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Assignments Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            {filterStatus === 'All' ? 'All Assignments' : `${filterStatus} Tasks`}
            {filterClinic !== 'All' && ` for ${clinics.find(c => c.hospital_id === filterClinic)?.name}`}
          </h3>
          {(filterStatus !== 'All' || filterClinic !== 'All') && (
            <button
              onClick={() => { setFilterStatus('All'); setFilterClinic('All'); }}
              style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>filter_alt_off</span> Clear All Filters
            </button>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
              {['Task Title', 'Assigned Clinic', 'Category', 'Due Date', 'Status', 'Report'].map((h, i) => (
                <th key={i} style={{ padding: '15px 10px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments
              .filter(task => filterStatus === 'All' || (filterStatus === 'Reassigned' ? task.is_reassigned : task.status === filterStatus))
              .filter(task => filterClinic === 'All' || task.assigned_to === filterClinic)
              .length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No work assignments match the selected filters.</td></tr>
            ) : assignments
              .filter(task => filterStatus === 'All' || (filterStatus === 'Reassigned' ? task.is_reassigned : task.status === filterStatus))
              .filter(task => filterClinic === 'All' || task.assigned_to === filterClinic)
              .map(task => {
                const statusStyle = getStatusColor(task.status);
                const clinic = clinics.find(c => c.hospital_id === task.assigned_to);
                const clinicName = clinic ? clinic.name : task.assigned_to;

                return (
                  <tr key={task.work_id || task._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '15px 10px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {task.title}
                        {task.is_reassigned && (
                          <span style={{ background: '#fff7ed', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '0.85rem' }}>replay</span> Auto-Reassigned #{task.reassigned_count || 1}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getPriorityColor(task.priority) }}></span>
                        {task.priority} Priority
                      </div>
                    </td>
                    <td style={{ padding: '15px 10px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>{clinicName}</td>
                    <td style={{ padding: '15px 10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{task.category}</td>
                    <td style={{ padding: '15px 10px', fontWeight: 700, fontSize: '0.85rem' }}>
                      <div>{new Date(task.due_date).toLocaleDateString()}</div>
                      {task.is_reassigned && task.original_due_date && (
                        <div style={{ fontSize: '0.7rem', color: '#ef4444', textDecoration: 'line-through' }}>
                          Was: {new Date(task.original_due_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '15px 10px' }}>
                      <span style={{
                        padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                        background: statusStyle.bg, color: statusStyle.text
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ padding: '15px 10px' }}>
                      {task.status === 'Completed' || task.status === 'Under Review' || task.status === 'Action Required' ? (
                        <button
                          onClick={() => setSelectedTask(task)}
                          style={{
                            background: task.status === 'Under Review' ? '#eff6ff' : '#ecfdf5',
                            color: task.status === 'Under Review' ? '#3b82f6' : '#10b981',
                            border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                          }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>{task.status === 'Under Review' ? 'rate_review' : 'visibility'}</span>
                          {task.status === 'Under Review' ? 'Review' : 'View'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Pending...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Assign Work Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '600px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Assign New Work</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignWork} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Target Clinic / PHC</label>
                  <select
                    required
                    value={formData.assigned_to}
                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select a Health Centre</option>
                    {clinics.map(c => <option key={c.hospital_id} value={c.hospital_id}>{c.name} ({c.hospital_id})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Due Date</label>
                  <input type="date" required value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="form-input" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Task Title</label>
                <input type="text" required placeholder="e.g., Monthly Vaccination Drive" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="form-input" />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="form-input">
                    {['Vaccination', 'Camp', 'Survey', 'Training', 'Inspection', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="form-input">
                    {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Description / Instructions</label>
                <textarea rows="4" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-input" placeholder="Provide detailed instructions for the PHC..."></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '12px 25px', borderRadius: '10px', fontWeight: 700 }}>
                  {submitting ? 'Assigning...' : 'Assign Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Verify Report Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: '20px'
        }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '580px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '28px 32px', background: 'white', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

            {/* Fixed Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '1.4rem' }}>description</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Task Completion Report</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{selectedTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PHC Submission Note:</p>
                <p style={{ margin: 0, color: '#0f172a', fontSize: '0.92rem', lineHeight: '1.6' }}>
                  {selectedTask.completion_note || 'No additional notes provided.'}
                </p>
              </div>

              {selectedTask.report_files && selectedTask.report_files.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>Attached Evidence ({selectedTask.report_files.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {selectedTask.report_files.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewFile(file)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                          background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.background = '#eff6ff';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = '#f8fafc';
                        }}
                      >
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '1.2rem' }}>
                            {file.filetype?.includes('pdf') ? 'picture_as_pdf' :
                              file.filetype?.includes('excel') ? 'table_chart' :
                                file.filetype?.includes('image') ? 'image' : 'insert_drive_file'}
                          </span>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', marginRight: '8px' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                            Uploaded on {new Date(file.uploaded_at || selectedTask.created_at).toLocaleDateString()} at {new Date(file.uploaded_at || selectedTask.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '8px', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>visibility</span>
                          <span>View</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              {selectedTask.status === 'Under Review' ? (
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verification Action:</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => handleVerify(selectedTask._id, 'reject', prompt('Enter feedback for PHC:'))}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ef4444', background: 'white', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => handleVerify(selectedTask._id, 'approve')}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                    >
                      Approve & Complete
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Status: <strong style={{ color: '#0f172a' }}>{selectedTask.status}</strong></span>
                  <button onClick={() => setSelectedTask(null)} className="btn btn-outline" style={{ padding: '8px 20px', borderRadius: '10px' }}>Close</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <style>{`
        .form-input {
          width: 100%; padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);
          background: rgba(255,255,255,0.5); color: var(--text-main); font-family: inherit; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
        }
        .form-input:focus { border-color: var(--primary); background: white; }
      `}</style>
      {/* Evidence File Preview Modal */}
      {previewFile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 4000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Preview Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '1.5rem' }}>
                  {previewFile.filetype?.includes('pdf') ? 'picture_as_pdf' :
                    previewFile.filetype?.includes('excel') ? 'table_chart' :
                      previewFile.filetype?.includes('image') ? 'image' : 'description'}
                </span>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewFile.filename}
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => openInNewTab(previewFile)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                    borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white',
                    color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>open_in_new</span>
                  Open in New Tab
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                    background: '#e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>close</span>
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div style={{
              flex: 1, padding: '24px', overflowY: 'auto', display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: '#0f172a'
            }}>
              {(previewFile.filetype?.includes('image') || previewFile.url?.startsWith('data:image/') || previewFile.filename?.match(/\.(png|jpe?g|gif|webp|svg)$/i)) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                />
              ) : (previewFile.filetype?.includes('pdf') || previewFile.url?.startsWith('data:application/pdf') || previewFile.filename?.endsWith('.pdf')) ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.filename}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px', background: 'white' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '4rem', color: '#3b82f6', marginBottom: '15px' }}>description</span>
                  <h3 style={{ margin: '0 0 10px 0' }}>{previewFile.filename}</h3>
                  <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Preview is best viewed in a new tab.</p>
                  <button
                    onClick={() => openInNewTab(previewFile)}
                    style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Open Document in New Tab
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DDHSWorkAssignments;
