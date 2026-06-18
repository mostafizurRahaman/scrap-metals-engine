import { FcmToken, type IUser } from '@repo/db'

import type { TUpdateFcmTokenPayloadType } from './fcm-token.validations'
import type { DeleteResult, Types } from 'mongoose'

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
const getFcmTokensByUserId = async (userId: Types.ObjectId) => {
  const fcmTokens = await FcmToken.find({
    user: userId,
  })
    .select({
      _id: 0,
      token: 1,
    })
    .lean()

  const allTokens = fcmTokens.map((token) => token.token)

  return allTokens
}

// ?? Delete FCM Token by tokens:
const deleteFcmTokens = async (tokens: string[]): Promise<DeleteResult> => {
  const deletedTokens = await FcmToken.deleteMany({
    token: {
      $in: tokens,
    },
  })

  return deletedTokens
}

export const fcmTokenServices = {
  updateFcmToken,
  getFcmTokensByUserId,
  deleteFcmTokens,
}
