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
import { AuthRoles, userSortableFields } from '@repo/db'

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

const updateEmployeeSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllEmployeeSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(userSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getEmployeeByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteEmployeeByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const employeeValidations = {
  createEmployeeSchema,
  updateEmployeeSchema,
  getAllEmployeeSchema,
  getEmployeeByIdSchema,
  deleteEmployeeByIdSchema,
}

export type TCreateEmployeePayloadType = z.infer<typeof createEmployeeSchema.shape.body>
export type TUpdateEmployeePayloadType = z.infer<typeof updateEmployeeSchema.shape.body>
export type TGetAllEmployeeQueryParamsType = z.infer<typeof getAllEmployeeSchema.shape.query>
export type TGetEmployeeByIdParamsType = z.infer<typeof getEmployeeByIdSchema.shape.params>
export type TDeleteEmployeeByIdParamsType = z.infer<typeof deleteEmployeeByIdSchema.shape.params>
