import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  sortOrder,
  positiveNumber,
  optionalPositive,
} from '@repo/shared'
import { metalSortableFields } from '@repo/db'

const createMetalSchema = z.object({
  body: z.object({
    name: requiredString('Name').min(3, {
      error: 'Minimum length should be 3 character',
    }),
    pricePerKg: positiveNumber('Price Per KG').min(1, {
      error: 'Min price per kg should be greater 0',
    }),
    pricePerUnit: positiveNumber('Price Per Unit').min(1, {
      error: 'Min price per UNIT should be greater 0',
    }),
  }),
})

const updateMetalSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),

  body: z
    .object({
      name: optionalString('Name'),
      pricePerKg: optionalPositive('Price Per Kg'),
      pricePerUnit: optionalPositive('Price Per Unit'),
    })
    .superRefine((data, ctx) => {
      if (data?.name && data.name?.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['name'],
          message: 'Min 3 characters required!',
        })
      }

      if (data?.pricePerKg && data.pricePerKg < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pricePerKg'],
          message: 'Min price per kg should be greater 0',
        })
      }

      if (data?.pricePerUnit && data.pricePerUnit < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pricePerKg'],
          message: 'Min price per UNIT should be greater 0',
        })
      }
    }),
})

const getAllMetalSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(metalSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getMetalByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteMetalByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const metalValidations = {
  createMetalSchema,
  updateMetalSchema,
  getAllMetalSchema,
  getMetalByIdSchema,
  deleteMetalByIdSchema,
}

export type TCreateMetalPayloadType = z.infer<typeof createMetalSchema.shape.body>
export type TUpdateMetalPayloadType = z.infer<typeof updateMetalSchema.shape.body>
export type TGetAllMetalQueryParamsType = z.infer<typeof getAllMetalSchema.shape.query>
export type TGetMetalByIdParamsType = z.infer<typeof getMetalByIdSchema.shape.params>
export type TDeleteMetalByIdParamsType = z.infer<typeof deleteMetalByIdSchema.shape.params>
