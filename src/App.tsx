import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Dashboard } from './components/Dashboard';
import { TaskForm } from './components/TaskForm';
import { TaskDetail } from './components/TaskDetail';
import { CalendarView } from './components/CalendarView';
import { DailyReports } from './components/DailyReports';
import { Notifications } from './components/Notifications';
import { UserManagement } from './components/UserManagement';
import { Invoices } from './components/Invoices';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SetupMessage } from './components/SetupMessage';
import { isFirebaseConfigured } from './firebase/config';
import './App.css';

console.log('[App] Loading application...');
console.log('[App] Firebase configured:', isFirebaseConfigured);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  try {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f3f4f6',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #e5e7eb', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite', 
              margin: '0 auto' 
            }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('[PrivateRoute] Error:', error);
    return <Navigate to="/login" replace />;
  }
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  try {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f3f4f6',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #e5e7eb', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite', 
              margin: '0 auto' 
            }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('[AdminRoute] Error:', error);
    return <Navigate to="/login" replace />;
  }
};

function App() {
  console.log('[App] Rendering App component');

  try {
    // Show setup message if Firebase is not configured
    if (!isFirebaseConfigured) {
      console.log('[App] Showing setup message');
      return (
        <ErrorBoundary>
          <SetupMessage />
        </ErrorBoundary>
      );
    }

    console.log('[App] Rendering main app with router');
    return (
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Navigate to="/dashboard" replace />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/tasks/create"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <TaskForm />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/tasks/edit/:id"
                  element={
                    <AdminRoute>
                      <Layout>
                        <TaskForm />
                      </Layout>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/tasks/:id"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <TaskDetail />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <CalendarView />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <AdminRoute>
                      <Layout>
                        <DailyReports />
                      </Layout>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Notifications />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <AdminRoute>
                      <Layout>
                        <UserManagement />
                      </Layout>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/invoices"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Invoices />
                      </Layout>
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('[App] Render error:', error);
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee2e2',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>Application Error</h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Please check the browser console (F12) for more details.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default App;
