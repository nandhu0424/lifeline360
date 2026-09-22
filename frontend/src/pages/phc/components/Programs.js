import React, { useState, useEffect } from 'react';
import { programService, workService } from '../../../services/api';

const Programs = ({ theme }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportingItem, setReportingItem] = useState(null);
  const [reportNote, setReportNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progRes, workRes] = await Promise.all([
          programService.getAll(),
          workService.getAll()
        ]);
        
        const combined = [
          ...(progRes.data || []),
          ...(workRes.data || []).map(w => ({ ...w, isWork: true }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setPrograms(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReportSubmit = async () => {
    if (!reportingItem) return;
    try {
      // Helper to convert file to base64
      const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const processedFiles = await Promise.all(selectedFiles.map(async f => ({
        url: await toBase64(f),
        filename: f.name,
        filetype: f.type
      })));

      const payload = { 
        notes: reportNote || 'Completed as per instructions.',
        files: processedFiles
      };

      if (reportingItem.isWork) {
        await workService.report(reportingItem._id, { completion_note: payload.notes, files: payload.files });
        alert('Report submitted for verification to DDHS.');
      } else {
        await programService.report(reportingItem._id, payload);
        alert('Program report submitted successfully.');
      }

      setPrograms(programs.map(p => p._id === reportingItem._id ? { ...p, status: reportingItem.isWork ? 'Under Review' : 'Completed' } : p));
      setReportingItem(null);
      setReportNote('');
      setSelectedFiles([]);
    } catch (err) {
      console.error(err);
      alert('Failed to submit report. Ensure files are not too large.');
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Completed') return { bg: '#f0fdf4', color: theme.primary };
    if (status === 'Under Review') return { bg: '#eff6ff', color: '#3b82f6' };
    if (status === 'Action Required') return { bg: '#fef2f2', color: '#ef4444' };
    return { bg: '#fffbeb', color: '#f59e0b' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Top Announcement Bar for New Programs */}
      {programs.filter(p => p.status === 'Pending').length > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`, padding: '20px 30px', borderRadius: '24px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 25px rgba(16,185,129,0.3)', animation: 'slideUp 0.5s ease' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>campaign</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>New Program Announcement from DDHS</h3>
            <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Please review and execute the latest awareness/vaccination programs.</p>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '40px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowLg }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif", margin: '0 0 30px 0', letterSpacing: '-1px' }}>Programs & Campaigns</h2>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          {loading ? <p>Loading...</p> : programs.map(p => (
            <div key={p._id} style={{ padding: '25px', borderRadius: '20px', border: `1px solid ${theme.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span style={{ 
                    padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                    ...getStatusStyle(p.status)
                  }}>
                    {p.status.toUpperCase()}
                  </span>
                  {p.is_reassigned && (
                    <span style={{ 
                      padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                      background: '#fff7ed', color: '#d97706', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '0.9rem' }}>replay</span> AUTO-REASSIGNED #{p.reassigned_count || 1}
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: theme.textLight, fontWeight: 700 }}>
                    Due: {p.end_date || p.due_date ? new Date(p.end_date || p.due_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 800, color: theme.textMain }}>
                  {p.title} {p.isWork && <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>(Assignment)</span>}
                </h3>
                <p style={{ margin: '0 0 10px 0', color: theme.textMuted, fontSize: '0.9rem', maxWidth: '600px' }}>{p.description}</p>
                
                {p.is_reassigned && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '12px', marginTop: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-symbols-rounded" style={{ color: '#d97706', fontSize: '1.2rem' }}>warning</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                      Due date passed before completion. DDHS was notified and this task was automatically reassigned to your PHC with an extended deadline.
                    </p>
                  </div>
                )}

                {p.status === 'Action Required' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '12px 15px', borderRadius: '12px', marginTop: '10px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Feedback from DDHS:</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b', fontStyle: 'italic' }}>{p.completion_note || 'Please review your submission and provide more details.'}</p>
                  </div>
                )}
              </div>
              
              <div>
                {p.status === 'Pending' || p.status === 'In Progress' || p.status === 'Action Required' ? (
                  <button onClick={() => setReportingItem(p)} style={{ padding: '12px 24px', background: theme.primary, color: 'white', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>upload_file</span> Report Completion
                  </button>
                ) : (
                  <button disabled style={{ padding: '12px 24px', background: p.status === 'Under Review' ? '#eff6ff' : '#e2e8f0', color: p.status === 'Under Review' ? '#3b82f6' : theme.textLight, borderRadius: '12px', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>{p.status === 'Under Review' ? 'schedule' : 'check_circle'}</span> 
                    {p.status === 'Under Review' ? 'Awaiting Verification' : 'Completed'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {programs.length === 0 && !loading && <p style={{ color: theme.textMuted }}>No programs assigned currently.</p>}
        </div>
      </div>

      {/* Report Modal */}
      {reportingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '28px 32px', borderRadius: '28px', width: '100%', maxWidth: '550px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: theme.textMain, letterSpacing: '-0.5px' }}>Report Completion</h2>
                <p style={{ color: theme.textMuted, margin: '4px 0 0 0', fontSize: '0.85rem' }}>Upload evidence and add notes for <strong style={{ color: theme.textMain }}>{reportingItem.title}</strong></p>
              </div>
              <button 
                onClick={() => setReportingItem(null)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme.textMuted, transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>close</span>
              </button>
            </div>
            
            {/* Modal Body - Scrollable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '6px', flex: 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: theme.textMain }}>Completion Notes</label>
                <textarea 
                  rows="3" 
                  value={reportNote} 
                  onChange={e => setReportNote(e.target.value)}
                  placeholder="Describe the work done..."
                  style={{ width: '100%', padding: '12px 15px', borderRadius: '14px', border: `1px solid ${theme.border}`, outline: 'none', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.9rem', color: theme.textMain }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: theme.textMain }}>Evidence Documents (PDF, Image, Excel)</label>
                <div style={{ border: `2px dashed ${theme.border}`, borderRadius: '16px', padding: '22px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: '#f8fafc' }}
                  onClick={() => document.getElementById('fileInput').click()}
                  onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.background = '#f0fdf4'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = '#f8fafc'; }}>
                  <input id="fileInput" type="file" multiple hidden onChange={e => setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
                  <span className="material-symbols-rounded" style={{ fontSize: '2.4rem', color: theme.primary }}>cloud_upload</span>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: theme.textMuted, fontWeight: 600 }}>Click to select or drag and drop files</p>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Selected Files ({selectedFiles.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {selectedFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: '#f8fafc', borderRadius: '12px', fontSize: '0.85rem', border: `1px solid ${theme.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, marginRight: '10px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: theme.primary, flexShrink: 0 }}>description</span>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: theme.textMain }}>{f.name}</span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i)); }} 
                            style={{ background: '#fef2f2', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}
                            title="Remove file"
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${theme.border}` }}>
              <button 
                onClick={() => setReportingItem(null)} 
                style={{ flex: 1, padding: '13px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer', color: theme.textMain, fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReportSubmit} 
                style={{ flex: 2, padding: '13px', borderRadius: '14px', border: 'none', background: theme.primary, color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
              >
                Submit Report
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Programs;
