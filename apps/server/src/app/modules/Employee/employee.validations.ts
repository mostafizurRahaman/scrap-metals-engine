import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredEmail,
} from '@repo/shared'
import { AuthRoles, AuthStatusValues, userSortableFields } from '@repo/db'

const createEmployeeSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail('Email'),
    password: requiredString('Password').min(1, {
      error: `Password is required`,
    }),
    phoneNumber: requiredString('Phone number'),
    address: optionalString('Address'),
    role: optionalEnumString([AuthRoles.ADMIN, AuthRoles.STAFF], 'Role').default(AuthRoles.STAFF),
  }),
})

const getAllEmployeeSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(userSortableFields, 'Sort by'),
    status: optionalEnumString(AuthStatusValues, 'User Status'),
    workingStatus: optionalEnumString(['busy', 'available'], 'Working status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const employeeValidations = {
  createEmployeeSchema,

  getAllEmployeeSchema,
}

export type TCreateEmployeePayloadType = z.infer<typeof createEmployeeSchema.shape.body>
export type TGetAllEmployeeQueryParamsType = z.infer<typeof getAllEmployeeSchema.shape.query>
