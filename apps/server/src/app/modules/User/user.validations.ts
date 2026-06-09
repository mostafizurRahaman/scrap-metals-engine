import z from 'zod'
import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
} from '@repo/shared'
import { AuthStatusValues, userSortableFields } from '@repo/db'

const getAllUserSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    status: optionalEnumString(AuthStatusValues, 'User Status'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(userSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const userValidations = {
  getAllUserSchema,
}

export type TGetAllUserQueryParamsType = z.infer<typeof getAllUserSchema.shape.query>
