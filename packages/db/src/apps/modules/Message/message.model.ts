import { Schema, Types, model } from 'mongoose'
import type { IMessageDoc } from './message.interfaces'

const messageSchema = new Schema<IMessageDoc>(
  {
    conversation: {
      type: Types.ObjectId,
      requried: true,
      ref: 'Conversation',
    },
    text: {
      type: String,
      required: true,
    },
    attachments: {
      type: [String],
      required: true,
    },
    sender: {
      type: Types.ObjectId,
      requried: true,
      ref: 'User',
    },
  },

  {
    timestamps: true,
    versionKey: false,
  }
)

export const Message = model<IMessageDoc>('Message', messageSchema)
