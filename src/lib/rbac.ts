// Role-based access control. The single source of truth for what each role may do —
// enforced in route handlers/services (server) and used only for hiding UI on the client.

export const ROLES = ['owner', 'admin', 'manager', 'agent', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'lead:read', // read leads assigned to / created by you
  'lead:read_all', // read every lead in the workspace
  'lead:create',
  'lead:update',
  'lead:delete',
  'lead:assign',
  'ai:use',
  'team:view',
  'activity:view_all', // see everyone's activity + AI team reports (others see only their own)
  'team:manage',
  'settings:manage',
  'billing:manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== 'billing:manage'),
  manager: ['lead:read', 'lead:read_all', 'lead:create', 'lead:update', 'lead:delete', 'lead:assign', 'ai:use', 'team:view', 'activity:view_all'],
  agent: ['lead:read', 'lead:create', 'lead:update', 'ai:use'],
  viewer: ['lead:read', 'lead:read_all', 'team:view'],
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  owner: { label: 'Owner', description: 'Full access, including billing' },
  admin: { label: 'Admin', description: 'Manages team, settings and all leads' },
  manager: { label: 'Manager', description: 'Works and assigns every lead' },
  agent: { label: 'Sales agent', description: 'Works only their own leads' },
  viewer: { label: 'Viewer', description: 'Read-only access to all leads' },
};

export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

// Higher rank can manage lower rank. Nobody can grant a role above their own.
const RANK: Record<Role, number> = { owner: 4, admin: 3, manager: 2, agent: 1, viewer: 0 };
export const outranks = (actor: Role, target: Role) => RANK[actor] > RANK[target];
export const assignableRoles = (actor: Role): Role[] => ROLES.filter((r) => r !== 'owner' && RANK[r] < RANK[actor]);
