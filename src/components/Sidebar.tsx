import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  PlusCircle,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Bell,
  LogOut,
  X,
  Key,
  Shield,
  UserCheck,
} from 'lucide-react';
import taskLogo from '../assets/task_logo.png';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/dashboard',
      icon: Home,
      label: user?.role === 'admin' ? 'Admin Dashboard' : user?.role === 'manager' ? 'Manager Dashboard' : 'My Dashboard',
      show: true,
    },
    {
      path: '/tasks/create',
      icon: PlusCircle,
      label: 'Create Task',
      show: user?.role === 'admin' || user?.role === 'manager',
    },
    {
      path: '/reports',
      icon: BarChart3,
      label: 'Reports',
      show: user?.role === 'admin',
    },
    {
      path: '/users',
      icon: Users,
      label: 'Users',
      show: user?.role === 'admin',
    },
    {
      path: '/signup-approval',
      icon: UserCheck,
      label: 'Signup Requests',
      show: user?.role === 'admin',
    },
    {
      path: '/permissions',
      icon: Shield,
      label: 'Permissions',
      show: user?.role === 'admin',
    },
    {
      path: '/applications',
      icon: Key,
      label: 'Third Party Apps',
      show: user?.role === 'admin',
    },
    {
      path: '/invoices',
      icon: FileText,
      label: 'Invoices',
      show: true,
    },
    {
      path: '/calendar',
      icon: Calendar,
      label: 'Calendar',
      show: true,
    },
    {
      path: '/notifications',
      icon: Bell,
      label: 'Notifications',
      show: true,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-blue-700">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={taskLogo} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">Task Manager</h1>
                <p className="text-xs text-blue-200">Management System</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden text-white hover:text-blue-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-blue-700 bg-blue-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-semibold text-sm">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.displayName}</p>
                <p className="text-xs text-blue-200 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-white text-blue-900 shadow-lg'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-blue-700">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-blue-100 hover:bg-red-600 hover:text-white transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
