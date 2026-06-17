import type { INotification } from '@repo/db'
import { fcmTokenServices } from '../FcmToken/fcm-token.services'
import { firebaseAdmin } from '@app/configs/firebase'

const sendPushNotificaiton = async (notification: INotification) => {
  const { receiver, sender, title, message, meta } = notification

  // ?? Get fmc tokens for receiver:
  const receiverFcmTokens = await fcmTokenServices.getFcmTokensByUserId(receiver)

  if (receiverFcmTokens.length) return

  const notificationResponse  = await firebaseAdmin.


}
