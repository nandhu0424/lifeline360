import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, UserCog, Building2, MessageSquare, LogOut, ShieldAlert } from 'lucide-react';

const Sidebar = () => {
    const { logout } = useAuth();

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'PHC Users', path: '/phc-users', icon: Users },
        { name: 'DDHS Users', path: '/ddhs-users', icon: UserCog },
        { name: 'Grievance Staff', path: '/grievance-staff', icon: ShieldAlert },
        { name: 'Hospitals', path: '/hospitals', icon: Building2 },
        { name: 'Grievances', path: '/grievances', icon: MessageSquare },
    ];

    return (
        <div className="sidebar">
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h2 style={{ color: '#00d4ff', fontSize: '24px', fontWeight: '700' }}>Lifeline360</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Super Admin
                </p>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            color: isActive ? 'var(--primary-blue)' : 'var(--text-main)',
                            background: isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            fontWeight: isActive ? '600' : '400'
                        })}
                    >
                        <item.icon size={20} />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <button className="glass-btn danger" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>
                <LogOut size={18} />
                Logout
            </button>
        </div>
    );
};

export default Sidebar;
