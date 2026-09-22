import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, KeyRound, Power } from 'lucide-react';

const PHCUsers = () => {
    const { API_URL } = useAuth();
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ hospital_id: '', district: '', email: '', address: '', password: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/phc-users`);
            if (data.success) setUsers(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`${API_URL}/phc-users/${editingId}`, formData);
            } else {
                await axios.post(`${API_URL}/phc-users`, formData);
            }
            setShowModal(false);
            setFormData({ hospital_id: '', district: '', email: '', address: '', password: '' });
            setEditingId(null);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving user');
        }
    };

    const toggleStatus = async (id) => {
        try {
            await axios.patch(`${API_URL}/phc-users/${id}/toggle`);
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await axios.delete(`${API_URL}/phc-users/${id}`);
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const resetPassword = async (id) => {
        const newPwd = window.prompt('Enter new password (min 6 chars):');
        if (!newPwd || newPwd.length < 6) return alert('Invalid password');
        try {
            await axios.patch(`${API_URL}/phc-users/${id}/password`, { newPassword: newPwd });
            alert('Password updated');
        } catch (err) {
            alert('Error updating password');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>PHC Users</h1>
                <button className="glass-btn primary" onClick={() => { setEditingId(null); setShowModal(true); setFormData({ hospital_id: '', district: '', email: '', address: '', password: '' }); }}>
                    <Plus size={18} /> Add PHC User
                </button>
            </div>

            <div className="glass-table-wrapper">
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Hospital ID</th>
                            <th>District</th>
                            <th>Email</th>
                            <th>Address</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>{u.hospital_id}</td>
                                <td>{u.district}</td>
                                <td>{u.email}</td>
                                <td>{u.address || '-'}</td>
                                <td><span className={`status-badge ${u.status}`}>{u.status}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="glass-btn" style={{ padding: '6px' }} onClick={() => { setEditingId(u._id); setFormData(u); setShowModal(true); }}><Edit size={16} /></button>
                                        <button className="glass-btn" style={{ padding: '6px' }} onClick={() => resetPassword(u._id)}><KeyRound size={16} /></button>
                                        <button className={u.status === 'active' ? "glass-btn danger" : "glass-btn success"} style={{ padding: '6px' }} onClick={() => toggleStatus(u._id)}><Power size={16} /></button>
                                        <button className="glass-btn danger" style={{ padding: '6px' }} onClick={() => deleteUser(u._id)}><Trash2 size={16} /></button>
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
                        <h2 className="modal-title">{editingId ? 'Edit PHC User' : 'New PHC User'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Hospital ID</label>
                                <input className="glass-input" value={formData.hospital_id} onChange={e => setFormData({ ...formData, hospital_id: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>District</label>
                                <input className="glass-input" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="glass-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" className="glass-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
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

export default PHCUsers;
