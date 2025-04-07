// src/lib/authorization.ts
import { NextRequest } from 'next/server';
import { verifyAuthToken, createSafeResponse, UserJwtPayload } from './auth';

// Permission types
export type Permission = 
  | 'users:read' 
  | 'users:write' 
  | 'transactions:read' 
  | 'transactions:write' 
  | 'transactions:delete'
  | 'expenses:read' 
  | 'expenses:write' 
  | 'expenses:delete'
  | 'inventory:read' 
  | 'inventory:write' 
  | 'inventory:delete'
  | 'clients:read' 
  | 'clients:write' 
  | 'clients:delete'
  | 'vendors:read' 
  | 'vendors:write' 
  | 'vendors:delete'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write';

// Role-based permissions
const rolePermissions: Record<string, Permission[]> = {
  admin: [
    'users:read', 'users:write',
    'transactions:read', 'transactions:write', 'transactions:delete',
    'expenses:read', 'expenses:write', 'expenses:delete',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'clients:read', 'clients:write', 'clients:delete',
    'vendors:read', 'vendors:write', 'vendors:delete',
    'reports:read',
    'settings:read', 'settings:write'
  ],
  manager: [
    'users:read',
    'transactions:read', 'transactions:write',
    'expenses:read', 'expenses:write',
    'inventory:read', 'inventory:write',
    'clients:read', 'clients:write',
    'vendors:read', 'vendors:write',
    'reports:read',
    'settings:read'
  ],
  user: [
    'transactions:read',
    'expenses:read',
    'inventory:read',
    'clients:read',
    'vendors:read',
    'reports:read'
  ],
  guest: [
    'transactions:read',
    'expenses:read',
    'inventory:read'
  ]
};

// Check if user has permission
export function hasPermission(user: UserJwtPayload | null, permission: Permission): boolean {
  if (!user) return false;
  
  // Get permissions for user's role
  const permissions = rolePermissions[user.role] || [];
  
  // Check if user has the required permission
  return permissions.includes(permission);
}

// Check if user has any of the permissions
export function hasAnyPermission(user: UserJwtPayload | null, permissions: Permission[]): boolean {
  if (!user) return false;
  
  // Get permissions for user's role
  const userPermissions = rolePermissions[user.role] || [];
  
  // Check if user has any of the required permissions
  return permissions.some(permission => userPermissions.includes(permission));
}

// Check if user has all of the permissions
export function hasAllPermissions(user: UserJwtPayload | null, permissions: Permission[]): boolean {
  if (!user) return false;
  
  // Get permissions for user's role
  const userPermissions = rolePermissions[user.role] || [];
  
  // Check if user has all of the required permissions
  return permissions.every(permission => userPermissions.includes(permission));
}

// Middleware function to check permission
export async function checkPermission(
  req: NextRequest,
  permission: Permission
): Promise<{ isAuthorized: boolean; user: UserJwtPayload | null }> {
  // Verify authentication
  const { isAuthenticated, user } = await verifyAuthToken(req);
  
  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return { isAuthorized: false, user: null };
  }
  
  // Check if user has permission
  const isAuthorized = hasPermission(user, permission);
  
  return { isAuthorized, user };
}

// Middleware function to handle authorization
export async function authorizeRequest(
  req: NextRequest,
  permission: Permission
): Promise<Response | null> {
  // Check permission
  const { isAuthorized, user } = await checkPermission(req, permission);
  
  // If not authorized, return error response
  if (!isAuthorized) {
    return createSafeResponse(
      { 
        message: user ? 'Forbidden: Insufficient permissions' : 'Unauthorized: Authentication required',
        error: user ? 'insufficient_permissions' : 'authentication_required'
      }, 
      user ? 403 : 401, // Forbidden or Unauthorized
    );
  }
  
  // Authorized, continue with request
  return null;
}
