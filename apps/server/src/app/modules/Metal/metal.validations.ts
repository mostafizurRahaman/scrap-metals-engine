import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { metalSortableFields } from "@repo/db"



const createMetalSchema = z.object({
  body: z.object({})
})

const updateMetalSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllMetalSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(metalSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getMetalByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteMetalByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const metalValidations = {
  createMetalSchema,
  updateMetalSchema,
  getAllMetalSchema,
  getMetalByIdSchema,
  deleteMetalByIdSchema
}

export type TCreateMetalPayloadType = z.infer<typeof createMetalSchema.shape.body>
export type TUpdateMetalPayloadType = z.infer<typeof updateMetalSchema.shape.body>
export type TGetAllMetalQueryParamsType = z.infer<typeof getAllMetalSchema.shape.query>
export type TGetMetalByIdParamsType = z.infer<typeof getMetalByIdSchema.shape.params>
export type TDeleteMetalByIdParamsType = z.infer<typeof deleteMetalByIdSchema.shape.params>