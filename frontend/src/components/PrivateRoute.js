import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ allowedRoles }) => {
  const token = sessionStorage.getItem('token');
  const userJson = sessionStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  if (!token) {
    return <Navigate to="/login" />;
  }

  // If roles are specified, check if user has permission
  if (allowedRoles && user) {
    const userRole = user.role?.toUpperCase();
    const isAuthorized = allowedRoles.some(role => role.toUpperCase() === userRole);

    if (!isAuthorized) {
      // Redirect based on their actual role
      return <Navigate to={userRole === 'PHC' ? '/phc-dashboard' : '/dashboard'} />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
