import { Document, Types } from 'mongoose'
import { type TOrderStatusType } from '../Order/order.constants'

export interface IOrderHistory {
  order: Types.ObjectId
  status: TOrderStatusType
  previousStatus: TOrderStatusType
  title: string
  note: string
  changedBy: Types.ObjectId
}

export interface IOrderHistoryDoc extends Document, IOrderHistory {}

// export interface IOrderHistoryModel extends Model<IOrderHistoryDoc> {
//   getById(id: string): Promise<IOrderHistory | null>
// }
