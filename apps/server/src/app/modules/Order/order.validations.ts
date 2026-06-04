import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { orderSortableFields } from "@repo/db"



const createOrderSchema = z.object({
  body: z.object({})
})

const updateOrderSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllOrderSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(orderSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getOrderByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteOrderByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const orderValidations = {
  createOrderSchema,
  updateOrderSchema,
  getAllOrderSchema,
  getOrderByIdSchema,
  deleteOrderByIdSchema
}

export type TCreateOrderPayloadType = z.infer<typeof createOrderSchema.shape.body>
export type TUpdateOrderPayloadType = z.infer<typeof updateOrderSchema.shape.body>
export type TGetAllOrderQueryParamsType = z.infer<typeof getAllOrderSchema.shape.query>
export type TGetOrderByIdParamsType = z.infer<typeof getOrderByIdSchema.shape.params>
export type TDeleteOrderByIdParamsType = z.infer<typeof deleteOrderByIdSchema.shape.params>