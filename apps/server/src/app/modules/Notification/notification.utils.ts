import { User, type INotification } from '@repo/db'
import { fcmTokenServices } from '../FcmToken/fcm-token.services'
import { firebaseAdmin } from '@app/configs/firebase'
import type { BatchResponse } from 'firebase-admin/messaging'

const sendPushNotificaiton = async (notification: INotification) => {
  const { receiver, sender, title, message, meta } = notification

  // ?? Get fmc tokens for receiver:
  const receiverFcmTokens = await fcmTokenServices.getFcmTokensByUserId(receiver)

  // ?? Retrived sender:
  const senderUser = await User.findById(sender)

  if (receiverFcmTokens.length) return

  const notificationResponse = await firebaseAdmin.messaging().sendEachForMulticast({
    tokens: receiverFcmTokens,
    notification: {
      title: title,
      body: message,
      imageUrl: senderUser?.profileImage || '',
    },
    data: meta as Record<string, string>,
  })

  // ?? Clean up token which are not valid :
  await removeInvalidTokens(notificationResponse, receiverFcmTokens)
}

// ** For clean up invaid token:
const removeInvalidTokens = async (response: BatchResponse, tokens: string[]) => {
  const invalidTokens: string[] = []

  // ?? Filter out invalid tokens
  response.responses.forEach((res, index) => {
    if (!res.success) {
      if (
        res.error?.code === 'messaging/registration-token-not-registered' ||
        res.error?.code === 'messaging/invalid-registration-token'
      ) {
        const token = tokens[index] as string
        invalidTokens.push(token)
      }
    }
  })

  // ?? Delete all invalid token:
  if (invalidTokens.length > 0) {
    await fcmTokenServices.deleteFcmTokens(invalidTokens)
  }
}

export const notificationUtils = {
  sendPushNotificaiton,
}
