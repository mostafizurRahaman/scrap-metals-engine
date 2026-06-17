import { FcmToken, type IUser } from '@repo/db'

import type { TUpdateFcmTokenPayloadType } from './fcm-token.validations'

// ?? Update an user fcm token
const updateFcmToken = async (user: IUser, payload: TUpdateFcmTokenPayloadType) => {
  const { token, deviceType } = payload

  const newToken = await FcmToken.findOneAndUpdate(
    {
      token,
    },
    {
      $set: {
        token,
        user: user?._id,
        deviceType,
        updatedAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
    }
  )

  return newToken
}

// ?? Get an user all fcm token:
const getFcmTokensByUserId = async (userId: string) => {
  const fcmTokens = await FcmToken.find({
    user: userId,
  })
    .select({
      _id: 0,
      token: 1,
    })
    .lean()

  const allTokens = fcmTokens.filter((token) => token.token)

  return allTokens
}

export const fcmTokenServices = {
  updateFcmToken,
  getFcmTokensByUserId,
}
