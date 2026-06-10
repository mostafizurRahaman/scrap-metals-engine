import z from 'zod'
import { enumString, optionalString } from '@repo/shared'
import { contentTypeValues } from 'packages/db/src/apps/modules/Content/content.constant'

const updateContentSchema = z.object({
  body: z.object({
    type: enumString(contentTypeValues, 'Type'),
    content: optionalString('Content'),
  }),
})

const getContentByIdSchema = z.object({
  params: z.object({
    type: enumString(contentTypeValues, 'Type'),
  }),
})

export const contentValidations = {
  updateContentSchema,

  getContentByIdSchema,
}

export type TUpdateContentPayloadType = z.infer<typeof updateContentSchema.shape.body>
export type TGetContentByIdParamsType = z.infer<typeof getContentByIdSchema.shape.params>
