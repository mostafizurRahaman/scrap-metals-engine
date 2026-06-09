import z from 'zod'
import { requiredString } from '@repo/shared'

const getOrderHistoryByIdSchema = z.object({
  params: z.object({
    id: requiredString('Order ID'),
  }),
})

export const orderHistoryValidations = {
  getOrderHistoryByIdSchema,
}

export type TGetOrderHistoryByIdParamsType = z.infer<typeof getOrderHistoryByIdSchema.shape.params>
