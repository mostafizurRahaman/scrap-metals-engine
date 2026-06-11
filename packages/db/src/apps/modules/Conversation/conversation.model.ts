import {  Schema, Types, model } from 'mongoose'
import type { IConversationDoc, IOrderChat, ISupportChat } from './conversation.interfaces'
import { conversationTypeValues, orderChatStatusValues } from './conversation.constants'

const conversationSchema = new Schema<IConversationDoc>(
  {
    type: {
      type: String,
      enum: conversationTypeValues,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    discriminatorKey: 'type',
  }
)

// Order chat schema
const orderChatSchema = new Schema<IOrderChat>(
  {
    order: {
      type: Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    status: {
      type: String,
      enum: orderChatStatusValues,
    },
  },
  {
    _id: false,
  }
)

// Order chat schema
const supportSchema = new Schema<ISupportChat>(
  {
    isSupportTicket: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
)

// Static method
// conversationSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Conversation = model<IConversationDoc>('Conversation', conversationSchema)

// Create Order Chat Model :
export const OrderChat = Conversation.discriminator('OrderChat', orderChatSchema)

// Create Support  Model :
export const SupportChat = Conversation.discriminator('Support', supportSchema)
