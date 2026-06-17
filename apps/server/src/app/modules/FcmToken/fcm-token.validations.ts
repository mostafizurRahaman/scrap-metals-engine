import { deviceTypeValues } from '@repo/db'
import { enumString, requiredString } from '@repo/shared'
import z from 'zod'

const updateFcmTokenSchema = z.object({
  body: z.object({
    token: requiredString('Token'),
    deviceType: enumString(deviceTypeValues, 'Device Type'),
  }),
})

export const fcmTokenValidations = {
  updateFcmTokenSchema,
}

export type TUpdateFcmTokenPayloadType = z.infer<typeof updateFcmTokenSchema.shape.body>
