import { Schema, model } from 'mongoose'
import type { INotificationDoc } from './notification.interfaces'
import { notificationTypeValues } from './notification.constants'

const notificationSchema = new Schema<INotificationDoc>(
  {
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    notificationType: {
      type: String,
      enum: notificationTypeValues,
    },
    meta: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// notificationSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Notification = model<INotificationDoc>('Notification', notificationSchema)
