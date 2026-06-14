// Auth Status
export const AuthStatus = {
  ACTIVE: 'active', // can use the system
  PENDING: 'pending', // signup completed, waiting for next step
  IN_REVIEW: 'in_review', // admin/manual ve
  BLOCKED: 'blocked', // admin restricted
  DELETED: 'deleted', // soft-deleted (no login)
} as const

export const AuthStatusValues = Object.values(AuthStatus)

export type TAuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus]

// Auth Roles:
export const AuthRoles = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  STAFF: 'staff',
} as const

export const AuthRolesValues = Object.values(AuthRoles)

export type TAuthRole = (typeof AuthRoles)[keyof typeof AuthRoles]

export const userSearchableFields = ['name', 'email', 'phoneNumber']
export const userSortableFields = ['name', 'email', 'phoneNumber', 'createdAt']
