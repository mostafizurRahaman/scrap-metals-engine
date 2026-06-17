import { Document, Types } from 'mongoose'
import type { TFcmTokenField } from './fcm-token.constants'

export interface IFcmToken {
  token: string
  user: Types.ObjectId
  deviceType: TFcmTokenField
}

export interface IFcmTokenDoc extends Document, IFcmToken {}

// export interface IFcmTokenModel extends Model<IFcmTokenDoc> {
//   getById(id: string): Promise<IFcmToken | null>
// }
