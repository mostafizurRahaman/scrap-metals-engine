import { Document, Types } from 'mongoose'

export interface IMessage {
  conversation: Types.ObjectId
  text: string
  attachments: string[]
  sender: Types.ObjectId
}

export interface IMessageDoc extends Document, IMessage {}

// export interface IMessageModel extends Model<IMessageDoc> {
//   getById(id: string): Promise<IMessage | null>
// }
