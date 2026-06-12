import { Schema, model } from 'mongoose'
import type { IConversationDoc, IOrderChatDoc, ISupportChatDoc } from './conversation.interfaces'
import { conversationTypeValues, orderChatStatusValues } from './conversation.constants'

// Base Schema remains the same
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

// Use IOrderChatDoc here
const orderChatSchema = new Schema<IOrderChatDoc>(
  {
    order: {
      type: Schema.Types.ObjectId, // Recommended over Types.ObjectId inside schema definitions
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

// Use ISupportChatDoc here
const supportSchema = new Schema<ISupportChatDoc>(
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

// Create Base Model
export const Conversation = model<IConversationDoc>('Conversation', conversationSchema)

// Create Order Chat Model with strict Generic typing:
export const OrderChat = Conversation.discriminator<IOrderChatDoc>('OrderChat', orderChatSchema)

// Create Support Model with strict Generic typing:
export const SupportChat = Conversation.discriminator<ISupportChatDoc>('Support', supportSchema)
