export const orderHistorySearchableFields = [
  'name',
] as const

export const orderHistorySortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TOrderHistorySearchableField =
  (typeof orderHistorySearchableFields)[number]

export type TOrderHistorySortableField =
  (typeof orderHistorySortableFields)[number]