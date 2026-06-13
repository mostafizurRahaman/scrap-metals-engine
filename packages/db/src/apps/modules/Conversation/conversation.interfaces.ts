import { Document, Types } from 'mongoose'
import type { TConversationType, TOrderChatStatusType } from './conversation.constants'
import type { TAuthRole } from '../User'

export interface IConversation {
  type: TConversationType
}

export interface IOrderChat extends IConversation {
  order: Types.ObjectId
  status: TOrderChatStatusType
}

export interface ISupportChat extends IConversation {
  user: Types.ObjectId
  role: TAuthRole
}

export interface IConversationDoc extends Document, IConversation {}

// export interface IConversationModel extends Model<IConversationDoc> {
//   getById(id: string): Promise<IConversation | null>
// }
export interface IOrderChatDoc extends IConversationDoc, Omit<IOrderChat, 'type'> {}
export interface ISupportChatDoc extends IConversationDoc, Omit<ISupportChat, 'type'> {}
