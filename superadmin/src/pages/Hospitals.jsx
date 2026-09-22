import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Power } from 'lucide-react';

const Hospitals = () => {
    const { API_URL } = useAuth();
    const [hospitals, setHospitals] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ hospital_id: '', name: '', type: 'PHC', district: '', address: '', contact: '', email: '', lat: '', lng: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/hospitals`);
            if (data.success) setHospitals(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                location: { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
            };

            if (editingId) {
                await axios.put(`${API_URL}/hospitals/${editingId}`, payload);
            } else {
                await axios.post(`${API_URL}/hospitals`, payload);
            }
            setShowModal(false);
            setEditingId(null);
            fetchHospitals();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving hospital');
        }
    };

    const toggleStatus = async (id) => {
        try {
            await axios.patch(`${API_URL}/hospitals/${id}/toggle`);
            fetchHospitals();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteHospital = async (id) => {
        if (!window.confirm('Delete this hospital?')) return;
        try {
            await axios.delete(`${API_URL}/hospitals/${id}`);
            fetchHospitals();
        } catch (err) {
            console.error(err);
        }
    };

    const openEditModal = (h) => {
        setFormData({
            ...h,
            lat: h.location?.lat || '',
            lng: h.location?.lng || ''
        });
        setEditingId(h._id);
        setShowModal(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Hospitals</h1>
                <button className="glass-btn primary" onClick={() => { setEditingId(null); setShowModal(true); setFormData({ hospital_id: '', name: '', type: 'PHC', district: '', address: '', contact: '', email: '', lat: '', lng: '' }); }}>
                    <Plus size={18} /> Add Hospital
                </button>
            </div>

            <div className="glass-table-wrapper">
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>District</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hospitals.map(h => (
                            <tr key={h._id}>
                                <td>{h.hospital_id}</td>
                                <td>{h.name}</td>
                                <td>{h.type}</td>
                                <td>{h.district}</td>
                                <td><span className={`status-badge ${h.status}`}>{h.status}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="glass-btn" style={{ padding: '6px' }} onClick={() => openEditModal(h)}><Edit size={16} /></button>
                                        <button className={h.status === 'active' ? "glass-btn danger" : "glass-btn success"} style={{ padding: '6px' }} onClick={() => toggleStatus(h._id)}><Power size={16} /></button>
                                        <button className="glass-btn danger" style={{ padding: '6px' }} onClick={() => deleteHospital(h._id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 className="modal-title">{editingId ? 'Edit Hospital' : 'New Hospital'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Hospital ID</label>
                                    <input className="glass-input" value={formData.hospital_id} onChange={e => setFormData({ ...formData, hospital_id: e.target.value })} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Type</label>
                                    <select className="glass-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required style={{ background: '#0a0f1e' }}>
                                        <option value="PHC">PHC</option>
                                        <option value="UPHC">UPHC</option>
                                        <option value="Sub-Centre">Sub-Centre</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input className="glass-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>District</label>
                                <input className="glass-input" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Latitude</label>
                                    <input type="number" step="any" className="glass-input" value={formData.lat} onChange={e => setFormData({ ...formData, lat: e.target.value })} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Longitude</label>
                                    <input type="number" step="any" className="glass-input" value={formData.lng} onChange={e => setFormData({ ...formData, lng: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email & Contact</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <input type="email" placeholder="Email" className="glass-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    <input type="text" placeholder="Contact No" className="glass-input" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Physical Address</label>
                                <textarea className="glass-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="glass-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="glass-btn primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hospitals;
