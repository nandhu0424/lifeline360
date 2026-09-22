import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const Grievances = () => {
    const { API_URL } = useAuth();
    const [grievances, setGrievances] = useState([]);

    // Detail Drawer State
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Action Form State
    const [actionForm, setActionForm] = useState({
        status: '',
        assigned_to: '',
        resolution_note: ''
    });

    useEffect(() => {
        fetchGrievances();
    }, []);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchGrievances = async () => {
        setIsRefreshing(true);
        try {
            const { data } = await axios.get(`${API_URL}/grievances`);
            if (data.success) {
                setGrievances(data.data);
            }
        } catch (err) {
            console.error('Error fetching grievances:', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const openDrawer = (g) => {
        setSelectedGrievance(g);
        setActionForm({
            status: g.status || 'received',
            assigned_to: g.assigned_to || '',
            resolution_note: g.resolution_note || ''
        });
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedGrievance(null), 300);
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        if (!selectedGrievance) return;

        try {
            await axios.patch(`${API_URL}/grievances/${selectedGrievance._id}/status`, actionForm);
            alert('Grievance successfully updated.');
            closeDrawer();
            fetchGrievances();
        } catch (err) {
            alert('Failed to update grievance: ' + (err.response?.data?.message || err.message));
        }
    };

    // Format Dates properly
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Grievance Resolution</h1>
                <button className="glass-btn primary" onClick={() => fetchGrievances()} disabled={isRefreshing}>
                    <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div className="glass-table-wrapper">
                <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th>Reference ID</th>
                            <th>Date</th>
                            <th>Citizen Name</th>
                            <th>Category</th>
                            <th>District</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grievances.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No grievances found.</td></tr>
                        ) : grievances.map(g => (
                            <tr key={g._id} onClick={() => openDrawer(g)} style={{ cursor: 'pointer' }} className="hover-row">
                                <td style={{ fontWeight: 600 }}>{g.reference_id}</td>
                                <td>{formatDate(g.created_at)}</td>
                                <td>{g.name}</td>
                                <td>{g.category}</td>
                                <td>{g.district || '-'}</td>
                                <td><span className={`status-badge ${g.status}`}>{g.status.replace('_', ' ')}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detailed Drawer Overlay */}
            {isDrawerOpen && <div className="modal-overlay" onClick={closeDrawer}></div>}

            <div className={`side-drawer ${isDrawerOpen ? 'open' : ''}`} style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '500px', maxWidth: '100vw',
                background: '#0b111e', borderLeft: '1px solid rgba(255,255,255,0.1)',
                zIndex: 1000, padding: '30px', overflowY: 'auto',
                transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {selectedGrievance && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', color: '#00d2aa', marginBottom: '4px' }}>{selectedGrievance.reference_id}</h2>
                                <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Created: {formatDate(selectedGrievance.created_at)}</p>
                            </div>
                            <button className="glass-btn" style={{ padding: '6px' }} onClick={closeDrawer}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', background: 'rgba(17,24,39,0.5)', padding: '20px', borderRadius: '8px' }}>
                            <div>
                                <h5 style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '4px' }}>Citizen Name</h5>
                                <p style={{ fontWeight: 600 }}>{selectedGrievance.name}</p>
                            </div>
                            <div>
                                <h5 style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '4px' }}>Phone</h5>
                                <p style={{ fontWeight: 600 }}>{selectedGrievance.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <h5 style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '4px' }}>Email</h5>
                                <p style={{ fontWeight: 600 }}>{selectedGrievance.email}</p>
                            </div>
                            <div>
                                <h5 style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '4px' }}>Category</h5>
                                <p style={{ fontWeight: 600 }}>{selectedGrievance.category}</p>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <h5 style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '4px' }}>District / Facility</h5>
                                <p style={{ fontWeight: 600 }}>{selectedGrievance.district || 'Not Provided'}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '8px' }}>Grievance Message Body</h4>
                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', padding: '20px', borderRadius: '8px', borderLeft: '3px solid #00d2aa' }}>
                                <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{selectedGrievance.message}</p>
                            </div>
                        </div>

                        <form onSubmit={handleActionSubmit} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Update Status <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="glass-input" value={actionForm.status} onChange={e => setActionForm({ ...actionForm, status: e.target.value })} required style={{ background: '#0a0f1e' }}>
                                    <option value="received">Received</option>
                                    <option value="in_review">In Review</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Assign Officer / Department</label>
                                <input type="text" className="glass-input" placeholder="e.g. Health Inspector, Madurai District" value={actionForm.assigned_to} onChange={e => setActionForm({ ...actionForm, assigned_to: e.target.value })} />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Resolution Note / Official Response</label>
                                <textarea className="glass-input" rows="4" placeholder="Provide action notes or resolutions details that will be emailed to the citizen..." value={actionForm.resolution_note} onChange={e => setActionForm({ ...actionForm, resolution_note: e.target.value })} style={{ resize: 'vertical' }}></textarea>
                            </div>

                            <button type="submit" className="glass-btn primary" style={{ width: '100%', justifyContent: 'center' }}>
                                Save and update grievance <CheckCircle2 size={16} />
                            </button>
                        </form>
                    </>
                )}
            </div>

            <style>{`
                .hover-row:hover {
                    background: rgba(255,255,255,0.05);
                }
                @keyframes spin { 
                    100% { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    );
};

export default Grievances;
