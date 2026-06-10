export const bannerSortableFields = ['createdAt', 'updatedAt'] as const

export type TBannerSortableField = (typeof bannerSortableFields)[number]
