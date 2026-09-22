import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, KeyRound } from 'lucide-react';

const GrievanceStaff = () => {
    const { API_URL } = useAuth();
    const [staff, setStaff] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/grievance-staff`);
            if (data.success) setStaff(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`${API_URL}/grievance-staff/${editingId}`, formData);
            } else {
                await axios.post(`${API_URL}/grievance-staff`, formData);
            }
            setShowModal(false);
            setFormData({ name: '', email: '', password: '' });
            setEditingId(null);
            fetchStaff();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving staff');
        }
    };

    const deleteStaff = async (id) => {
        if (!window.confirm('Delete this grievance staff member?')) return;
        try {
            await axios.delete(`${API_URL}/grievance-staff/${id}`);
            fetchStaff();
        } catch (err) {
            console.error(err);
        }
    };

    const resetPassword = async (id) => {
        const newPwd = window.prompt('Enter new password (min 6 chars):');
        if (!newPwd || newPwd.length < 6) return alert('Invalid password');
        try {
            await axios.patch(`${API_URL}/grievance-staff/${id}/password`, { newPassword: newPwd });
            alert('Password updated');
        } catch (err) {
            alert('Error updating password');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Grievance Staff</h1>
                <button className="glass-btn primary" onClick={() => { setEditingId(null); setShowModal(true); setFormData({ name: '', email: '', password: '' }); }}>
                    <Plus size={18} /> Add Staff
                </button>
            </div>

            <div className="glass-table-wrapper">
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(s => (
                            <tr key={s._id}>
                                <td>{s.name}</td>
                                <td>{s.email}</td>
                                <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="glass-btn" style={{ padding: '6px' }} onClick={() => { setEditingId(s._id); setFormData(s); setShowModal(true); }}><Edit size={16} /></button>
                                        <button className="glass-btn" style={{ padding: '6px' }} onClick={() => resetPassword(s._id)}><KeyRound size={16} /></button>
                                        <button className="glass-btn danger" style={{ padding: '6px' }} onClick={() => deleteStaff(s._id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content">
                        <h2 className="modal-title">{editingId ? 'Edit Staff' : 'New Staff'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Name</label>
                                <input className="glass-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="glass-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            {!editingId && (
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" className="glass-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
                                </div>
                            )}
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

export default GrievanceStaff;
