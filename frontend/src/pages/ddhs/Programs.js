import React, { useState, useEffect } from 'react';
import { programService } from '../../services/api';

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', target_phc: 'All', end_date: '' });

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await programService.getAll();
      if (res.data) setPrograms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await programService.add(formData);
      alert('Program dispatched successfully!');
      setShowModal(false);
      fetchPrograms();
    } catch (err) {
      alert('Failed to dispatch program');
    }
  };

  return (
    <div className="p-4" style={{ animation: 'slideUp 0.5s ease' }}>
      <div className="flex justify-between items-center mb-6 glass-panel p-4">
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Dispatch Programs</h2>
          <p className="text-muted">Manage health awareness and vaccination campaigns</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary shadow-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded">campaign</span> Create Announcement
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? <p>Loading...</p> : programs.map(p => (
          <div key={p._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>Target: {p.target_phc}</span>
                <span className="badge" style={{ background: p.status === 'Completed' ? 'var(--success-light)' : 'var(--warning-light)', color: p.status === 'Completed' ? 'var(--success)' : 'var(--warning)' }}>{p.status}</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '5px' }}>{p.title}</h3>
              <p className="text-muted" style={{ maxWidth: '800px' }}>{p.description}</p>
              {p.completion_notes && (
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                  <strong>Report Notes:</strong> {p.completion_notes}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '5px' }}>Due Date</div>
              <div style={{ fontWeight: 700 }}>{p.end_date || 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel p-6" style={{ width: '500px', background: 'var(--bg-main)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px' }}>Create Program Announcement</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Title</label>
                <input required type="text" className="form-control" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Polio Vaccination Drive" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Description & Instructions</label>
                <textarea required className="form-control" rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed instructions for the PHCs..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Target PHC Code (or 'All')</label>
                <input required type="text" className="form-control" value={formData.target_phc} onChange={e => setFormData({...formData, target_phc: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Deadline</label>
                <input type="date" className="form-control" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Dispatch to PHCs</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Programs;
