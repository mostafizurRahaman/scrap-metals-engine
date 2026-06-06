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
  requiredMongooseId,
  positiveNumber,
  requiredNumber,
} from '@repo/shared'
import { DeliveryMethod, deliveryMethodValues, orderSortableFields } from '@repo/db'

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
      deliveryType: enumString(deliveryMethodValues, 'Delivery type'),
      preferredDate: requiredDate('Preferred Date'),
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
    } else {
      data.body.pickupAddress = undefined
      data.body.lattitude = undefined
      data.body.longitude = undefined
    }
  })

const metalItemSchema = z.object({
  metal: requiredMongooseId('Metal ID'),
  price: positiveNumber('Price').gte(0, {
    error: 'Price should be greater than 0',
  }),
  quantity: positiveNumber('Quantity').gte(0, {
    error: 'Quantity should be greater than 0.',
  }),
})

const createMetalOrder = z.object({
  body: z
    .object({
      items: z
        .array(metalItemSchema, {
          error: 'Metal item is required',
        })
        .min(1, {
          error: 'Minimum one metal item required!',
        }),
      preferredDate: requiredDate('Preferred Date'),
      additionalNotes: optionalString('Additional notes'),
    })
    .superRefine((data, ctx) => {
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const uniqueIds: Set<string> = new Set()

        // add all  items into set:
        data.items.forEach((item) => uniqueIds.add(item.metal))

        // Check set size and items length is equal  or not ?:

        if (uniqueIds.size !== data.items.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['items'],
            message: 'Duplicate metal items not allowed!',
          })
        }
      }
    }),
})

const vehicleOrderQouteRequest = z.object({
  params: z.object({
    id: requiredMongooseId('ID'),
  }),
  body: z.object({
    model: requiredString('Name'),
    year: z.coerce
      .number({
        error: `Year is required`,
      })
      .int({
        message: `Year must be a whole number`,
      })
      .min(1900, {
        message: `Year must be 1900 or later`,
      })
      .max(new Date().getFullYear(), {
        message: `Year cannot be in the future`,
      }),
    weightLbs: z
      .number()
      .min(0, {
        message: 'Weight must be greater than or equal to 0',
      })
      .optional(),

    aluminumWeightLbs: z
      .number()
      .min(0, {
        message: 'Aluminum weight must be greater than or equal to 0',
      })
      .optional(),

    wheelWeightLbs: z
      .number()
      .min(0, {
        message: 'Wheel weight must be greater than or equal to 0',
      })
      .optional(),

    batteryWeightLbs: z
      .number()
      .min(0, {
        message: 'Battery weight must be greater than or equal to 0',
      })
      .optional(),

    breakageWeightLbs: z
      .number()
      .min(0, {
        message: 'Breakage weight must be greater than or equal to 0',
      })
      .optional(),

    pickupPrice: requiredNumber('Pickup price').min(0, 'Pickup price should be min 0.'),
    qoutedPrice: requiredNumber('Qouted price').min(0, 'Qouted price should be min 0'),
  }),
})

const metalOrderQouteRequest = z.object({
  params: z.object({
    id: requiredMongooseId('ID'),
  }),
  body: z
    .object({
      qoutedPrice: optionalNumber('Qouted price'),
      isCustom: z.boolean({
        error: 'Is custom price is required',
      }),
    })
    .superRefine((data, ctx) => {
      if (data.isCustom && !data.qoutedPrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['qoutedPrice'],
          message: 'Qouted price is required',
        })
      }

      if (data.isCustom === false && data.qoutedPrice !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['qoutedPrice'],
          message: 'Qouted price not needed!',
        })
      }

      if (data.isCustom && data?.qoutedPrice && data?.qoutedPrice < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['qoutedPrice'],
          message: 'Qouted price should be minimum 0',
        })
      }
    }),
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
  createMetalOrder,
  updateOrderSchema,
  getAllOrderSchema,
  getOrderByIdSchema,
  deleteOrderByIdSchema,

  // Qoute Request:
  vehicleOrderQouteRequest,
  metalOrderQouteRequest,
}

export type TCreateVihecleOrderPayloadType = z.infer<typeof createVihecleOrderSchema.shape.body>

export type TCreateMetalOrderPayloadType = z.infer<typeof createMetalOrder.shape.body>

export type TUpdateOrderPayloadType = z.infer<typeof updateOrderSchema.shape.body>
export type TGetAllOrderQueryParamsType = z.infer<typeof getAllOrderSchema.shape.query>
export type TGetOrderByIdParamsType = z.infer<typeof getOrderByIdSchema.shape.params>
export type TDeleteOrderByIdParamsType = z.infer<typeof deleteOrderByIdSchema.shape.params>

export type TVehicleQouteRequestPayloadType = z.infer<typeof vehicleOrderQouteRequest.shape.body>

export type TMetalQouteRequestPayloadType = z.infer<typeof metalOrderQouteRequest.shape.body>
