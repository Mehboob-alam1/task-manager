import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { StaffDashboard } from './StaffDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Show different dashboard based on user role
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <StaffDashboard />;
};
