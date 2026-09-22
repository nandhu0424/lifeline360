import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, Building2, MessageSquare, ShieldAlert } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ background: `rgba(${color}, 0.1)`, padding: '16px', borderRadius: '12px', color: `rgb(${color})` }}>
            <Icon size={32} />
        </div>
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
            <h3 style={{ fontSize: '28px', fontWeight: '700' }}>{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const { API_URL } = useAuth();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/stats`);
                if (data.success) setStats(data.stats);
            } catch (err) {
                console.error('Error fetching dashboard stats', err);
            }
        };
        fetchStats();
    }, [API_URL]);

    if (!stats) return <div className="main-content"><h1 className="page-title">Dashboard</h1><p>Loading...</p></div>;

    return (
        <>
            <h1 className="page-title">System Overview</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '32px' }}>
                <StatCard title="Total Hospitals" value={stats.hospitals} icon={Building2} color="0, 212, 255" />
                <StatCard title="PHC Users" value={stats.phcUsers} icon={Users} color="0, 255, 136" />
                <StatCard title="DDHS Users" value={stats.ddhsUsers} icon={Users} color="255, 170, 0" />
                <StatCard title="Total Grievances" value={stats.totalGrievances} icon={MessageSquare} color="255, 51, 102" />
                <StatCard title="Pending Grievances" value={stats.pendingGrievances} icon={MessageSquare} color="255, 170, 0" />
                <StatCard title="Grievance Staff" value={stats.grievanceStaff} icon={ShieldAlert} color="147, 51, 234" />
            </div>
        </>
    );
};

export default Dashboard;
