import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
} from '@repo/shared'
import { conversationUserSortableFields } from '@repo/db'

const createConversationUserSchema = z.object({
  body: z.object({}),
})

const updateConversationUserSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllConversationUserSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(conversationUserSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getConversationUserByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteConversationUserByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const conversationUserValidations = {
  createConversationUserSchema,
  updateConversationUserSchema,
  getAllConversationUserSchema,
  getConversationUserByIdSchema,
  deleteConversationUserByIdSchema,
}

export type TCreateConversationUserPayloadType = z.infer<
  typeof createConversationUserSchema.shape.body
>
export type TUpdateConversationUserPayloadType = z.infer<
  typeof updateConversationUserSchema.shape.body
>
export type TGetAllConversationUserQueryParamsType = z.infer<
  typeof getAllConversationUserSchema.shape.query
>
export type TGetConversationUserByIdParamsType = z.infer<
  typeof getConversationUserByIdSchema.shape.params
>
export type TDeleteConversationUserByIdParamsType = z.infer<
  typeof deleteConversationUserByIdSchema.shape.params
>
