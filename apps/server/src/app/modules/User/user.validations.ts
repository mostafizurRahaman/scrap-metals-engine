import z from 'zod'
import {
  requiredString,
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

const getUserByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteUserByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const userValidations = {
  getAllUserSchema,
  getUserByIdSchema,
  deleteUserByIdSchema,
}

export type TGetAllUserQueryParamsType = z.infer<typeof getAllUserSchema.shape.query>
export type TGetUserByIdParamsType = z.infer<typeof getUserByIdSchema.shape.params>
export type TDeleteUserByIdParamsType = z.infer<typeof deleteUserByIdSchema.shape.params>
