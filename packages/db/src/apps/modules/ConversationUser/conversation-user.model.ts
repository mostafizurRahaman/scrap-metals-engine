import { Schema, Types, model } from 'mongoose'
import type { IConversationUserDoc } from './conversation-user.interfaces'
import { AuthRolesValues } from '../User'

const conversationUserSchema = new Schema<IConversationUserDoc>(
  {
    conversation: {
      type: Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: AuthRolesValues,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    leftAt: {
      type: Date,
      required: true,
    },
    lastReadAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// conversationUserSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const ConversationUser = model<IConversationUserDoc>(
  'ConversationUser',
  conversationUserSchema
)
