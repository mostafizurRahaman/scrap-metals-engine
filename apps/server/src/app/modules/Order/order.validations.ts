import z from 'zod'
import { latitude, longitude, coordinates } from 'check-geographic-coordinates'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  enumString,
  requiredDate,
  positiveNumber,
} from '@repo/shared'
import {
  DeliveryMethod,
  deliveryMethodValues,
  orderSortableFields,
  OrderType,
  orderTypeValues,
} from '@repo/db'

const createVihecleOrderSchema = z
  .object({
    body: z.object({
      // Vehilcle order related fields:
      vinNumber: requiredString('Vin number')
        .trim()
        .toUpperCase()
        .regex(
          /^[A-HJ-NPR-Z0-9]{17}$/,
          'VIN must be exactly 17 characters and cannot contain I, O, or Q'
        ),

      // Order model sepecific field:
      orderType: enumString(orderTypeValues, 'Order type').default(OrderType.VEHICLE),
      deliveryType: enumString(deliveryMethodValues, 'Delivery type'),
      preferredDate: requiredDate('Preferred Date'),
      subTotal: positiveNumber('Sub total'),
      pickupAddress: optionalString('Pickup address'),
      lattitude: optionalNumber('Lattitude'),
      longitude: optionalNumber('Longitude'),
      additionalNotes: optionalString('Additional notes'),
    }),
  })
  .superRefine((data, ctx) => {
    // ? 1. Check for delivery type:
    if (data.body.deliveryType === DeliveryMethod.PICKUP) {
      if (!data.body.pickupAddress) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', 'pickupAddress'],
          message: 'Pickup address is required.',
        })
        return
      }
      if (!data.body.lattitude) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', 'lattitude'],
          message: 'Lattitude is required.',
        })
        return
      }
      if (!data.body.longitude) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', 'longitude'],
          message: 'Longitude is required.',
        })
        return
      }

      if (!latitude(data.body.lattitude)) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', 'lattitude'],
          message: 'Provide a valid lattidue.',
        })
        return
      }

      if (!longitude(data.body.longitude)) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', 'longitude'],
          message: 'Provide a valid longitude.',
        })
        return
      }

      if (!coordinates(data.body.longitude, data.body.lattitude)) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', 'longitude'],
          message: 'Provide a valid longitude.',
        })
        return
      }
    }
  })

const updateOrderSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllOrderSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(orderSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getOrderByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteOrderByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const orderValidations = {
  createVihecleOrderSchema,
  updateOrderSchema,
  getAllOrderSchema,
  getOrderByIdSchema,
  deleteOrderByIdSchema,
}

export type TCreateVihecleOrderPayloadType = z.infer<typeof createVihecleOrderSchema.shape.body>

export type TUpdateOrderPayloadType = z.infer<typeof updateOrderSchema.shape.body>
export type TGetAllOrderQueryParamsType = z.infer<typeof getAllOrderSchema.shape.query>
export type TGetOrderByIdParamsType = z.infer<typeof getOrderByIdSchema.shape.params>
export type TDeleteOrderByIdParamsType = z.infer<typeof deleteOrderByIdSchema.shape.params>
