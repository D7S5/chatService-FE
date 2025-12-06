import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const username = localStorage.getItem('username');
  return username ? children : <Navigate to="/nickname" />;
};

export default ProtectedRoute;
