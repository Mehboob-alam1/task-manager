import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Permission, UserPermissions as UserPermissionsType } from '../types';
import { getUsers, getUserPermissions, setUserPermissions } from '../firebase/firestore';
import { Shield, User as UserIcon } from 'lucide-react';

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

const PERMISSION_GROUPS: Record<string, Permission[]> = {
  'Tasks': ['tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.view_all'],
  'Invoices': ['invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.view_all'],
  'Users': ['users.manage', 'users.view_all'],
  'Reports': ['reports.view', 'reports.generate'],
  'Applications': ['applications.manage', 'applications.view'],
  'Settings': ['settings.manage'],
};

export const UserPermissions: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissionsState] = useState<UserPermissionsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    loadUsers();
  }, [currentUser]);

  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.uid);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const permissions = await getUserPermissions(userId);
      setUserPermissionsState(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setUserPermissionsState(null);
    }
  };

  const togglePermission = (permission: Permission) => {
    if (!selectedUser) return;
    const currentPermissions = userPermissions?.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setUserPermissionsState({
      userId: selectedUser.uid,
      permissions: newPermissions,
      createdAt: userPermissions?.createdAt || new Date(),
      updatedAt: new Date(),
    });
  };

  const handleSave = async () => {
    if (!selectedUser || !userPermissions) return;
    setSaving(true);
    try {
      await setUserPermissions(selectedUser.uid, userPermissions.permissions);
      alert('Permissions updated successfully!');
    } catch (error: any) {
      alert('Failed to update permissions: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const selectAllInGroup = (groupPermissions: Permission[]) => {
    if (!selectedUser) return;
    const currentPermissions = userPermissions?.permissions || [];
    const allSelected = groupPermissions.every(p => currentPermissions.includes(p));
    
    if (allSelected) {
      // Deselect all in group
      const newPermissions = currentPermissions.filter(p => !groupPermissions.includes(p));
      setUserPermissionsState({
        userId: selectedUser.uid,
        permissions: newPermissions,
        createdAt: userPermissions?.createdAt || new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Select all in group
      const newPermissions = [...new Set([...currentPermissions, ...groupPermissions])];
      setUserPermissionsState({
        userId: selectedUser.uid,
        permissions: newPermissions,
        createdAt: userPermissions?.createdAt || new Date(),
        updatedAt: new Date(),
      });
    }
  };

  if (currentUser?.role !== 'admin') {
    return <div className="text-center py-12">Access denied. Admin only.</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const currentPermissions = userPermissions?.permissions || [];

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Permissions</h1>
        <p className="text-gray-600 mt-1">Manage granular permissions for each user</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select User</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedUser?.uid === user.uid
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {user.role === 'admin' ? (
                      <Shield className="w-5 h-5 text-blue-600" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Permissions for {selectedUser.displayName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentPermissions.length} of {ALL_PERMISSIONS.length} permissions granted
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermissions]) => {
                  const allSelected = groupPermissions.every(p => currentPermissions.includes(p));

                  return (
                    <div key={groupName} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-semibold text-gray-900">{groupName}</h3>
                        <button
                          onClick={() => selectAllInGroup(groupPermissions)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupPermissions.map((permission) => (
                          <label
                            key={permission}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={currentPermissions.includes(permission)}
                              onChange={() => togglePermission(permission)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{permission}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <UserIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Select a user to manage their permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
