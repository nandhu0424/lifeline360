import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout & Pages
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PHCUsers from './pages/PHCUsers';
import DDHSUsers from './pages/DDHSUsers';
import GrievanceStaff from './pages/GrievanceStaff';
import Hospitals from './pages/Hospitals';
import Grievances from './pages/Grievances';

const ProtectedRoute = () => {
    const { token } = useAuth();
    if (!token) return <Navigate to="/login" replace />;

    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Outlet />
            </div>
        </div>
    );
};

const PublicRoute = () => {
    const { token } = useAuth();
    if (token) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
};

function AppRoutes() {
    return (
        <Routes>
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/phc-users" element={<PHCUsers />} />
                <Route path="/ddhs-users" element={<DDHSUsers />} />
                <Route path="/grievance-staff" element={<GrievanceStaff />} />
                <Route path="/hospitals" element={<Hospitals />} />
                <Route path="/grievances" element={<Grievances />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
