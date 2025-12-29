import type { components } from '@/lib/types/openapi';

export type UserRole = components['schemas']['LoginResponse']['user']['role'];

const roleToHome: Record<string, string> = {
  admin: '/admin',
  operator: '/admin',
  company: '/company',
  driver: '/driver'
};

export const resolveHomePath = (role: UserRole | null | undefined) => {
  if (!role) return '/login';
  return roleToHome[role] ?? '/login';
};

export const isRoleAllowedForPath = (role: UserRole | null | undefined, path: string) => {
  if (!role) return false;
  if (path.startsWith('/admin')) return role === 'admin' || role === 'operator';
  if (path.startsWith('/company')) return role === 'company';
  if (path.startsWith('/driver')) return role === 'driver';
  return true;
};
