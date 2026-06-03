export const metalSearchableFields = ['name', 'slug'] as const

export const metalSortableFields = [
  'name',
  'slug',
  'previousPricePerUnit',
  'previousPricePerKg',
  'pricePerUnit',
  'pricePerKg',
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TMetalSearchableField = (typeof metalSearchableFields)[number]

export type TMetalSortableField = (typeof metalSortableFields)[number]
