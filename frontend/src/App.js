import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/common/Login';
import PHCDashboard from './pages/phc/PHCDashboard';
import Layout from './components/Layout';
import Overview from './pages/common/Overview';
import Dashboard from './pages/ddhs/Dashboard';
import Hospitals from './pages/ddhs/Hospitals';
import Attendance from './pages/ddhs/Attendance';
import StocksReports from './pages/ddhs/StocksReports';

import Programs from './pages/ddhs/Programs';
import DDHSWorkAssignments from './pages/ddhs/WorkAssignments';
import LeaveManagement from './pages/ddhs/LeaveManagement';
import Information from './pages/common/Information';
import PrivateRoute from './components/PrivateRoute';
import OfflineIndicator from './components/OfflineIndicator';
import './styles/App.css';

function App() {
  return (
    <>
      <OfflineIndicator />
      <Router>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/docs/:section" element={<Information />} />

          <Route element={<PrivateRoute allowedRoles={['DDHS', 'ADMIN']} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/hospitals" element={<Hospitals />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leave-management" element={<LeaveManagement />} />
              <Route path="/stocks" element={<StocksReports />} />

              <Route path="/programs" element={<Programs />} />
              <Route path="/work-assignments" element={<DDHSWorkAssignments />} />

            </Route>
          </Route>

          {/* Dedicated PHC Dashboard (Strictly Separated) */}
          <Route element={<PrivateRoute allowedRoles={['PHC']} />}>
            <Route path="/phc-dashboard" element={<PHCDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
