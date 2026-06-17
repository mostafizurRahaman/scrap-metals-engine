// export const messageSearchableFields = ['name'] as const

export const messageSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
// export type TMessageSearchableField = (typeof messageSearchableFields)[number]

export type TMessageSortableField = (typeof messageSortableFields)[number]
