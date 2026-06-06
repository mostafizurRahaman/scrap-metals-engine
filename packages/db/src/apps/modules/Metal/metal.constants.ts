export const metalSearchableFields = ['name', 'slug'] as const

export const MetalUnits = {
  KG: 'kg',
  LB: 'lb',
  PC: 'pc',
} as const

export const metalUnitValues = Object.values(MetalUnits)

export const metalSortableFields = [
  'name',
  'slug',
  'previousPricePerUnit',
  'previousPrice',
  'pricePerUnit',
  'price',
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TMetalSearchableField = (typeof metalSearchableFields)[number]

export type TMetalSortableField = (typeof metalSortableFields)[number]

export type TMetalUnitType = (typeof metalUnitValues)[number]
