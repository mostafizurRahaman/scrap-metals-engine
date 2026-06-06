export const sortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export const ROLE_RANK = {
  superadmin: 4,
  admin: 3,
  customer: 2,
  staff: 2,
} as const

export const sortingOrderValues = Object.values(sortOrder)
