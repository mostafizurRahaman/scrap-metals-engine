import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { orderHistorySortableFields } from "@repo/db"



const createOrderHistorySchema = z.object({
  body: z.object({})
})

const updateOrderHistorySchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllOrderHistorySchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(orderHistorySortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getOrderHistoryByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteOrderHistoryByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const orderHistoryValidations = {
  createOrderHistorySchema,
  updateOrderHistorySchema,
  getAllOrderHistorySchema,
  getOrderHistoryByIdSchema,
  deleteOrderHistoryByIdSchema
}

export type TCreateOrderHistoryPayloadType = z.infer<typeof createOrderHistorySchema.shape.body>
export type TUpdateOrderHistoryPayloadType = z.infer<typeof updateOrderHistorySchema.shape.body>
export type TGetAllOrderHistoryQueryParamsType = z.infer<typeof getAllOrderHistorySchema.shape.query>
export type TGetOrderHistoryByIdParamsType = z.infer<typeof getOrderHistoryByIdSchema.shape.params>
export type TDeleteOrderHistoryByIdParamsType = z.infer<typeof deleteOrderHistoryByIdSchema.shape.params>