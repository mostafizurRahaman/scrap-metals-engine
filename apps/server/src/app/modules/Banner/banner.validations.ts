import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
} from '@repo/shared'
import { bannerSortableFields } from '@repo/db'

const getAllBannerSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(bannerSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const deleteBannerByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const bannerValidations = {
  getAllBannerSchema,

  deleteBannerByIdSchema,
}

export type TGetAllBannerQueryParamsType = z.infer<typeof getAllBannerSchema.shape.query>
export type TDeleteBannerByIdParamsType = z.infer<typeof deleteBannerByIdSchema.shape.params>
