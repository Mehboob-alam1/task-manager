import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ThirdPartyApplication,
  Permission,
  ApplicationType,
  ApplicationStatus,
} from '../types';
import {
  getThirdPartyApplications,
  createThirdPartyApplication,
  updateThirdPartyApplication,
  deleteThirdPartyApplication,
} from '../firebase/firestore';
import { Plus, Trash2, Edit, Eye, EyeOff, Key, Globe, Webhook, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

const ALL_PERMISSIONS: Permission[] = [
  'tasks.create',
  'tasks.edit',
  'tasks.delete',
  'tasks.view_all',
  'invoices.create',
  'invoices.edit',
  'invoices.delete',
  'invoices.view_all',
  'users.manage',
  'users.view_all',
  'reports.view',
  'reports.generate',
  'applications.manage',
  'applications.view',
  'settings.manage',
];

export const ThirdPartyApps: React.FC = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<ThirdPartyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<ThirdPartyApplication | null>(null);
  const [showSecret, setShowSecret] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'api_key' as ApplicationType,
    status: 'active' as ApplicationStatus,
    redirectUris: '',
    scopes: '',
    permissions: [] as Permission[],
    rateLimit: {
      requests: 100,
      period: 'hour' as 'minute' | 'hour' | 'day',
    },
  });

  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadApps();
  }, [user]);

  const loadApps = async () => {
    try {
      const allApps = await getThirdPartyApplications();
      setApps(allApps);
    } catch (error) {
      console.error('Error loading apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = (): string => {
    return `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const generateClientId = (): string => {
    return `client_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const generateClientSecret = (): string => {
    return `secret_${Math.random().toString(36).substring(2, 20)}${Math.random().toString(36).substring(2, 20)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const appData: Omit<ThirdPartyApplication, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        status: formData.status,
        permissions: formData.permissions,
        createdBy: user.uid,
        rateLimit: formData.rateLimit,
        ...(formData.type === 'oauth' && {
          clientId: generateClientId(),
          clientSecret: generateClientSecret(),
          redirectUris: formData.redirectUris.split(',').map(uri => uri.trim()).filter(Boolean),
          scopes: formData.scopes.split(',').map(scope => scope.trim()).filter(Boolean),
        }),
        ...(formData.type === 'api_key' && {
          apiKey: generateApiKey(),
        }),
      };

      if (editingApp) {
        await updateThirdPartyApplication(editingApp.id, appData);
      } else {
        await createThirdPartyApplication(appData);
      }

      setShowForm(false);
      setEditingApp(null);
      resetForm();
      loadApps();
    } catch (error: any) {
      alert('Failed to save application: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'api_key',
      status: 'active',
      redirectUris: '',
      scopes: '',
      permissions: [],
      rateLimit: {
        requests: 100,
        period: 'hour',
      },
    });
  };

  const handleEdit = (app: ThirdPartyApplication) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      description: app.description || '',
      type: app.type,
      status: app.status,
      redirectUris: app.redirectUris?.join(', ') || '',
      scopes: app.scopes?.join(', ') || '',
      permissions: app.permissions,
      rateLimit: app.rateLimit || {
        requests: 100,
        period: 'hour',
      },
    });
    setShowForm(true);
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await deleteThirdPartyApplication(appId);
      loadApps();
    } catch (error: any) {
      alert('Failed to delete application: ' + error.message);
    }
  };

  const togglePermission = (permission: Permission) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permission)
        ? formData.permissions.filter(p => p !== permission)
        : [...formData.permissions, permission],
    });
  };

  const getTypeIcon = (type: ApplicationType) => {
    switch (type) {
      case 'oauth':
        return <Globe className="w-5 h-5" />;
      case 'api_key':
        return <Key className="w-5 h-5" />;
      case 'webhook':
        return <Webhook className="w-5 h-5" />;
      case 'integration':
        return <LinkIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (user?.role !== 'admin') {
    return <div className="text-center py-12">Access denied. Admin only.</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Third Party Applications</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingApp(null);
            setShowForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingApp ? 'Edit Application' : 'Create New Application'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type *</label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ApplicationType })}
                >
                  <option value="api_key">API Key</option>
                  <option value="oauth">OAuth</option>
                  <option value="webhook">Webhook</option>
                  <option value="integration">Integration</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status *</label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ApplicationStatus })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              {formData.type === 'oauth' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Redirect URIs (comma-separated)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/callback"
                      value={formData.redirectUris}
                      onChange={(e) => setFormData({ ...formData, redirectUris: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scopes (comma-separated)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="read, write"
                      value={formData.scopes}
                      onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate Limit (requests)</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.rateLimit.requests}
                  onChange={(e) => setFormData({
                    ...formData,
                    rateLimit: { ...formData.rateLimit, requests: parseInt(e.target.value) || 100 }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate Limit Period</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.rateLimit.period}
                  onChange={(e) => setFormData({
                    ...formData,
                    rateLimit: { ...formData.rateLimit, period: e.target.value as 'minute' | 'hour' | 'day' }
                  })}
                >
                  <option value="minute">Per Minute</option>
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 border border-gray-200 rounded-md">
                {ALL_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{permission}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingApp(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingApp ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {apps.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Key className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p>No applications found. Create your first application to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {apps.map((app) => (
              <li key={app.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getTypeIcon(app.type)}
                      <h3 className="text-lg font-medium text-gray-900">{app.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    {app.description && (
                      <p className="text-sm text-gray-500 mb-2">{app.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>Type: {app.type}</span>
                      {app.clientId && (
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          Client ID: {app.clientId}
                        </span>
                      )}
                      {app.apiKey && (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            API Key: {showSecret.has(app.id) ? app.apiKey : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => {
                              const newSet = new Set(showSecret);
                              if (newSet.has(app.id)) {
                                newSet.delete(app.id);
                              } else {
                                newSet.add(app.id);
                              }
                              setShowSecret(newSet);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {showSecret.has(app.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      {app.lastUsedAt && (
                        <span>Last used: {format(app.lastUsedAt, 'MMM dd, yyyy')}</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Permissions ({app.permissions.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {app.permissions.slice(0, 5).map((perm) => (
                          <span key={perm} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {perm}
                          </span>
                        ))}
                        {app.permissions.length > 5 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{app.permissions.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(app)}
                      className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

