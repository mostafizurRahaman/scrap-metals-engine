import { Document, Types } from 'mongoose'
import type { TAuthRole } from '../User'

export interface IConversationUser {
  conversation: Types.ObjectId
  user: Types.ObjectId
  role: TAuthRole
  joinedAt: Date
  leftAt: Date
  lastReadAt: Date
}

export interface IConversationUserDoc extends Document, IConversationUser {}

// export interface IConversationUserModel extends Model<IConversationUserDoc> {
//   getById(id: string): Promise<IConversationUser | null>
// }
