import { Document, Types } from 'mongoose'
import type { TNotificationType } from './notification.constants'

export interface INotification {
  receiver: Types.ObjectId
  sender: Types.ObjectId
  title: string
  message: string
  notificationType: TNotificationType
  meta: Record<string, unknown>
}

export interface INotificationDoc extends Document, INotification {}

// export interface INotificationModel extends Model<INotificationDoc> {
//   getById(id: string): Promise<INotification | null>
// }
