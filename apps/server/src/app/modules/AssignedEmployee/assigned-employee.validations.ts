import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'
import { assignedEmployeeSortableFields, employeeAssignStatusValues } from '@repo/db'

const createAssignedEmployeeSchema = z.object({
  body: z.object({
    order: requiredMongooseId('Order ID'),
    employee: requiredMongooseId('Employee ID'),
  }),
})

const cancelAssignedEmployeeById = z.object({
  params: z.object({
    id: requiredMongooseId('Assigned ID'),
  }),
  body: z.object({
    reason: optionalString('Reason'),
  }),
})

const acceptAssignmentSchema = z.object({
  params: z.object({
    id: requiredMongooseId('Assignment ID'),
  }),
})

const getAllAssignedEmployeeSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(assignedEmployeeSortableFields, 'Sort by'),
    status: optionalEnumString(employeeAssignStatusValues, 'Assignment status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getAssignedEmployeeByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const assignedEmployeeValidations = {
  createAssignedEmployeeSchema,
  cancelAssignedEmployeeById,
  getAllAssignedEmployeeSchema,
  getAssignedEmployeeByIdSchema,
  acceptAssignmentSchema,
}

export type TCreateAssignedEmployeePayloadType = z.infer<
  typeof createAssignedEmployeeSchema.shape.body
>

export type TGetAllAssignedEmployeeQueryParamsType = z.infer<
  typeof getAllAssignedEmployeeSchema.shape.query
>
export type TGetAssignedEmployeeByIdParamsType = z.infer<
  typeof getAssignedEmployeeByIdSchema.shape.params
>

export type TCancelAssignedEmployeeByIdPayload = z.infer<
  typeof cancelAssignedEmployeeById.shape.body
>
