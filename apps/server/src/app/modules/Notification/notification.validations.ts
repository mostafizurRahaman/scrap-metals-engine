import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
} from '@repo/shared'
import { notificationSortableFields } from '@repo/db'

const createNotificationSchema = z.object({
  body: z.object({}),
})

const updateNotificationSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllNotificationSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(notificationSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getNotificationByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteNotificationByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const notificationValidations = {
  createNotificationSchema,
  updateNotificationSchema,
  getAllNotificationSchema,
  getNotificationByIdSchema,
  deleteNotificationByIdSchema,
}

export type TCreateNotificationPayloadType = z.infer<typeof createNotificationSchema.shape.body>
export type TUpdateNotificationPayloadType = z.infer<typeof updateNotificationSchema.shape.body>
export type TGetAllNotificationQueryParamsType = z.infer<
  typeof getAllNotificationSchema.shape.query
>
export type TGetNotificationByIdParamsType = z.infer<typeof getNotificationByIdSchema.shape.params>
export type TDeleteNotificationByIdParamsType = z.infer<
  typeof deleteNotificationByIdSchema.shape.params
>
