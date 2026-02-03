import { User, Permission, UserRole } from '../types';
import { getUserPermissions } from '../firebase/firestore';

// Default permissions based on role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
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
  ],
  manager: [
    'tasks.create',
    'tasks.edit',
    'tasks.view_all',
    'invoices.create',
    'invoices.edit',
    'invoices.view_all',
    'users.view_all',
    'reports.view',
    'reports.generate',
    'applications.view',
  ],
  staff: [
    'tasks.create',
    'tasks.edit',
    'invoices.create',
    'invoices.edit',
    'reports.view',
  ],
};

/**
 * Get all permissions for a user (role-based + custom permissions)
 */
export const getUserAllPermissions = async (user: User): Promise<Permission[]> => {
  // Start with role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  
  // Get custom permissions from database
  try {
    const customPermissions = await getUserPermissions(user.uid);
    if (customPermissions) {
      // Merge role permissions with custom permissions (remove duplicates)
      return [...new Set([...rolePermissions, ...customPermissions.permissions])];
    }
  } catch (error) {
    console.error('Error loading custom permissions:', error);
  }
  
  return rolePermissions;
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = async (user: User, permission: Permission): Promise<boolean> => {
  const allPermissions = await getUserAllPermissions(user);
  return allPermissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = async (user: User, permissions: Permission[]): Promise<boolean> => {
  const allPermissions = await getUserAllPermissions(user);
  return permissions.some(perm => allPermissions.includes(perm));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = async (user: User, permissions: Permission[]): Promise<boolean> => {
  const allPermissions = await getUserAllPermissions(user);
  return permissions.every(perm => allPermissions.includes(perm));
};

/**
 * Get role-based permissions (synchronous, for quick checks)
 */
export const getRolePermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if user has permission based on role only (synchronous, for quick checks)
 */
export const hasRolePermission = (user: User | null, permission: Permission): boolean => {
  if (!user) return false;
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions.includes(permission);
};

